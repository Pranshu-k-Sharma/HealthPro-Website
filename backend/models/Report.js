const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
    },
    findings: {
      type: String,
      required: true,
    },
    treatment: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    attachment: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      path: String,
      url: String,
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
