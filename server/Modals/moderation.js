import mongoose from "mongoose";

const moderationschema = mongoose.Schema(
  {
    commentid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
    },

    adminid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    action: {
      type: String,
      enum: ["approved", "dismissed", "removed"],
      required: true,
    },

    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "moderation",
  moderationschema
);