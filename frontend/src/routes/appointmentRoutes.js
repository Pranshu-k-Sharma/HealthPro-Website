const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const User = require("../models/User");

// Middleware to protect routes
const authMiddleware = require("../middleware/authMiddleware");

/*
  POST /api/appointments
  Patient books appointment
*/
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { doctor, appointmentDate } = req.body;
        console.log("BODY:", req.body);
    console.log("USER:", req.user);


    if (!doctor || !appointmentDate) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check doctor exists
    const doctorUser = await User.findById(doctor);

    if (!doctorUser || doctorUser.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctor" });
    }

    const newAppointment = new Appointment({
      patient: req.user.id,
      doctor,
      appointmentDate,
    });

    await newAppointment.save();

    res.status(201).json({
      message: "Appointment booked successfully",
    });

  } catch (error) {
    console.error("Appointment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/*
  GET /api/appointments/doctor
  Doctor views their appointments
*/
router.get("/doctor", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.user.id,
    })
      .populate("patient", "name email")
      .sort({ appointmentDate: 1 });

    res.json(appointments);

  } catch (error) {
    console.error("Fetch doctor appointments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
