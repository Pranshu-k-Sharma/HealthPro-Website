const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
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
    appointmentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "pending_verification", "paid", "failed", "rejected"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["manual_upi", "gateway", null],
      default: null,
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    paymentCurrency: {
      type: String,
      default: "INR",
    },
    paymentId: {
      type: String,
      default: null,
    },
    paymentOrderId: {
      type: String,
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
      trim: true,
    },
    paymentProofUrl: {
      type: String,
      default: null,
    },
    paymentReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paymentReviewedAt: {
      type: Date,
      default: null,
    },
    reminder24hSentAt: {
      type: Date,
      default: null,
    },
    reminder1hSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ paymentId: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ paymentReference: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
