import mongoose from "mongoose";

const loginHistorySchema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    loginTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    browserName: {
      type: String,
      default: "Unknown",
    },

    browserVersion: {
      type: String,
      default: "",
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
    },

    deviceType: {
      type: String,
      enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
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

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    locationSource: {
      type: String,
      default: "IP",
    },

    // DAY 3 SECURITY FIELDS

    loginStatus: {
      type: String,
      enum: [
        "success",
        "pending_otp",
        "failed",
      ],
      default: "success",
    },

    verificationStatus: {
      type: String,
      enum: [
        "not_required",
        "required",
        "verified",
        "failed",
      ],
      default: "not_required",
    },

    otpRequired: {
      type: Boolean,
      default: false,
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
    },

    isNewBrowser: {
      type: Boolean,
      default: false,
    },

    isNewDevice: {
      type: Boolean,
      default: false,
    },

    isNewIp: {
      type: Boolean,
      default: false,
    },

    isNewLocation: {
      type: Boolean,
      default: false,
    },

    trustedDevice: {
      type: Boolean,
      default: false,
    },

    trustedUntil: {
      type: Date,
      default: null,
    },

    otpVerificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "otpVerification",
      default: null,
    },

    deviceHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default (
  mongoose.models.loginHistory ||
  mongoose.model("loginHistory", loginHistorySchema)
);