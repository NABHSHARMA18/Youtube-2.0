import mongoose from "mongoose";

const subscriptionschema =
  mongoose.Schema(
    {
      // ==============================
      // USER
      // ==============================

      userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },


      // ==============================
      // PLAN
      // ==============================

      plan: {
        type: String,
        enum: [
          "free",
          "bronze",
          "silver",
          "gold",
        ],
        required: true,
        default: "free",
      },

      planName: {
        type: String,
        required: true,
      },


      // ==============================
      // BILLING
      // ==============================

      billingCycle: {
        type: String,
        enum: [
          "monthly",
          "quarterly",
          "yearly",
        ],
        required: true,
        default: "monthly",
      },

      amount: {
        type: Number,
        required: true,
        default: 0,
      },

      currency: {
        type: String,
        default: "INR",
      },


      // ==============================
      // STATUS
      // ==============================

      status: {
        type: String,
        enum: [
          "active",
          "expired",
          "cancelled",
          "pending",
        ],
        default: "active",
      },


      // ==============================
      // VALIDITY
      // ==============================

      startDate: {
        type: Date,
        default: null,
      },

      expiryDate: {
        type: Date,
        default: null,
      },

      nextRenewalDate: {
        type: Date,
        default: null,
      },


      // ==============================
      // RENEWAL
      // ==============================

      autoRenew: {
        type: Boolean,
        default: true,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },


      // ==============================
      // PAYMENT REFERENCES
      // ==============================

      paymentId: {
        type: String,
        default: "",
      },

      orderId: {
        type: String,
        default: "",
      },

      invoiceNumber: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.subscription ||
  mongoose.model(
    "subscription",
    subscriptionschema
  );