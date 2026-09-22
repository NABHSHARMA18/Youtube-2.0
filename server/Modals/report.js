import mongoose from "mongoose";

const reportschema = mongoose.Schema(
  {
    commentid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
    },

    reportedby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    reason: {
      type: String,
      enum: ["spam", "harassment", "offensive"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "removed"],
      default: "pending",
    },

    adminNote: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Same user cannot report the same comment twice
reportschema.index(
  { commentid: 1, reportedby: 1 },
  { unique: true }
);

export default mongoose.model("report", reportschema);