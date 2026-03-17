const mongoose = require("mongoose");

const consultationMessageSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ["text", "call"],
      default: "text",
    },
    // For call-type messages: voice | video
    callType: {
      type: String,
      enum: ["voice", "video"],
      default: null,
    },
    // IDs of users who have read this message
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

consultationMessageSchema.index({ appointment: 1, createdAt: 1 });

module.exports = mongoose.model("ConsultationMessage", consultationMessageSchema);
