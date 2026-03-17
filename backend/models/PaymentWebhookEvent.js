const mongoose = require("mongoose");

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["received", "processed", "failed", "ignored"],
      default: "received",
    },
    message: {
      type: String,
      default: "",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

paymentWebhookEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);
