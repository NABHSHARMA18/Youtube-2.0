import mongoose from "mongoose";

const videochema = mongoose.Schema(
  {
    videotitle: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    filepath: {
      type: String,
      required: true,
    },

    filetype: {
      type: String,
      required: true,
    },

    filesize: {
      type: Number,
      required: true,
    },

    videochanel: {
      type: String,
      required: true,
    },

    Like: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    uploader: {
      type: String,
    },

    // Day 4: Premium video protection
    isPremium: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default
  mongoose.models.videofiles ||
  mongoose.model("videofiles", videochema);