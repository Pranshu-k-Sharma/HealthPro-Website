const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient",
    },
    specialization: {
      type: String,
      default: null,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: null,
    },
    experience: {
      type: Number,
      default: 0,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    razorpayRouteAccountId: {
      type: String,
      default: null,
      trim: true,
    },
    doctorUpiId: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    workingHours: {
      start: {
        type: String,
        default: "09:00",
        trim: true,
      },
      end: {
        type: String,
        default: "17:30",
        trim: true,
      },
    },
    slotIntervalMinutes: {
      type: Number,
      default: 30,
      enum: [15, 20, 30, 60],
    },
    bufferMinutes: {
      type: Number,
      default: 0,
      enum: [0, 5, 10, 15, 20, 30],
    },
    workingDays: {
      type: [String],
      default: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      enum: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    },
    unavailableDates: {
      type: [String],
      default: [],
    },
    notificationPreferences: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      reminder24h: {
        type: Boolean,
        default: true,
      },
      reminder1h: {
        type: Boolean,
        default: true,
      },
    },
    readNotificationIds: {
      type: [String],
      default: [],
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: Date,
      default: null,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
