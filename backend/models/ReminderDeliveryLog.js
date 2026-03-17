const mongoose = require("mongoose");

const reminderDeliveryLogSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      enum: ["reminder24h", "reminder1h"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["inApp", "email", "sms"],
      required: true,
      index: true,
    },
    delivered: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    reason: {
      type: String,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Keep logs for 60 days to control growth while preserving operational visibility.
reminderDeliveryLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model("ReminderDeliveryLog", reminderDeliveryLogSchema);
