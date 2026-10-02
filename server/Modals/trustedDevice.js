import mongoose from "mongoose";

const trustedDeviceSchema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    deviceHash: {
      type: String,
      required: true,
      index: true,
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

    ipAddress: {
      type: String,
      default: "",
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

    trustedAt: {
      type: Date,
      default: Date.now,
    },

    trustedUntil: {
      type: Date,
      required: true,
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

trustedDeviceSchema.index({
  userid: 1,
  deviceHash: 1,
});

export default (
  mongoose.models.trustedDevice ||
  mongoose.model("trustedDevice", trustedDeviceSchema)
);