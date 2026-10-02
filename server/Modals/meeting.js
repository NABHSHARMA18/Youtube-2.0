import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      default: "Guest",
      trim: true,
    },

    role: {
      type: String,
      enum: ["host", "cohost", "participant"],
      default: "participant",
    },

    trusted: {
      type: Boolean,
      default: false,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const meetingSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    hostEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    hostName: {
      type: String,
      default: "Host",
    },

    title: {
      type: String,
      default: "Video Meeting",
      trim: true,
    },

    locked: {
      type: Boolean,
      default: false,
    },

    maxParticipants: {
      type: Number,
      default: 6,
      min: 2,
      max: 12,
    },

    chatEnabled: {
      type: Boolean,
      default: true,
    },

    screenShareEnabled: {
      type: Boolean,
      default: true,
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;