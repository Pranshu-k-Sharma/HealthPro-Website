const express = require("express");
const crypto = require("crypto");
const Appointment = require("../models/Appointment");
const ConsultationMessage = require("../models/ConsultationMessage");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const VALIDITY_WINDOW_DAYS = 14;
const ELIGIBLE_STATUSES = new Set(["approved", "completed"]);

const getConsultationAccess = (appointment, userId) => {
  if (!appointment) {
    return {
      allowed: false,
      reason: "Appointment not found",
      statusCode: 404,
    };
  }

  const patientId = String(appointment.patient?._id || appointment.patient);
  const doctorId = String(appointment.doctor?._id || appointment.doctor);
  const requesterId = String(userId);

  if (![patientId, doctorId].includes(requesterId)) {
    return {
      allowed: false,
      reason: "You are not part of this appointment",
      statusCode: 403,
    };
  }

  if (!ELIGIBLE_STATUSES.has(appointment.status)) {
    return {
      allowed: false,
      reason: "Consultation is available only after appointment acceptance",
      statusCode: 403,
    };
  }

  const now = new Date();
  const appointmentDate = new Date(appointment.appointmentDate);
  const validUntil = new Date(appointmentDate.getTime() + VALIDITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  if (now > validUntil) {
    return {
      allowed: false,
      reason: "Consultation window expired (14 days after appointment date)",
      statusCode: 403,
      validUntil,
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    validUntil,
    patientId,
    doctorId,
  };
};

const __testables = {
  getConsultationAccess,
};

const createRoomKey = (appointmentId) => {
  const source = `${process.env.JWT_SECRET || "healthcare-ui"}:${appointmentId}`;
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 16);
};

const getCallUrl = (appointmentId, callType) => {
  const roomKey = createRoomKey(appointmentId);
  const roomName = `healthpro-${roomKey}`;
  const callMode = callType === "voice" ? "voice" : "video";
  const config = callMode === "voice"
    ? "#config.startWithAudioMuted=false&config.startWithVideoMuted=true"
    : "#config.startWithAudioMuted=false&config.startWithVideoMuted=false";

  return {
    roomName,
    meetingUrl: `https://meet.jit.si/${roomName}${config}`,
  };
};

router.get("/appointment/:appointmentId/access", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "name")
      .populate("doctor", "name");

    const access = getConsultationAccess(appointment, req.user.id);
    if (!access.allowed) {
      return res.status(access.statusCode).json({
        canAccess: false,
        reason: access.reason,
        validUntil: access.validUntil || null,
      });
    }

    return res.json({
      canAccess: true,
      validUntil: access.validUntil,
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        patient: appointment.patient,
        doctor: appointment.doctor,
      },
    });
  } catch (error) {
    console.error("Consultation access check error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/appointment/:appointmentId/messages", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId).select("patient doctor status appointmentDate");

    const access = getConsultationAccess(appointment, req.user.id);
    if (!access.allowed) {
      return res.status(access.statusCode).json({ message: access.reason });
    }

    const messages = await ConsultationMessage.find({ appointment: appointmentId })
      .sort({ createdAt: 1 })
      .populate("sender", "name role")
      .populate("receiver", "name role");

    return res.json({
      validUntil: access.validUntil,
      messages,
    });
  } catch (error) {
    console.error("Fetch consultation messages error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/appointment/:appointmentId/messages", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const appointment = await Appointment.findById(appointmentId).select("patient doctor status appointmentDate");

    const access = getConsultationAccess(appointment, req.user.id);
    if (!access.allowed) {
      return res.status(access.statusCode).json({ message: access.reason });
    }

    const senderId = String(req.user.id);
    const receiverId = senderId === access.patientId ? access.doctorId : access.patientId;

    const created = await ConsultationMessage.create({
      appointment: appointmentId,
      sender: senderId,
      receiver: receiverId,
      message: message.trim(),
      readBy: [senderId], // sender has already read their own message
    });

    const populatedMessage = await ConsultationMessage.findById(created._id)
      .populate("sender", "name role")
      .populate("receiver", "name role");

    const io = req.app.get("io");
    if (io) {
      const payload = {
        appointmentId,
        message: populatedMessage,
      };

      io.to(`user_${access.patientId}`).emit("consultation:message", payload);
      io.to(`user_${access.doctorId}`).emit("consultation:message", payload);
    }

    return res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error("Create consultation message error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/appointment/:appointmentId/call", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const callType = req.query.type === "voice" ? "voice" : "video";

    const appointment = await Appointment.findById(appointmentId).select("patient doctor status appointmentDate");
    const access = getConsultationAccess(appointment, req.user.id);
    if (!access.allowed) {
      return res.status(access.statusCode).json({ message: access.reason });
    }

    const callData = getCallUrl(appointmentId, callType);

    // Log a call system message so the other party sees a missed-call entry
    const senderId = String(req.user.id);
    const receiverId = senderId === access.patientId ? access.doctorId : access.patientId;
    const callLabel = callType === "voice" ? "Started a voice call" : "Started a video call";

    const callMsg = await ConsultationMessage.create({
      appointment: appointmentId,
      sender: senderId,
      receiver: receiverId,
      message: callLabel,
      messageType: "call",
      callType,
      readBy: [senderId], // caller has seen their own call
    });

    const populatedCallMsg = await ConsultationMessage.findById(callMsg._id)
      .populate("sender", "name role")
      .populate("receiver", "name role");

    const io = req.app.get("io");
    if (io) {
      const payload = { appointmentId, message: populatedCallMsg };
      io.to(`user_${access.patientId}`).emit("consultation:message", payload);
      io.to(`user_${access.doctorId}`).emit("consultation:message", payload);
    }

    return res.json({
      callType,
      validUntil: access.validUntil,
      ...callData,
    });
  } catch (error) {
    console.error("Create consultation call error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Mark all messages in a consultation as read for the current user
router.patch("/appointment/:appointmentId/messages/read", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId).select("patient doctor status appointmentDate");

    const access = getConsultationAccess(appointment, req.user.id);
    if (!access.allowed) {
      return res.status(access.statusCode).json({ message: access.reason });
    }

    const userId = req.user.id;

    await ConsultationMessage.updateMany(
      { appointment: appointmentId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${access.patientId}`).emit("consultation:read", { appointmentId, readBy: String(userId) });
      io.to(`user_${access.doctorId}`).emit("consultation:read", { appointmentId, readBy: String(userId) });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Mark consultation read error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get unread message count per appointment for the current user
router.get("/unread", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all appointments the user is part of (as patient or doctor)
    const Appointment = require("../models/Appointment");
    const appointments = await Appointment.find({
      $or: [{ patient: userId }, { doctor: userId }],
      status: { $in: ["approved", "completed"] },
    }).select("_id appointmentDate");

    const now = new Date();
    const VALIDITY_MS = VALIDITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const validAppointmentIds = appointments
      .filter((appt) => now <= new Date(new Date(appt.appointmentDate).getTime() + VALIDITY_MS))
      .map((appt) => appt._id);

    if (validAppointmentIds.length === 0) {
      return res.json({ total: 0, byAppointment: {} });
    }

    // Count unread (not in readBy) messages sent by others
    const unreadDocs = await ConsultationMessage.aggregate([
      {
        $match: {
          appointment: { $in: validAppointmentIds },
          sender: { $ne: require("mongoose").Types.ObjectId.createFromHexString
            ? require("mongoose").Types.ObjectId.createFromHexString(String(userId))
            : new (require("mongoose").Types.ObjectId)(String(userId)) },
          readBy: { $ne: require("mongoose").Types.ObjectId.createFromHexString
            ? require("mongoose").Types.ObjectId.createFromHexString(String(userId))
            : new (require("mongoose").Types.ObjectId)(String(userId)) },
        },
      },
      {
        $group: {
          _id: "$appointment",
          count: { $sum: 1 },
        },
      },
    ]);

    const byAppointment = {};
    let total = 0;
    for (const doc of unreadDocs) {
      byAppointment[String(doc._id)] = doc.count;
      total += doc.count;
    }

    return res.json({ total, byAppointment });
  } catch (error) {
    console.error("Get consultation unread error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
module.exports.__testables = __testables;
