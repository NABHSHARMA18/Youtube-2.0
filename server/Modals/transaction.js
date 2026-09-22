import mongoose from "mongoose";

const transactionschema =
  mongoose.Schema(
    {
      userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },

      subscriptionid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subscription",
        default: null,
      },

      plan: {
        type: String,
        enum: [
          "free",
          "bronze",
          "silver",
          "gold",
        ],
        required: true,
      },

      billingCycle: {
        type: String,
        enum: [
          "monthly",
          "quarterly",
          "yearly",
        ],
        required: true,
      },

      paymentId: {
        type: String,
        default: "",
      },

      orderId: {
        type: String,
        default: "",
      },

      signature: {
        type: String,
        default: "",
      },

      invoiceNumber: {
        type: String,
        default: "",
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

      status: {
        type: String,
        enum: [
          "created",
          "pending",
          "paid",
          "failed",
          "cancelled",
          "refunded",
        ],
        default: "created",
      },

      subscriptionStartDate: {
        type: Date,
        default: null,
      },

      subscriptionExpiryDate: {
        type: Date,
        default: null,
      },

      renewalDate: {
        type: Date,
        default: null,
      },

      failureReason: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.transaction ||
  mongoose.model(
    "transaction",
    transactionschema
  );