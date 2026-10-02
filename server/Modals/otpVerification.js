import mongoose from "mongoose";

const otpVerificationSchema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "verified",
        "expired",
        "failed",
        "cancelled",
      ],
      default: "pending",
    },

    purpose: {
      type: String,
      default: "login",
    },

    loginHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "loginHistory",
      default: null,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    browserName: {
      type: String,
      default: "Unknown",
    },

    deviceType: {
      type: String,
      default: "Unknown",
    },

    deviceModel: {
      type: String,
      default: "Unknown",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default (
  mongoose.models.otpVerification ||
  mongoose.model("otpVerification", otpVerificationSchema)
);