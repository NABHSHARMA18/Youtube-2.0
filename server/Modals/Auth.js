import mongoose from "mongoose";

const userschema = mongoose.Schema(
  {
    // ==============================
    // BASIC USER INFORMATION
    // ==============================

    email: {
      type: String,
      required: true,
    },

    name: {
      type: String,
    },

    channelname: {
      type: String,
    },

    description: {
      type: String,
    },

    image: {
      type: String,
    },

    location: {
      type: String,
      default: "",
    },

    joinedon: {
      type: Date,
      default: Date.now,
    },


    // ==============================
    // SUBSCRIPTION INFORMATION
    // ==============================

    subscriptionPlan: {
      type: String,
      enum: [
        "free",
        "bronze",
        "silver",
        "gold",
      ],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: [
        "active",
        "expired",
        "cancelled",
        "pending",
      ],
      default: "active",
    },

    subscriptionBillingCycle: {
      type: String,
      enum: [
        "monthly",
        "quarterly",
        "yearly",
      ],
      default: "monthly",
    },

    subscriptionStartDate: {
      type: Date,
      default: null,
    },

    subscriptionExpiryDate: {
      type: Date,
      default: null,
    },

    nextRenewalDate: {
      type: Date,
      default: null,
    },

    autoRenew: {
      type: Boolean,
      default: true,
    },

    subscriptionCancelledAt: {
      type: Date,
      default: null,
    },

    currentSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subscription",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default
  mongoose.models.user ||
  mongoose.model(
    "user",
    userschema
  );
