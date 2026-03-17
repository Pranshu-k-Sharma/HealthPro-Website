const Appointment = require("../models/Appointment");
const ReminderDeliveryLog = require("../models/ReminderDeliveryLog");
const {
  sendInAppReminder,
  sendEmailReminder,
  sendSmsReminder,
} = require("./reminderChannelService");

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const WINDOW_MINUTES = 5;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const jobState = {
  startedAt: null,
  intervalMs: DEFAULT_INTERVAL_MS,
  isRunning: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastCycleStats: null,
};

const isRemindableStatus = (status) => ["pending", "approved"].includes(status);

const getWindowBounds = (targetOffsetMs) => {
  const now = Date.now();
  const center = now + targetOffsetMs;
  const halfWindow = WINDOW_MINUTES * MS_PER_MINUTE;
  return {
    start: new Date(center - halfWindow),
    end: new Date(center + halfWindow),
  };
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  inApp: true,
  email: false,
  sms: false,
  reminder24h: true,
  reminder1h: true,
};

const getUserPreferences = (user) => ({
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  ...(user?.notificationPreferences || {}),
});

const buildPayload = ({ appointmentId, title, body }) => ({
  id: `appointment_reminder_${appointmentId}_${Date.now()}`,
  type: "appointment-reminder",
  refId: appointmentId,
  title,
  body,
  time: new Date(),
  targetUrl: `/appointments?highlight=${appointmentId}`,
});

const dispatchReminder = async ({
  appointmentId,
  io,
  user,
  payload,
  emailSubject,
  emailBody,
  smsBody,
  reminderType,
}) => {
  if (!user?._id) return { attempted: 0, delivered: 0, failed: 0 };

  const logEntries = [];
  const enqueueLog = (channel, result) => {
    logEntries.push({
      appointment: appointmentId,
      user: user._id,
      reminderType,
      channel,
      delivered: Boolean(result?.delivered),
      reason: result?.reason || null,
      providerMessageId: result?.providerMessageId || null,
    });
  };

  const prefs = getUserPreferences(user);
  if (!prefs[reminderType]) {
    return { attempted: 0, delivered: 0, failed: 0 };
  }

  if (prefs.inApp) {
    const delivered = sendInAppReminder(io, user._id, payload);
    enqueueLog("inApp", { delivered, reason: delivered ? null : "inapp-io-or-user-missing" });
  }

  if (prefs.email) {
    const result = await sendEmailReminder({
      toEmail: user.email,
      subject: emailSubject,
      text: emailBody,
    });
    enqueueLog("email", result);
  }

  if (prefs.sms) {
    const result = await sendSmsReminder({
      toPhone: user.phone,
      message: smsBody,
    });
    enqueueLog("sms", result);
  }

  if (logEntries.length) {
    await ReminderDeliveryLog.insertMany(logEntries);
  }

  const deliveredCount = logEntries.filter((entry) => entry.delivered).length;
  return {
    attempted: logEntries.length,
    delivered: deliveredCount,
    failed: logEntries.length - deliveredCount,
  };
};

const send24HourReminders = async (io) => {
  const { start, end } = getWindowBounds(24 * MS_PER_HOUR);
  const candidates = await Appointment.find({
    appointmentDate: { $gte: start, $lte: end },
    reminder24hSentAt: null,
  })
    .populate("doctor", "name email phone notificationPreferences")
    .populate("patient", "name email phone notificationPreferences")
    .select("_id status appointmentDate doctor patient");

  let sentCount = 0;
  let channelAttemptCount = 0;
  let channelSuccessCount = 0;
  let channelFailureCount = 0;

  for (const appointment of candidates) {
    if (!isRemindableStatus(appointment.status)) continue;

    const appointmentDateText = new Date(appointment.appointmentDate).toLocaleString();
    const patientName = appointment.patient?.name || "Patient";
    const doctorName = appointment.doctor?.name || "Doctor";

    const patientDispatch = await dispatchReminder({
      appointmentId: appointment._id,
      io,
      user: appointment.patient,
      reminderType: "reminder24h",
      payload: buildPayload({
        appointmentId: appointment._id,
        title: "Reminder: Appointment in 24 hours",
        body: `Your appointment with Dr. ${doctorName} is scheduled for ${appointmentDateText}.`,
      }),
      emailSubject: "HealthPro reminder: Appointment in 24 hours",
      emailBody: `Your appointment with Dr. ${doctorName} is scheduled for ${appointmentDateText}.`,
      smsBody: `HealthPro: Appointment with Dr. ${doctorName} at ${appointmentDateText}.`,
    });

    const doctorDispatch = await dispatchReminder({
      appointmentId: appointment._id,
      io,
      user: appointment.doctor,
      reminderType: "reminder24h",
      payload: buildPayload({
        appointmentId: appointment._id,
        title: "Reminder: Appointment tomorrow",
        body: `${patientName} has an appointment with you at ${appointmentDateText}.`,
      }),
      emailSubject: "HealthPro reminder: Appointment tomorrow",
      emailBody: `${patientName} has an appointment with you at ${appointmentDateText}.`,
      smsBody: `HealthPro: ${patientName} has an appointment at ${appointmentDateText}.`,
    });

    channelAttemptCount += patientDispatch.attempted + doctorDispatch.attempted;
    channelSuccessCount += patientDispatch.delivered + doctorDispatch.delivered;
    channelFailureCount += patientDispatch.failed + doctorDispatch.failed;

    appointment.reminder24hSentAt = new Date();
    await appointment.save();
    sentCount += 1;
  }

  return {
    window: "24h",
    candidateCount: candidates.length,
    sentCount,
    channelAttemptCount,
    channelSuccessCount,
    channelFailureCount,
  };
};

const send1HourReminders = async (io) => {
  const { start, end } = getWindowBounds(1 * MS_PER_HOUR);
  const candidates = await Appointment.find({
    appointmentDate: { $gte: start, $lte: end },
    reminder1hSentAt: null,
  })
    .populate("doctor", "name email phone notificationPreferences")
    .populate("patient", "name email phone notificationPreferences")
    .select("_id status appointmentDate doctor patient");

  let sentCount = 0;
  let channelAttemptCount = 0;
  let channelSuccessCount = 0;
  let channelFailureCount = 0;

  for (const appointment of candidates) {
    if (!isRemindableStatus(appointment.status)) continue;

    const appointmentDateText = new Date(appointment.appointmentDate).toLocaleString();
    const patientName = appointment.patient?.name || "Patient";
    const doctorName = appointment.doctor?.name || "Doctor";

    const patientDispatch = await dispatchReminder({
      appointmentId: appointment._id,
      io,
      user: appointment.patient,
      reminderType: "reminder1h",
      payload: buildPayload({
        appointmentId: appointment._id,
        title: "Reminder: Appointment in 1 hour",
        body: `Your appointment with Dr. ${doctorName} starts at ${appointmentDateText}.`,
      }),
      emailSubject: "HealthPro reminder: Appointment in 1 hour",
      emailBody: `Your appointment with Dr. ${doctorName} starts at ${appointmentDateText}.`,
      smsBody: `HealthPro: Appointment with Dr. ${doctorName} starts at ${appointmentDateText}.`,
    });

    const doctorDispatch = await dispatchReminder({
      appointmentId: appointment._id,
      io,
      user: appointment.doctor,
      reminderType: "reminder1h",
      payload: buildPayload({
        appointmentId: appointment._id,
        title: "Reminder: Appointment in 1 hour",
        body: `${patientName} is scheduled to meet you at ${appointmentDateText}.`,
      }),
      emailSubject: "HealthPro reminder: Appointment in 1 hour",
      emailBody: `${patientName} is scheduled to meet you at ${appointmentDateText}.`,
      smsBody: `HealthPro: ${patientName} is scheduled to meet you at ${appointmentDateText}.`,
    });

    channelAttemptCount += patientDispatch.attempted + doctorDispatch.attempted;
    channelSuccessCount += patientDispatch.delivered + doctorDispatch.delivered;
    channelFailureCount += patientDispatch.failed + doctorDispatch.failed;

    appointment.reminder1hSentAt = new Date();
    await appointment.save();
    sentCount += 1;
  }

  return {
    window: "1h",
    candidateCount: candidates.length,
    sentCount,
    channelAttemptCount,
    channelSuccessCount,
    channelFailureCount,
  };
};

const runReminderCycle = async (io) => {
  const reminder24h = await send24HourReminders(io);
  const reminder1h = await send1HourReminders(io);
  return {
    reminder24h,
    reminder1h,
  };
};

const startAppointmentReminderJob = ({ io, intervalMs = DEFAULT_INTERVAL_MS }) => {
  let running = false;

  jobState.startedAt = new Date();
  jobState.intervalMs = intervalMs;
  jobState.lastError = null;

  const tick = async () => {
    if (running) return;
    running = true;
    jobState.isRunning = true;
    jobState.lastRunAt = new Date();
    try {
      const cycleStats = await runReminderCycle(io);
      jobState.lastSuccessAt = new Date();
      jobState.lastCycleStats = cycleStats;
      jobState.lastError = null;
    } catch (error) {
      jobState.lastError = {
        message: error.message,
        time: new Date(),
      };
      console.warn("Appointment reminder cycle failed:", error.message);
    } finally {
      running = false;
      jobState.isRunning = false;
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);

  return () => {
    clearInterval(timer);
    jobState.isRunning = false;
  };
};

const getAppointmentReminderJobStatus = () => ({ ...jobState });

module.exports = {
  startAppointmentReminderJob,
  getAppointmentReminderJobStatus,
};
