import mongoose from "mongoose";

const watchProgressSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Video",
    },

    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

watchProgressSchema.index(
  {
    email: 1,
    videoId: 1,
  },
  {
    unique: true,
  }
);

const WatchProgress = mongoose.model(
  "WatchProgress",
  watchProgressSchema
);

export default WatchProgress;