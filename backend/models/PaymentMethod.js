const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["card", "upi"],
      required: true,
    },
    brand: {
      type: String,
      default: null,
    },
    last4: {
      type: String,
      default: null,
    },
    expiryMonth: {
      type: String,
      default: null,
    },
    expiryYear: {
      type: String,
      default: null,
    },
    holderName: {
      type: String,
      default: null,
    },
    upiId: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

paymentMethodSchema.index({ user: 1, createdAt: -1 });
paymentMethodSchema.index({ user: 1, upiId: 1 }, { unique: false });

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
