const mongoose = require("mongoose");

const slotHoldSchema = new mongoose.Schema(
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
    slotDate: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

slotHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
slotHoldSchema.index({ doctor: 1, slotDate: 1 }, { unique: true });
slotHoldSchema.index({ patient: 1, expiresAt: 1 });

module.exports = mongoose.model("SlotHold", slotHoldSchema);
