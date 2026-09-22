import mongoose from "mongoose";

const downloadschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },

    downloadAt: {
      type: Date,
      default: Date.now,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    device: {
      type: String,
      default: "",
    },

    browser: {
      type: String,
      default: "",
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["started", "completed", "failed"],
      default: "started",
    },

    errorMessage: {
      type: String,
      default: "",
    },

    downloadKey: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.download ||
  mongoose.model("download", downloadschema);