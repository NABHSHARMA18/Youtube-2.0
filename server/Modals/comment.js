import mongoose from "mongoose";

const commentschema = mongoose.Schema(
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

    commentbody: {
      type: String,
    },

    usercommented: {
      type: String,
    },

    edited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    commentedon: {
      type: Date,
      default: Date.now,
    },

    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    dislikes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    // NEW: comment language
    language: {
      type: String,
      default: "en",
    },
  },
  { timestamps: true }
);

export default mongoose.model("comment", commentschema);