import dotenv from "dotenv";

dotenv.config();

import crypto from "crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";

import user from "../Modals/auth.js";
import subscription from "../Modals/subscription.js";
import transaction from "../Modals/transaction.js";

import subscriptionPlans from "../config/subscriptionPlans.js";

import sendSubscriptionEmail from "../utils/sendSubscriptionEmail.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const calculateExpiryDate = (
  startDate,
  billingCycle
) => {
  const expiryDate = new Date(startDate);

  if (billingCycle === "monthly") {
    expiryDate.setDate(
      expiryDate.getDate() + 30
    );
  }

  if (billingCycle === "quarterly") {
    expiryDate.setDate(
      expiryDate.getDate() + 90
    );
  }

  if (billingCycle === "yearly") {
    expiryDate.setDate(
      expiryDate.getDate() + 365
    );
  }

  return expiryDate;
};

const validateBillingCycle = (
  billingCycle
) => {
  return [
    "monthly",
    "quarterly",
    "yearly",
  ].includes(billingCycle);
};

const generateInvoiceNumber = () => {
  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `INV-${timestamp}-${random}`;
};

/*
  CREATE RAZORPAY ORDER
*/
export const createPaymentOrder =
  async (req, res) => {
    const {
      userid,
      plan,
      billingCycle,
    } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(
        userid
      )
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (
      !plan ||
      !subscriptionPlans[plan]
    ) {
      return res.status(400).json({
        message:
          "Invalid subscription plan.",
      });
    }

    if (plan === "free") {
      return res.status(400).json({
        message:
          "Free plan does not require payment.",
      });
    }

    if (
      !billingCycle ||
      !validateBillingCycle(
        billingCycle
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid billing cycle.",
      });
    }

    try {
      const existingUser =
        await user.findById(userid);

      if (!existingUser) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const selectedPlan =
        subscriptionPlans[plan];

      const amount =
        selectedPlan.price[
          billingCycle
        ];

      if (!amount || amount <= 0) {
        return res.status(400).json({
          message:
            "Invalid payment amount.",
        });
      }

      const amountInPaise =
        Math.round(amount * 100);

      const receipt =
        `sub_${Date.now()}_${userid
          .toString()
          .slice(-6)}`;

      const order =
        await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt,

          notes: {
            userid:
              userid.toString(),

            plan,

            billingCycle,
          },
        });

      const newTransaction =
        await transaction.create({
          userid,

          plan,

          billingCycle,

          paymentId: "",

          orderId: order.id,

          signature: "",

          invoiceNumber: "",

          amount,

          currency: "INR",

          status: "created",

          subscriptionStartDate:
            null,

          subscriptionExpiryDate:
            null,

          renewalDate: null,

          failureReason: "",
        });

      return res.status(200).json({
        success: true,

        message:
          "Razorpay order created successfully.",

        order: {
          id: order.id,

          amount:
            order.amount,

          currency:
            order.currency,

          receipt:
            order.receipt,
        },

        transactionId:
          newTransaction._id,

        keyId:
          process.env
            .RAZORPAY_KEY_ID,

        plan: {
          id: plan,

          name:
            selectedPlan.name,

          billingCycle,

          amount,

          currency: "INR",

          validityDays:
            selectedPlan.validity[
              billingCycle
            ],
        },
      });
    } catch (error) {
      console.error(
        "CREATE PAYMENT ORDER ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to create Razorpay payment order.",
      });
    }
  };

/*
  VERIFY RAZORPAY PAYMENT
*/
export const verifyPayment =
  async (req, res) => {
    const {
      userid,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(
        userid
      )
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message:
          "Payment verification details are incomplete.",
      });
    }

    try {
      /*
        Find the transaction created
        during order creation.
      */
      const existingTransaction =
        await transaction.findOne({
          userid,

          orderId:
            razorpay_order_id,
        });

      if (!existingTransaction) {
        return res.status(404).json({
          message:
            "Payment order was not found.",
        });
      }

      /*
        Duplicate verification protection.
      */
      if (
        existingTransaction.status ===
          "paid" &&
        existingTransaction.paymentId ===
          razorpay_payment_id
      ) {
        return res.status(200).json({
          success: true,

          alreadyProcessed: true,

          message:
            "This payment has already been processed successfully.",

          paymentId:
            razorpay_payment_id,

          orderId:
            razorpay_order_id,

          invoiceNumber:
            existingTransaction.invoiceNumber,
        });
      }

      /*
        Prevent same payment ID
        from being used again.
      */
      const duplicatePayment =
        await transaction.findOne({
          paymentId:
            razorpay_payment_id,

          status: "paid",
        });

      if (duplicatePayment) {
        return res.status(409).json({
          message:
            "This payment has already been used.",
        });
      }

      /*
        Razorpay signature verification.
      */
      const generatedSignature =
        crypto
          .createHmac(
            "sha256",

            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest("hex");

      if (
        generatedSignature !==
        razorpay_signature
      ) {
        existingTransaction.status =
          "failed";

        existingTransaction.failureReason =
          "Payment signature verification failed.";

        await existingTransaction.save();

        return res.status(400).json({
          message:
            "Payment verification failed. Invalid signature.",
        });
      }

      /*
        Find user.
      */
      const existingUser =
        await user.findById(userid);

      if (!existingUser) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      /*
        Get plan information from
        the transaction created by
        our backend.
      */
      const plan =
        existingTransaction.plan;

      const billingCycle =
        existingTransaction.billingCycle;

      const selectedPlan =
        subscriptionPlans[plan];

      if (!selectedPlan) {
        return res.status(400).json({
          message:
            "Subscription plan associated with this payment is invalid.",
        });
      }

      /*
        Server-side amount validation.
      */
      const expectedAmount =
        selectedPlan.price[
          billingCycle
        ];

      if (
        existingTransaction.amount !==
        expectedAmount
      ) {
        existingTransaction.status =
          "failed";

        existingTransaction.failureReason =
          "Payment amount mismatch.";

        await existingTransaction.save();

        return res.status(400).json({
          message:
            "Payment amount verification failed.",
        });
      }

      /*
        Fetch the Razorpay order
        directly from Razorpay and
        verify amount/currency.
      */
      const razorpayOrder =
        await razorpay.orders.fetch(
          razorpay_order_id
        );

      if (
        !razorpayOrder ||
        razorpayOrder.amount !==
          expectedAmount * 100 ||
        razorpayOrder.currency !==
          "INR"
      ) {
        existingTransaction.status =
          "failed";

        existingTransaction.failureReason =
          "Razorpay order amount or currency mismatch.";

        await existingTransaction.save();

        return res.status(400).json({
          message:
            "Razorpay order verification failed.",
        });
      }

      /*
        Calculate subscription dates.
      */
      const startDate =
        new Date();

      const expiryDate =
        calculateExpiryDate(
          startDate,

          billingCycle
        );

      const invoiceNumber =
        generateInvoiceNumber();

      /*
        Create subscription only
        after successful payment
        verification.
      */
      const newSubscription =
        await subscription.create({
          userid,

          plan,

          planName:
            selectedPlan.name,

          billingCycle,

          amount:
            expectedAmount,

          currency: "INR",

          status: "active",

          startDate,

          expiryDate,

          nextRenewalDate:
            expiryDate,

          autoRenew: true,

          cancelledAt: null,

          paymentId:
            razorpay_payment_id,

          orderId:
            razorpay_order_id,

          invoiceNumber,
        });

      /*
        Update transaction.
      */
      existingTransaction.paymentId =
        razorpay_payment_id;

      existingTransaction.orderId =
        razorpay_order_id;

      existingTransaction.signature =
        razorpay_signature;

      existingTransaction.invoiceNumber =
        invoiceNumber;

      existingTransaction.status =
        "paid";

      existingTransaction.subscriptionid =
        newSubscription._id;

      existingTransaction.subscriptionStartDate =
        startDate;

      existingTransaction.subscriptionExpiryDate =
        expiryDate;

      existingTransaction.renewalDate =
        expiryDate;

      existingTransaction.failureReason =
        "";

      await existingTransaction.save();

      /*
        Activate subscription for user.
      */
      existingUser.subscriptionPlan =
        plan;

      existingUser.subscriptionStatus =
        "active";

      existingUser.subscriptionBillingCycle =
        billingCycle;

      existingUser.subscriptionStartDate =
        startDate;

      existingUser.subscriptionExpiryDate =
        expiryDate;

      existingUser.nextRenewalDate =
        expiryDate;

      existingUser.autoRenew = true;

      existingUser.subscriptionCancelledAt =
        null;

      existingUser.currentSubscriptionId =
        newSubscription._id;

      await existingUser.save();

      /*
        Send confirmation email.

        Email failure should NOT undo
        an already verified payment.
      */
      try {
        await sendSubscriptionEmail({
          email:
            existingUser.email,

          name:
            existingUser.name,

          planName:
            selectedPlan.name,

          billingCycle,

          amount:
            expectedAmount,

          currency: "INR",

          paymentId:
            razorpay_payment_id,

          orderId:
            razorpay_order_id,

          invoiceNumber,

          startDate,

          expiryDate,
        });
      } catch (emailError) {
        console.error(
          "SUBSCRIPTION EMAIL ERROR:",
          emailError
        );
      }

      /*
        Final success response.
      */
      return res.status(200).json({
        success: true,

        message:
          "Payment verified successfully and subscription activated.",

        subscription: {
          id:
            newSubscription._id,

          plan,

          planName:
            selectedPlan.name,

          billingCycle,

          amount:
            expectedAmount,

          currency: "INR",

          startDate,

          expiryDate,

          nextRenewalDate:
            expiryDate,

          status: "active",
        },

        transaction: {
          id:
            existingTransaction._id,

          paymentId:
            razorpay_payment_id,

          orderId:
            razorpay_order_id,

          invoiceNumber,
        },

        emailSent:
          Boolean(
            process.env.GMAIL_USER &&
            process.env
              .GMAIL_APP_PASSWORD
          ),
      });
    } catch (error) {
      console.error(
        "VERIFY PAYMENT ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while verifying the payment.",
      });
    }
  };

/*
  MARK PAYMENT FAILED / CANCELLED
*/
export const markPaymentFailed =
  async (req, res) => {
    const {
      userid,
      razorpay_order_id,
      reason,
    } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(
        userid
      )
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (!razorpay_order_id) {
      return res.status(400).json({
        message:
          "Razorpay order ID is required.",
      });
    }

    try {
      const existingTransaction =
        await transaction.findOne({
          userid,

          orderId:
            razorpay_order_id,
        });

      if (!existingTransaction) {
        return res.status(404).json({
          message:
            "Payment transaction not found.",
        });
      }

      /*
        Never overwrite a successful
        payment as failed.
      */
      if (
        existingTransaction.status ===
        "paid"
      ) {
        return res.status(200).json({
          success: true,

          message:
            "Payment was already completed successfully.",
        });
      }

      existingTransaction.status =
        "failed";

      existingTransaction.failureReason =
        reason ||
        "Payment was cancelled or failed.";

      await existingTransaction.save();

      return res.status(200).json({
        success: true,

        message:
          "Payment failure has been recorded.",
      });
    } catch (error) {
      console.error(
        "MARK PAYMENT FAILED ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to update payment status.",
      });
    }
  };