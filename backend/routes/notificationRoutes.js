const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Appointment = require("../models/Appointment");
const Report = require("../models/Report");
const Prescription = require("../models/Prescription");
const User = require("../models/User");

const MAX_STORED_READ_NOTIFICATION_IDS = 2000;

const trimNotificationIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  const unique = Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));
  if (unique.length <= MAX_STORED_READ_NOTIFICATION_IDS) return unique;
  return unique.slice(unique.length - MAX_STORED_READ_NOTIFICATION_IDS);
};

const buildNotificationsForUser = async ({ userId, role }) => {
  const notifications = [];

  // For doctors: new appointment requests assigned to them (pending)
  if (role === "doctor") {
    const appts = await Appointment.find({ doctor: userId, status: "pending" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("patient", "name");

    appts.forEach((a) => {
      notifications.push({
        id: `appointment_${a._id}`,
        type: "appointment",
        refId: a._id,
        title: "New appointment request",
        body: `${a.patient?.name || "A patient"} requested an appointment on ${new Date(a.appointmentDate).toLocaleString()}`,
        time: a.createdAt,
        targetUrl: `/appointments?highlight=${a._id}`,
      });
    });
  }

  // For patients: new reports and prescriptions for them
  if (role === "patient") {
    const reports = await Report.find({ patient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("doctor", "name");

    reports.forEach((r) => {
      notifications.push({
        id: `report_${r._id}`,
        type: "report",
        refId: r._id,
        title: "Report ready",
        body: `Report from Dr. ${r.doctor?.name || "your doctor"}`,
        time: r.createdAt,
        targetUrl: `/reports?highlight=${r._id}`,
      });
    });

    const prescriptions = await Prescription.find({ patient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("doctor", "name");

    prescriptions.forEach((p) => {
      notifications.push({
        id: `prescription_${p._id}`,
        type: "prescription",
        refId: p._id,
        title: "Prescription issued",
        body: `Prescription from Dr. ${p.doctor?.name || "your doctor"}`,
        time: p.createdAt,
        targetUrl: `/prescriptions?highlight=${p._id}`,
      });
    });
  }

  notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
  return notifications.slice(0, 50);
};

// GET /api/notifications - returns recent notifications for the authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const user = await User.findById(userId).select("readNotificationIds");
    const readSet = new Set((user?.readNotificationIds || []).map((id) => String(id)));

    const notifications = await buildNotificationsForUser({ userId, role });

    res.json(
      notifications.map((notification) => ({
        ...notification,
        read: readSet.has(String(notification.id)),
      }))
    );
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/read - mark one notification as read
router.post("/read", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = String(req.body?.notificationId || "").trim();

    if (!notificationId) {
      return res.status(400).json({ message: "notificationId is required" });
    }

    const user = await User.findById(userId).select("readNotificationIds");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.readNotificationIds = trimNotificationIds([...(user.readNotificationIds || []), notificationId]);
    await user.save();

    return res.json({ message: "Notification marked as read", notificationId });
  } catch (err) {
    console.error("Mark notification read error:", err);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// POST /api/notifications/read-all - mark current notifications as read
router.post("/read-all", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const [user, notifications] = await Promise.all([
      User.findById(userId).select("readNotificationIds"),
      buildNotificationsForUser({ userId, role }),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const incomingIds = notifications.map((n) => n.id);
    user.readNotificationIds = trimNotificationIds([...(user.readNotificationIds || []), ...incomingIds]);
    await user.save();

    return res.json({ message: "All notifications marked as read", count: incomingIds.length });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

module.exports = router;
