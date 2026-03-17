const express = require("express");
const router = express.Router();
const Report = require("../models/Report");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

// multer setup for attachments
const uploadsRoot = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsRoot),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

function canAccessReport(report, user) {
  if (!report || !user) return false;
  const reportPatientId = String(report.patient?._id || report.patient || "");
  const reportDoctorId = String(report.doctor?._id || report.doctor || "");
  const userId = String(user.id || user._id || "");

  if (user.role === "patient") return reportPatientId === userId;
  if (user.role === "doctor") return reportDoctorId === userId;
  return false;
}

// Create a new report (supports optional attachment)
router.post("/", authMiddleware, upload.single("attachment"), async (req, res) => {
  try {
    const { appointmentId, patientId, diagnosis, findings, treatment, notes, doctorId } = req.body;

    if (!appointmentId || !patientId || !diagnosis || !findings || !treatment) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // allow doctor to be requester; if patient uploads, doctorId must be provided
    const doctorField = req.user.role === "doctor" ? req.user.id : doctorId;

    const report = new Report({
      appointment: appointmentId,
      patient: patientId,
      doctor: doctorField,
      diagnosis,
      findings,
      treatment,
      notes,
    });

    if (req.file) {
      report.attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`,
      };
    }

    await report.save();

    // Emit notification to patient
    try {
      const io = req.app.get("io");
      if (io && report.patient) {
        const payload = {
          id: `report_${report._id}`,
          type: "report",
          refId: report._id,
          title: "Report ready",
          body: `Report from Dr. ${req.user.name || req.user.id}`,
          time: new Date(),
          targetUrl: `/reports?highlight=${report._id}`,
        };
        io.to(`user_${report.patient}`).emit("notification", payload);
      }
    } catch (e) {
      console.warn("Emit report notification failed:", e.message);
    }

    res.status(201).json({ message: "Report created successfully", report });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: "Error creating report" });
  }
});

// Generate PDF for a report
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate("patient doctor appointment");
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (!canAccessReport(report, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report_${report._id}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(18).text("Medical Report", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Patient: ${report.patient?.name || "N/A"}`);
    doc.text(`Doctor: ${report.doctor?.name || "N/A"}`);
    doc.text(`Date: ${new Date(report.reportDate).toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(14).text("Diagnosis:");
    doc.fontSize(12).text(report.diagnosis || "");
    doc.moveDown();
    doc.fontSize(14).text("Findings:");
    doc.fontSize(12).text(report.findings || "");
    doc.moveDown();
    doc.fontSize(14).text("Treatment:");
    doc.fontSize(12).text(report.treatment || "");
    doc.moveDown();
    if (report.notes) {
      doc.fontSize(14).text("Notes:");
      doc.fontSize(12).text(report.notes);
      doc.moveDown();
    }

    if (report.attachment && report.attachment.url) {
      doc.fontSize(12).fillColor("blue").text(`Attachment: ${report.attachment.originalName}`, { link: `${req.protocol}://${req.get("host")}${report.attachment.url}` });
    }

    doc.end();
  } catch (err) {
    console.error("Report PDF error:", err);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

// Download original report attachment
router.get("/:id/attachment", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (!canAccessReport(report, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!report.attachment || !report.attachment.path) {
      return res.status(404).json({ message: "No attachment found for this report" });
    }

    if (!fs.existsSync(report.attachment.path)) {
      return res.status(404).json({ message: "Attachment file not found on server" });
    }

    return res.download(report.attachment.path, report.attachment.originalName || report.attachment.filename);
  } catch (err) {
    console.error("Report attachment download error:", err);
    return res.status(500).json({ message: "Failed to download attachment" });
  }
});

// Get all reports for a doctor
router.get("/doctor", authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ doctor: req.user.id })
      .populate("patient", "name email")
      .populate("appointment")
      .sort({ reportDate: -1 });

    res.json(reports);
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

// Get reports - with query parameter support for both patients and doctors
router.get("/", authMiddleware, async (req, res) => {
  try {
    const patientId = req.query.patient;
    const doctorId = req.query.doctor;

    if (patientId) {
      // Allow patient to fetch their own reports or doctor to fetch patient's reports
      if (req.user.role === "patient" && req.user.id !== patientId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const reports = await Report.find({ patient: patientId })
        .populate("doctor", "name specialization")
        .populate("appointment")
        .sort({ reportDate: -1 });

      return res.json(reports);
    }

    if (doctorId) {
      // Get reports issued by a specific doctor
      const reports = await Report.find({ doctor: doctorId })
        .populate("patient", "name email")
        .populate("appointment")
        .sort({ reportDate: -1 });

      return res.json(reports);
    }

    // Patient's own reports (no parameters)
    if (req.user.role === "patient") {
      const reports = await Report.find({ patient: req.user.id })
        .populate("doctor", "name specialization")
        .populate("appointment")
        .sort({ reportDate: -1 });

      return res.json(reports);
    }

    // If no parameters, return error
    res.status(400).json({ message: "Please provide patient or doctor query parameter" });
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

// Get all reports for a specific patient (alternative endpoint)
router.get("/patient/:patientId", authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ patient: req.params.patientId })
      .populate("doctor", "name")
      .populate("appointment")
      .sort({ reportDate: -1 });

    res.json(reports);
  } catch (error) {
    console.error("Fetch patient reports error:", error);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

// Get a specific report
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("patient", "name email")
      .populate("doctor", "name")
      .populate("appointment");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json(report);
  } catch (error) {
    console.error("Fetch report error:", error);
    res.status(500).json({ message: "Error fetching report" });
  }
});

// Update a report
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { diagnosis, findings, treatment, notes } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (diagnosis) report.diagnosis = diagnosis;
    if (findings) report.findings = findings;
    if (treatment) report.treatment = treatment;
    if (notes !== undefined) report.notes = notes;

    await report.save();
    res.json({ message: "Report updated successfully", report });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({ message: "Error updating report" });
  }
});

// Delete a report
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Error deleting report" });
  }
});

module.exports = router;
