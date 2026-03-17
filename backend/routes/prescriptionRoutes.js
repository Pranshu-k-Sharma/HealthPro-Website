const express = require("express");
const router = express.Router();
const Prescription = require("../models/Prescription");
const authMiddleware = require("../middleware/authMiddleware");
const PDFDocument = require("pdfkit");

// Create a new prescription
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { appointmentId, patientId, medicines, notes, expiryDate } = req.body;

    if (!appointmentId || !patientId || !medicines || medicines.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prescription = new Prescription({
      appointment: appointmentId,
      patient: patientId,
      doctor: req.user.id,
      medicines,
      notes,
      expiryDate,
    });

    await prescription.save();
    // Emit notification to patient
    try {
      const io = req.app.get("io");
      if (io && prescription.patient) {
        const payload = {
          id: `prescription_${prescription._id}`,
          type: "prescription",
          refId: prescription._id,
          title: "Prescription issued",
          body: `Prescription from Dr. ${req.user.name || req.user.id}`,
          time: new Date(),
          targetUrl: `/prescriptions?highlight=${prescription._id}`,
        };
        io.to(`user_${prescription.patient}`).emit("notification", payload);
      }
    } catch (e) {
      console.warn("Emit prescription notification failed:", e.message);
    }

    res.status(201).json({ message: "Prescription created successfully", prescription });
  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).json({ message: "Error creating prescription" });
  }
});

// Get all prescriptions for a doctor
router.get("/doctor", authMiddleware, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ doctor: req.user.id })
      .populate("patient", "name email")
      .populate("appointment")
      .sort({ issuedDate: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error("Fetch prescriptions error:", error);
    res.status(500).json({ message: "Error fetching prescriptions" });
  }
});

// Get prescriptions by query parameter (patient or doctor specific)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const patientId = req.query.patient;
    const doctorId = req.query.doctor;

    if (patientId) {
      // Doctor viewing specific patient's prescriptions - only show prescriptions written by this doctor
      if (req.user.role === "doctor") {
        const prescriptions = await Prescription.find({ 
          patient: patientId,
          doctor: req.user.id,  // Only prescriptions written by the current doctor
        })
          .populate("doctor", "name")
          .populate("appointment")
          .sort({ issuedDate: -1 });

        return res.json(prescriptions);
      }
      
      // Patient viewing their own prescriptions
      if (req.user.role === "patient" && req.user.id === patientId) {
        const prescriptions = await Prescription.find({ patient: patientId })
          .populate("doctor", "name specialization")
          .populate("appointment")
          .sort({ issuedDate: -1 });

        return res.json(prescriptions);
      }
      
      return res.status(403).json({ message: "Access denied" });
    }

    if (doctorId) {
      // Get prescriptions issued by a specific doctor
      const prescriptions = await Prescription.find({ doctor: doctorId })
        .populate("patient", "name email")
        .populate("appointment")
        .sort({ issuedDate: -1 });

      return res.json(prescriptions);
    }

    // Patient's own prescriptions (no parameters)
    if (req.user.role === "patient") {
      const prescriptions = await Prescription.find({ patient: req.user.id })
        .populate("doctor", "name specialization")
        .populate("appointment")
        .sort({ issuedDate: -1 });

      return res.json(prescriptions);
    }

    // If no parameters, return error
    res.status(400).json({ message: "Please provide patient or doctor query parameter" });
  } catch (error) {
    console.error("Fetch prescriptions error:", error);
    res.status(500).json({ message: "Error fetching prescriptions" });
  }
});

// Get all prescriptions for a specific patient
router.get("/patient/:patientId", authMiddleware, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.params.patientId })
      .populate("doctor", "name")
      .populate("appointment")
      .sort({ issuedDate: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error("Fetch patient prescriptions error:", error);
    res.status(500).json({ message: "Error fetching prescriptions" });
  }
});

// Get a specific prescription
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("patient", "name email")
      .populate("doctor", "name")
      .populate("appointment");

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    res.json(prescription);
  } catch (error) {
    console.error("Fetch prescription error:", error);
    res.status(500).json({ message: "Error fetching prescription" });
  }
});

// Update a prescription
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { medicines, notes, expiryDate } = req.body;

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    if (medicines) prescription.medicines = medicines;
    if (notes !== undefined) prescription.notes = notes;
    if (expiryDate) prescription.expiryDate = expiryDate;

    await prescription.save();
    res.json({ message: "Prescription updated successfully", prescription });
  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json({ message: "Error updating prescription" });
  }
});

// Renew a prescription
router.post("/:id/renew", authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    prescription.renewalCount += 1;
    prescription.issuedDate = new Date();

    if (req.body.expiryDate) {
      prescription.expiryDate = req.body.expiryDate;
    }

    await prescription.save();
    res.json({ message: "Prescription renewed successfully", prescription });
  } catch (error) {
    console.error("Renew prescription error:", error);
    res.status(500).json({ message: "Error renewing prescription" });
  }
});

// Delete a prescription
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndDelete(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    res.json({ message: "Prescription deleted successfully" });
  } catch (error) {
    console.error("Delete prescription error:", error);
    res.status(500).json({ message: "Error deleting prescription" });
  }
});

// Generate PDF for prescription
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate("patient doctor appointment");
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=prescription_${prescription._id}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(18).text("Prescription", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Patient: ${prescription.patient?.name || "N/A"}`);
    doc.text(`Doctor: ${prescription.doctor?.name || "N/A"}`);
    doc.text(`Issued: ${new Date(prescription.issuedDate).toLocaleString()}`);
    doc.moveDown();

    if (prescription.medicines && prescription.medicines.length) {
      doc.fontSize(14).text("Medicines:");
      prescription.medicines.forEach((m, idx) => {
        doc.fontSize(12).text(`${idx + 1}. ${m.name} — ${m.dosage} — ${m.frequency} — ${m.duration}`);
        if (m.instructions) doc.fontSize(10).text(`Instructions: ${m.instructions}`);
        doc.moveDown(0.2);
      });
    }

    if (prescription.notes) {
      doc.moveDown();
      doc.fontSize(14).text("Notes:");
      doc.fontSize(12).text(prescription.notes);
    }

    doc.end();
  } catch (err) {
    console.error("Prescription PDF error:", err);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

module.exports = router;
