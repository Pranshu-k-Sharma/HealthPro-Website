const express = require("express");
const Appointment = require("../models/Appointment");
const ReminderDeliveryLog = require("../models/ReminderDeliveryLog");
const SlotHold = require("../models/SlotHold");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { getAppointmentReminderJobStatus } = require("../services/appointmentReminderService");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();
const APPOINTMENT_FEE_INR = 500;
const APPOINTMENT_FEE_PAISE = APPOINTMENT_FEE_INR * 100;
const PATIENT_RESCHEDULE_CUTOFF_HOURS = 12;
const DEFAULT_WORK_START = "09:00";
const DEFAULT_WORK_END = "17:30";
const DEFAULT_SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_BUFFER_MINUTES = 0;
const DEFAULT_WORKING_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const ALLOWED_SLOT_INTERVALS = new Set([15, 20, 30, 60]);
const ALLOWED_BUFFER_MINUTES = new Set([0, 5, 10, 15, 20, 30]);
const SLOT_HOLD_TTL_MS = 3 * 60 * 1000;
const SLOT_HOLD_MATCH_TOLERANCE_MS = 60 * 1000;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

const verifyRazorpaySignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === signature;
};

const normalizePaymentReference = (value) => String(value || "").trim().toUpperCase();

const pad2 = (num) => String(num).padStart(2, "0");
const isValidTimeString = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());
const timeStringToMinutes = (timeString) => {
  const [hourText, minuteText] = String(timeString).split(":");
  return Number(hourText) * 60 + Number(minuteText);
};

const normalizeDoctorSchedule = (doctor) => {
  const startRaw = doctor?.workingHours?.start;
  const endRaw = doctor?.workingHours?.end;
  const start = isValidTimeString(startRaw) ? startRaw : DEFAULT_WORK_START;
  const end = isValidTimeString(endRaw) ? endRaw : DEFAULT_WORK_END;

  const intervalRaw = Number(doctor?.slotIntervalMinutes);
  const interval = ALLOWED_SLOT_INTERVALS.has(intervalRaw)
    ? intervalRaw
    : DEFAULT_SLOT_INTERVAL_MINUTES;
  const bufferRaw = Number(doctor?.bufferMinutes);
  const buffer = ALLOWED_BUFFER_MINUTES.has(bufferRaw)
    ? bufferRaw
    : DEFAULT_BUFFER_MINUTES;

  const normalizedWorkingDays = Array.from(
    new Set(
      (Array.isArray(doctor?.workingDays) ? doctor.workingDays : DEFAULT_WORKING_DAYS)
        .map((day) => String(day || "").trim().toLowerCase())
        .filter((day) => WEEKDAY_KEYS.includes(day))
    )
  );

  const workingDays = normalizedWorkingDays.length ? normalizedWorkingDays : DEFAULT_WORKING_DAYS;

  const unavailableDateSet = new Set(
    (Array.isArray(doctor?.unavailableDates) ? doctor.unavailableDates : [])
      .map((value) => String(value || "").trim())
      .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
  );

  if (timeStringToMinutes(end) <= timeStringToMinutes(start)) {
    return {
      start: DEFAULT_WORK_START,
      end: DEFAULT_WORK_END,
      interval: DEFAULT_SLOT_INTERVAL_MINUTES,
      buffer: DEFAULT_BUFFER_MINUTES,
      workingDays,
      unavailableDateSet,
    };
  }

  return { start, end, interval, buffer, workingDays, unavailableDateSet };
};

const buildDailySlots = (schedule) => {
  const startMinutes = timeStringToMinutes(schedule.start);
  const endMinutes = timeStringToMinutes(schedule.end);
  const stepMinutes = schedule.interval + schedule.buffer;
  const slots = [];

  for (let current = startMinutes; current <= endMinutes; current += stepMinutes) {
    const hour = Math.floor(current / 60);
    const minute = current % 60;
    slots.push(`${pad2(hour)}:${pad2(minute)}`);
  }

  return slots;
};

const isSlotBlockedByAppointments = (candidateDate, appointments, minGapMs) =>
  appointments.some((appointment) => {
    if (!isAppointmentActive(appointment.status)) return false;
    const existingDate = new Date(appointment.appointmentDate);
    return Math.abs(candidateDate.getTime() - existingDate.getTime()) < minGapMs;
  });

const isSlotBlockedByHolds = (candidateDate, holds, minGapMs, excludedPatientId = null) =>
  holds.some((hold) => {
    if (excludedPatientId && String(hold.patient) === String(excludedPatientId)) {
      return false;
    }
    const holdDate = new Date(hold.slotDate);
    return Math.abs(candidateDate.getTime() - holdDate.getTime()) < minGapMs;
  });

const getSlotFromDate = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const isAppointmentActive = (status) => !["cancelled", "rejected"].includes(status);
const getDateKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const getWeekdayKey = (date) => WEEKDAY_KEYS[date.getDay()];

const getDoctorOffReason = (schedule, date) => {
  const dateKey = getDateKey(date);
  const weekdayKey = getWeekdayKey(date);

  if (!schedule.workingDays.includes(weekdayKey)) {
    return "Doctor is not available on the selected weekday";
  }

  if (schedule.unavailableDateSet.has(dateKey)) {
    return "Doctor is unavailable on the selected date";
  }

  return null;
};

const getDayBounds = (dateString) => {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(`${dateString}T23:59:59.999`);
  return { start, end };
};

const hoursUntil = (date) => {
  const diffMs = date.getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
};

const getReminderWindowBounds = (offsetHours) => {
  const halfWindowMs = 5 * 60 * 1000;
  const center = Date.now() + offsetHours * 60 * 60 * 1000;
  return {
    start: new Date(center - halfWindowMs),
    end: new Date(center + halfWindowMs),
  };
};

// ================================
// GET DOCTOR SLOT AVAILABILITY
// ================================
router.get("/availability", authMiddleware, async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ message: "doctorId and date are required" });
    }

    const { start, end } = getDayBounds(String(date));

    const doctor = await User.findOne({ _id: doctorId, role: "doctor" }).select(
      "workingHours slotIntervalMinutes bufferMinutes workingDays unavailableDates"
    );
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const schedule = normalizeDoctorSchedule(doctor);
    const doctorOffReason = getDoctorOffReason(schedule, start);
    if (doctorOffReason) {
      return res.json({
        doctorId,
        date,
        slots: [],
        bookedSlots: [],
        availableSlots: [],
        workingHours: {
          start: schedule.start,
          end: schedule.end,
        },
        slotIntervalMinutes: schedule.interval,
        workingDays: schedule.workingDays,
        isDoctorOff: true,
        message: doctorOffReason,
      });
    }

    const dailySlots = buildDailySlots(schedule);
    const minGapMs = (schedule.interval + schedule.buffer) * 60 * 1000;

    const appointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: start, $lte: end },
      status: { $ne: "cancelled" },
    }).select("appointmentDate status");

    const activeHolds = await SlotHold.find({
      doctor: doctorId,
      slotDate: { $gte: start, $lte: end },
      expiresAt: { $gt: new Date() },
    }).select("slotDate patient");

    const bookedSlots = new Set();
    const heldSlots = new Set();
    const availableSlots = dailySlots.filter((slotValue) => {
      const slotDate = new Date(`${date}T${slotValue}:00`);
      const blockedByAppointment = isSlotBlockedByAppointments(slotDate, appointments, minGapMs);
      const blockedByHold = isSlotBlockedByHolds(slotDate, activeHolds, minGapMs, req.user.id);
      if (blockedByAppointment) bookedSlots.add(slotValue);
      if (blockedByHold) heldSlots.add(slotValue);
      return !blockedByAppointment && !blockedByHold;
    });

    res.json({
      doctorId,
      date,
      slots: dailySlots,
      bookedSlots: Array.from(bookedSlots),
      heldSlots: Array.from(heldSlots),
      availableSlots,
      workingHours: {
        start: schedule.start,
        end: schedule.end,
      },
      slotIntervalMinutes: schedule.interval,
      bufferMinutes: schedule.buffer,
      workingDays: schedule.workingDays,
      isDoctorOff: false,
    });
  } catch (error) {
    console.error("Availability fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================================
// PATIENT: CREATE SLOT HOLD
// ================================
router.post("/holds", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can hold appointment slots" });
    }

    const { doctor, appointmentDate } = req.body;
    if (!doctor || !appointmentDate) {
      return res.status(400).json({ message: "doctor and appointmentDate are required" });
    }

    const parsedAppointmentDate = new Date(appointmentDate);
    if (Number.isNaN(parsedAppointmentDate.getTime())) {
      return res.status(400).json({ message: "Invalid appointment date" });
    }

    if (parsedAppointmentDate <= new Date()) {
      return res.status(400).json({ message: "Appointment slot must be in the future" });
    }

    const doctorProfile = await User.findOne({ _id: doctor, role: "doctor" }).select(
      "workingHours slotIntervalMinutes bufferMinutes workingDays unavailableDates"
    );
    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const schedule = normalizeDoctorSchedule(doctorProfile);
    const minGapMs = (schedule.interval + schedule.buffer) * 60 * 1000;
    const doctorOffReason = getDoctorOffReason(schedule, parsedAppointmentDate);
    if (doctorOffReason) {
      return res.status(400).json({ message: doctorOffReason });
    }

    const slot = getSlotFromDate(parsedAppointmentDate);
    const slots = buildDailySlots(schedule);
    if (!slots.includes(slot)) {
      return res.status(400).json({
        message: `Select a valid appointment slot between ${schedule.start} and ${schedule.end} in ${schedule.interval}-minute intervals`,
      });
    }

    const { start: dayStart, end: dayEnd } = getDayBounds(parsedAppointmentDate.toISOString().slice(0, 10));
    const [dayAppointments, dayHolds] = await Promise.all([
      Appointment.find({
        doctor,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ["cancelled", "rejected"] },
      }).select("_id status appointmentDate"),
      SlotHold.find({
        doctor,
        slotDate: { $gte: dayStart, $lte: dayEnd },
        expiresAt: { $gt: new Date() },
      }).select("_id slotDate patient"),
    ]);

    if (isSlotBlockedByAppointments(parsedAppointmentDate, dayAppointments, minGapMs)) {
      return res.status(409).json({ message: "This slot conflicts with another appointment or required buffer time." });
    }

    if (isSlotBlockedByHolds(parsedAppointmentDate, dayHolds, minGapMs, req.user.id)) {
      return res.status(409).json({ message: "This slot is currently being reserved by another patient." });
    }

    await SlotHold.deleteMany({ patient: req.user.id, expiresAt: { $gt: new Date() } });

    const expiresAt = new Date(Date.now() + SLOT_HOLD_TTL_MS);
    let hold;
    try {
      hold = await SlotHold.create({
        patient: req.user.id,
        doctor,
        slotDate: parsedAppointmentDate,
        expiresAt,
      });
    } catch (createError) {
      if (createError?.code === 11000) {
        return res.status(409).json({ message: "This slot was just reserved. Please choose another slot." });
      }
      throw createError;
    }

    return res.status(201).json({
      message: "Slot reserved temporarily",
      holdId: hold._id,
      expiresAt,
    });
  } catch (error) {
    console.error("Slot hold error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================================
// PATIENT: RELEASE SLOT HOLD
// ================================
router.delete("/holds/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can release slot holds" });
    }

    await SlotHold.deleteOne({
      _id: req.params.id,
      patient: req.user.id,
    });

    return res.json({ message: "Slot hold released" });
  } catch (error) {
    console.error("Slot hold release error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// ================================
// GET PATIENT DASHBOARD STATS
// ================================
router.get("/stats/patient", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Access denied" });
    }

    const patientId = req.user.id;
    const now = new Date();

    // Get all appointments for this patient
    const allAppointments = await Appointment.find({ patient: patientId }).populate("doctor", "name specialization");

    // Filter appointments by status
    const upcomingAppointments = allAppointments.filter(
      (apt) => new Date(apt.appointmentDate) > now && apt.status !== "cancelled"
    );
    const completedAppointments = allAppointments.filter((apt) => apt.status === "completed");
    const cancelledAppointments = allAppointments.filter((apt) => apt.status === "cancelled");

    res.json({
      totalAppointments: allAppointments.length,
      upcomingCount: upcomingAppointments.length,
      completedCount: completedAppointments.length,
      cancelledCount: cancelledAppointments.length,
      upcomingAppointments: upcomingAppointments.slice(0, 5),
      completedAppointments: completedAppointments.slice(0, 5),
    });
  } catch (error) {
    console.error("Patient stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================================
// GET DOCTOR DASHBOARD STATS
// ================================
router.get("/stats/doctor", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const doctorId = req.user.id;
    const now = new Date();

    // Get all appointments for this doctor
    const allAppointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email phone");

    // Filter appointments by status
    const upcomingAppointments = allAppointments.filter(
      (apt) => new Date(apt.appointmentDate) > now && apt.status !== "cancelled"
    );
    const completedAppointments = allAppointments.filter((apt) => apt.status === "completed");
    const pendingAppointments = allAppointments.filter((apt) => apt.status === "pending");

    // Get unique patients seen
    const uniquePatients = new Set(allAppointments.map((apt) => apt.patient._id.toString()));

    res.json({
      totalAppointments: allAppointments.length,
      totalPatients: uniquePatients.size,
      upcomingCount: upcomingAppointments.length,
      completedCount: completedAppointments.length,
      pendingCount: pendingAppointments.length,
      upcomingAppointments: upcomingAppointments.slice(0, 5),
      recentCompletedAppointments: completedAppointments.slice(0, 5),
    });
  } catch (error) {
    console.error("Doctor stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================================
// CREATE APPOINTMENT (Patient)
// ================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can book appointments" });
    }

    const {
      doctor,
      appointmentDate,
      holdId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      paymentReference,
      paymentProofUrl,
    } = req.body;

    if (!doctor || !appointmentDate) {
      return res.status(400).json({
        message: "Doctor and appointment date are required",
      });
    }

    const parsedAppointmentDate = new Date(appointmentDate);
    if (Number.isNaN(parsedAppointmentDate.getTime())) {
      return res.status(400).json({ message: "Invalid appointment date" });
    }

    if (parsedAppointmentDate <= new Date()) {
      return res.status(400).json({ message: "Appointment must be scheduled in the future" });
    }

    const doctorProfile = await User.findOne({ _id: doctor, role: "doctor" }).select(
      "workingHours slotIntervalMinutes bufferMinutes workingDays unavailableDates"
    );
    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const doctorSchedule = normalizeDoctorSchedule(doctorProfile);
    const minGapMs = (doctorSchedule.interval + doctorSchedule.buffer) * 60 * 1000;
    const doctorOffReason = getDoctorOffReason(doctorSchedule, parsedAppointmentDate);
    if (doctorOffReason) {
      return res.status(400).json({ message: doctorOffReason });
    }

    const doctorSlots = buildDailySlots(doctorSchedule);

    const slot = getSlotFromDate(parsedAppointmentDate);
    if (!doctorSlots.includes(slot)) {
      return res.status(400).json({
        message: `Select a valid appointment slot between ${doctorSchedule.start} and ${doctorSchedule.end} in ${doctorSchedule.interval}-minute intervals`,
      });
    }

    const { start: dayStart, end: dayEnd } = getDayBounds(parsedAppointmentDate.toISOString().slice(0, 10));
    const dayAppointments = await Appointment.find({
      doctor,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["cancelled", "rejected"] },
    }).select("_id status appointmentDate");

    if (isSlotBlockedByAppointments(parsedAppointmentDate, dayAppointments, minGapMs)) {
      return res.status(409).json({
        message: "This slot conflicts with another appointment or required buffer time.",
      });
    }

    if (!holdId) {
      return res.status(409).json({ message: "Please reselect slot to reserve it before booking." });
    }

    const slotHold = await SlotHold.findOne({
      _id: holdId,
      patient: req.user.id,
      doctor,
      expiresAt: { $gt: new Date() },
    }).select("_id slotDate");

    if (!slotHold) {
      return res.status(409).json({ message: "Slot reservation expired. Please select the slot again." });
    }

    const holdDate = new Date(slotHold.slotDate);
    if (Math.abs(parsedAppointmentDate.getTime() - holdDate.getTime()) > SLOT_HOLD_MATCH_TOLERANCE_MS) {
      return res.status(409).json({ message: "Slot reservation does not match selected time. Please reselect slot." });
    }

    const isGatewayFlow = Boolean(razorpay_payment_id && razorpay_order_id && razorpay_signature);

    if (!isGatewayFlow) {
      const normalizedReference = normalizePaymentReference(paymentReference);
      if (!normalizedReference) {
        return res.status(400).json({
          message: "Payment reference is required when Razorpay is not used",
        });
      }

      const alreadyUsedReference = await Appointment.findOne({
        paymentReference: normalizedReference,
      }).select("_id");

      if (alreadyUsedReference) {
        return res.status(409).json({
          message: "This payment reference has already been used for an appointment",
        });
      }

      const appointment = new Appointment({
        patient: req.user.id,
        doctor,
        appointmentDate: parsedAppointmentDate,
        status: "pending",
        notes: `Manual UPI payment submitted for INR ${APPOINTMENT_FEE_INR}. Awaiting verification.`,
        paymentStatus: "pending_verification",
        paymentMethod: "manual_upi",
        paymentAmount: APPOINTMENT_FEE_INR,
        paymentCurrency: "INR",
        paymentId: `manual_${normalizedReference}`,
        paymentReference: normalizedReference,
        paymentProofUrl: String(paymentProofUrl || "").trim() || null,
      });

      await appointment.save();
      await SlotHold.deleteOne({ _id: slotHold._id });

      const populatedAppointment = await Appointment.findById(appointment._id)
        .populate("doctor", "name email")
        .populate("patient", "name email");

      return res.status(201).json({
        message: "Payment submitted. Appointment will be confirmed after verification.",
        appointment: populatedAppointment,
      });
    }

    // Ensure one successful payment is consumed only once for booking.
    const alreadyUsed = await Appointment.findOne({ paymentId: razorpay_payment_id }).select("_id");
    if (alreadyUsed) {
      return res.status(409).json({
        message: "This payment has already been used for an appointment",
      });
    }

    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isAuthentic = verifyRazorpaySignature(
      signaturePayload,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isAuthentic) {
      return res.status(400).json({ message: "Payment signature verification failed" });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!payment || payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: "Invalid payment/order mapping" });
    }

    if (!["captured", "authorized"].includes(payment.status)) {
      return res.status(400).json({ message: "Payment is not successful" });
    }

    if (payment.amount !== APPOINTMENT_FEE_PAISE) {
      return res.status(400).json({
        message: `Invalid payment amount. Expected INR ${APPOINTMENT_FEE_INR}`,
      });
    }

    const paymentDoctorId = payment.notes?.doctorId ? String(payment.notes.doctorId) : null;
    if (paymentDoctorId && paymentDoctorId !== String(doctor)) {
      return res.status(400).json({ message: "Payment was not made for the selected doctor" });
    }

    const appointment = new Appointment({
      patient: req.user.id,
      doctor,
      appointmentDate: parsedAppointmentDate,
      status: "approved",
      notes: `Appointment confirmed instantly after successful payment of INR ${APPOINTMENT_FEE_INR}.`,
      paymentStatus: "paid",
      paymentMethod: "gateway",
      paymentAmount: APPOINTMENT_FEE_INR,
      paymentCurrency: "INR",
      paymentId: razorpay_payment_id,
      paymentOrderId: razorpay_order_id,
      paymentReference: payment.method === "upi" ? payment.vpa || null : null,
    });

    await appointment.save();
    await SlotHold.deleteOne({ _id: slotHold._id });

    // Populate doctor info before returning
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("doctor", "name email")
      .populate("patient", "name email");

    // Emit notification to doctor (real-time)
    try {
      const io = req.app.get("io");
      if (io && populatedAppointment.doctor) {
        const payload = {
          id: `appointment_${populatedAppointment._id}`,
          type: "appointment",
          refId: populatedAppointment._id,
          title: "New paid appointment booked",
          body: `${populatedAppointment.patient?.name || "A patient"} completed payment and booked for ${new Date(populatedAppointment.appointmentDate).toLocaleString()}`,
          time: new Date(),
          targetUrl: `/appointments?highlight=${populatedAppointment._id}`,
        };
        io.to(`user_${populatedAppointment.doctor._id}`).emit("notification", payload);
      }
    } catch (e) {
      console.warn("Emit notification failed:", e.message);
    }

    res.status(201).json({
      message: "Payment successful. Appointment booked and confirmed.",
      appointment: populatedAppointment,
    });

  } catch (error) {
    console.error("Appointment creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================================
// ADMIN: PENDING APPOINTMENT PAYMENTS
// ================================
router.get("/payments/pending", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const appointments = await Appointment.find({ paymentStatus: "pending_verification" })
      .populate("patient", "name email")
      .populate("doctor", "name email specialization")
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    console.error("Pending appointment payments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================================
// ADMIN: REVIEW APPOINTMENT PAYMENT
// ================================
router.put("/payments/:id/review", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const { action, notes } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid review action" });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "name email")
      .populate("doctor", "name email specialization");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.paymentStatus !== "pending_verification") {
      return res.status(400).json({ message: "This payment has already been reviewed" });
    }

    appointment.paymentReviewedBy = req.user.id;
    appointment.paymentReviewedAt = new Date();

    if (action === "approve") {
      appointment.paymentStatus = "paid";
      appointment.status = "approved";
      appointment.notes = notes
        ? `${appointment.notes} Admin note: ${notes}`
        : `${appointment.notes} Payment verified and appointment confirmed.`;
    } else {
      appointment.paymentStatus = "rejected";
      appointment.status = "cancelled";
      appointment.notes = notes
        ? `${appointment.notes} Payment rejected: ${notes}`
        : `${appointment.notes} Payment rejected by admin.`;
    }

    await appointment.save();

    try {
      const io = req.app.get("io");
      if (io) {
        const patientPayload = {
          id: `appointment_review_${appointment._id}`,
          type: "appointment-review",
          refId: appointment._id,
          title: action === "approve" ? "Appointment confirmed" : "Appointment payment rejected",
          body:
            action === "approve"
              ? `Your payment was verified. Appointment with Dr. ${appointment.doctor?.name || "Doctor"} is confirmed.`
              : `Your payment for the appointment with Dr. ${appointment.doctor?.name || "Doctor"} was rejected.`,
          time: new Date(),
          targetUrl: `/appointments?highlight=${appointment._id}`,
        };
        io.to(`user_${appointment.patient?._id}`).emit("notification", patientPayload);

        if (action === "approve") {
          const doctorPayload = {
            id: `appointment_confirmed_${appointment._id}`,
            type: "appointment",
            refId: appointment._id,
            title: "New paid appointment confirmed",
            body: `${appointment.patient?.name || "A patient"} booking is confirmed for ${new Date(appointment.appointmentDate).toLocaleString()}`,
            time: new Date(),
            targetUrl: `/appointments?highlight=${appointment._id}`,
          };
          io.to(`user_${appointment.doctor?._id}`).emit("notification", doctorPayload);
        }
      }
    } catch (emitError) {
      console.warn("Emit review notification failed:", emitError.message);
    }

    res.json({ message: action === "approve" ? "Payment approved and appointment confirmed" : "Payment rejected and appointment cancelled", appointment });
  } catch (error) {
    console.error("Appointment payment review error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================================
// ADMIN: REMINDER JOB STATUS
// ================================
router.get("/admin/reminders/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const window24h = getReminderWindowBounds(24);
    const window1h = getReminderWindowBounds(1);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [pending24h, pending1h, failedLast24h] = await Promise.all([
      Appointment.countDocuments({
        status: { $in: ["pending", "approved"] },
        appointmentDate: { $gte: window24h.start, $lte: window24h.end },
        reminder24hSentAt: null,
      }),
      Appointment.countDocuments({
        status: { $in: ["pending", "approved"] },
        appointmentDate: { $gte: window1h.start, $lte: window1h.end },
        reminder1hSentAt: null,
      }),
      ReminderDeliveryLog.countDocuments({
        delivered: false,
        createdAt: { $gte: since },
      }),
    ]);

    res.json({
      scheduler: getAppointmentReminderJobStatus(),
      pendingCandidates: {
        reminder24h: pending24h,
        reminder1h: pending1h,
      },
      delivery: {
        failedLast24h,
      },
      windows: {
        reminder24h: window24h,
        reminder1h: window1h,
      },
    });
  } catch (error) {
    console.error("Reminder status fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================================
// ADMIN: RECENT REMINDER DELIVERY LOGS
// ================================
router.get("/admin/reminders/deliveries", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const deliveredFilter = req.query.delivered;

    const filter = {};
    if (deliveredFilter === "true") filter.delivered = true;
    if (deliveredFilter === "false") filter.delivered = false;

    const logs = await ReminderDeliveryLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("appointment", "appointmentDate status")
      .populate("user", "name email phone role");

    res.json(logs);
  } catch (error) {
    console.error("Reminder delivery logs fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================================
// GET PATIENT APPOINTMENTS
// ================================
router.get("/", authMiddleware, async (req, res) => {
  try {
    // If patient query param is provided (doctor viewing patient's appointments)
    const patientId = req.query.patient;
    
    if (patientId) {
      // Doctor viewing specific patient's appointments - only show appointments between this doctor and patient
      if (req.user.role !== "doctor") {
        return res.status(403).json({ message: "Only doctors can view patient appointments" });
      }
      
      const appointments = await Appointment.find({
        patient: patientId,
        doctor: req.user.id,  // Only appointments with the current doctor
      }).populate("doctor", "name specialization email");

      return res.json(appointments);
    }
    
    // Patient viewing their own appointments
    const appointments = await Appointment.find({
      patient: req.user.id,
    }).populate("doctor", "name specialization email");

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// ================================
// ================================
// GET ALL APPOINTMENTS (Doctor) - Deprecated, use /doctor instead
// ================================
router.get("/all", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Return only THIS doctor's appointments (not all in system)
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate("patient", "name email phone")
      .sort({ appointmentDate: -1 });

    res.json(appointments);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================================
// GET DOCTOR'S APPOINTMENTS (filtered by current doctor)
// ================================
router.get("/doctor", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const appointments = await Appointment.find({
      doctor: req.user.id,
    })
      .populate("patient", "name email phone")
      .sort({ appointmentDate: -1 });

    res.json(appointments);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================================
// PATIENT: CANCEL OR RESCHEDULE
// ================================
router.put("/:id/patient-action", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can update their appointments" });
    }

    const { action, appointmentDate, notes, holdId } = req.body;
    if (!action || !["cancel", "reschedule"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use cancel or reschedule." });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user.id,
    }).populate("doctor", "name email workingHours slotIntervalMinutes");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (["cancelled", "completed"].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot update an appointment that is ${appointment.status}` });
    }

    const currentDate = new Date(appointment.appointmentDate);
    const currentHoursLeft = hoursUntil(currentDate);
    if (currentHoursLeft < PATIENT_RESCHEDULE_CUTOFF_HOURS) {
      return res.status(400).json({
        message: `You can only ${action} at least ${PATIENT_RESCHEDULE_CUTOFF_HOURS} hours before the appointment`,
      });
    }

    if (action === "cancel") {
      appointment.status = "cancelled";
      if (notes) {
        appointment.notes = `${appointment.notes || ""} Patient cancellation note: ${String(notes).trim()}`.trim();
      }
      await appointment.save();
      return res.json({ message: "Appointment cancelled successfully", appointment });
    }

    if (!appointmentDate) {
      return res.status(400).json({ message: "appointmentDate is required for reschedule" });
    }

    if (!holdId) {
      return res.status(409).json({ message: "Please reselect slot to reserve it before rescheduling." });
    }

    const doctorProfile = await User.findOne({ _id: appointment.doctor._id, role: "doctor" }).select(
      "workingHours slotIntervalMinutes bufferMinutes workingDays unavailableDates"
    );
    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const parsedNewDate = new Date(appointmentDate);
    if (Number.isNaN(parsedNewDate.getTime())) {
      return res.status(400).json({ message: "Invalid appointment date" });
    }

    if (parsedNewDate <= new Date()) {
      return res.status(400).json({ message: "Rescheduled time must be in the future" });
    }

    const schedule = normalizeDoctorSchedule(doctorProfile);
    const minGapMs = (schedule.interval + schedule.buffer) * 60 * 1000;
    const doctorOffReason = getDoctorOffReason(schedule, parsedNewDate);
    if (doctorOffReason) {
      return res.status(400).json({ message: doctorOffReason });
    }

    const slot = getSlotFromDate(parsedNewDate);
    const slots = buildDailySlots(schedule);
    if (!slots.includes(slot)) {
      return res.status(400).json({
        message: `Select a valid appointment slot between ${schedule.start} and ${schedule.end} in ${schedule.interval}-minute intervals`,
      });
    }

    const { start: dayStart, end: dayEnd } = getDayBounds(parsedNewDate.toISOString().slice(0, 10));
    const dayAppointments = await Appointment.find({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["cancelled", "rejected"] },
    }).select("_id status appointmentDate");

    if (isSlotBlockedByAppointments(parsedNewDate, dayAppointments, minGapMs)) {
      return res.status(409).json({ message: "Selected slot conflicts with another appointment or required buffer time" });
    }

    const slotHold = await SlotHold.findOne({
      _id: holdId,
      patient: req.user.id,
      doctor: appointment.doctor._id,
      expiresAt: { $gt: new Date() },
    }).select("_id slotDate");

    if (!slotHold) {
      return res.status(409).json({ message: "Slot reservation expired. Please select the slot again." });
    }

    const holdDate = new Date(slotHold.slotDate);
    if (Math.abs(parsedNewDate.getTime() - holdDate.getTime()) > SLOT_HOLD_MATCH_TOLERANCE_MS) {
      return res.status(409).json({ message: "Slot reservation does not match selected time. Please reselect slot." });
    }

    appointment.appointmentDate = parsedNewDate;
    appointment.status = appointment.paymentStatus === "paid" ? "approved" : "pending";
    if (notes) {
      appointment.notes = `${appointment.notes || ""} Patient reschedule note: ${String(notes).trim()}`.trim();
    }
    await appointment.save();
    await SlotHold.deleteOne({ _id: slotHold._id });

    res.json({
      message: "Appointment rescheduled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Patient appointment update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// ================================
// UPDATE APPOINTMENT STATUS (Doctor)
// ================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, notes } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    ).populate("doctor", "name email").populate("patient", "name email");

    res.json(appointment);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================================
// ADD PRESCRIPTION (Doctor)
// ================================
router.put("/prescription/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { prescription } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { prescription },
      { new: true }
    );

    res.json(appointment);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
