const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const userRoutes = require("./routes/userRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const aiRoutes = require("./routes/aiRoutes");
const contactRoutes = require("./routes/contactRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const errorHandler = require("./middleware/errorHandler");
const { startAppointmentReminderJob } = require("./services/appointmentReminderService");

const app = express();

// Middlewares
app.use(cors());
app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

// Health endpoint for hosting providers
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Ensure uploads directory exists and serve it
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

console.log("Mounting routes...");
// Routes
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payments", paymentRoutes);

// Central error handler (should be last middleware)
app.use(errorHandler);

// Connect DB with graceful handling
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-ui";

mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.IO for real-time notifications
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN
      ? process.env.FRONTEND_ORIGIN.split(",").map((o) => o.trim())
      : true, // allow all origins when not set; JWT handles auth
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;
    if (userId) {
      const room = `user_${userId}`;
      socket.join(room);
      socket.emit("connected", { message: "connected", room });
    }
  } catch (err) {
    // ignore invalid token connections
    console.warn("Socket auth failed:", err.message);
  }

  socket.on("disconnect", () => {
    // socket leaves rooms automatically
  });
});

// expose io on app so routes can emit
app.set("io", io);

// Start reminder scheduler (24h and 1h before appointment)
const stopReminderJob = startAppointmentReminderJob({ io });

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received: closing server and MongoDB connection...`);
  server.close(async () => {
    try {
      stopReminderJob();
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    } catch (err) {
      console.error("Error during MongoDB shutdown:", err.message);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
