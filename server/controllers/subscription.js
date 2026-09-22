import mongoose from "mongoose";

import user from "../Modals/auth.js";
import subscription from "../Modals/subscription.js";

import subscriptionPlans from "../config/subscriptionPlans.js";

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

const checkSubscriptionExpiry = async (
  existingUser
) => {
  if (
    existingUser.subscriptionExpiryDate &&
    new Date() >
      new Date(
        existingUser.subscriptionExpiryDate
      )
  ) {
    existingUser.subscriptionPlan = "free";

    existingUser.subscriptionStatus = "expired";

    existingUser.subscriptionBillingCycle =
      "monthly";

    existingUser.subscriptionStartDate = null;

    existingUser.subscriptionExpiryDate = null;

    existingUser.nextRenewalDate = null;

    existingUser.autoRenew = false;

    existingUser.subscriptionCancelledAt =
      null;

    existingUser.currentSubscriptionId = null;

    await existingUser.save();

    return true;
  }

  return false;
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

export const getPlans = async (
  req,
  res
) => {
  try {
    return res.status(200).json({
      success: true,
      plans: subscriptionPlans,
    });
  } catch (error) {
    console.error(
      "GET PLANS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Something went wrong while loading subscription plans.",
    });
  }
};

export const getMySubscription =
  async (req, res) => {
    const { userid } = req.params;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(userid)
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
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

      await checkSubscriptionExpiry(
        existingUser
      );

      const currentPlan =
        existingUser.subscriptionPlan ||
        "free";

      const currentStatus =
        existingUser.subscriptionStatus ||
        "active";

      const billingCycle =
        existingUser.subscriptionBillingCycle ||
        "monthly";

      const planDetails =
        subscriptionPlans[currentPlan];

      const now = new Date();

      let remainingDays = 0;

      if (
        existingUser.subscriptionExpiryDate
      ) {
        const difference =
          new Date(
            existingUser.subscriptionExpiryDate
          ).getTime() - now.getTime();

        remainingDays = Math.max(
          0,
          Math.ceil(
            difference /
              (1000 * 60 * 60 * 24)
          )
        );
      }

      return res.status(200).json({
        success: true,

        subscription: {
          plan: currentPlan,

          planName: planDetails.name,

          status: currentStatus,

          billingCycle,

          amount:
            planDetails.price[
              billingCycle
            ],

          currency: "INR",

          startDate:
            existingUser.subscriptionStartDate,

          expiryDate:
            existingUser.subscriptionExpiryDate,

          nextRenewalDate:
            existingUser.nextRenewalDate,

          remainingDays,

          autoRenew:
            existingUser.autoRenew,

          cancelledAt:
            existingUser.subscriptionCancelledAt,

          dailyDownloadLimit:
            planDetails.dailyDownloadLimit,

          monthlyDownloadLimit:
            planDetails.monthlyDownloadLimit,

          maxStreamingQuality:
            planDetails.maxStreamingQuality,

          maxWatchMinutesPerDay:
            planDetails.maxWatchMinutesPerDay,

          unlimitedVideoAccess:
            planDetails.unlimitedVideoAccess,

          offlineDownloads:
            planDetails.offlineDownloads,

          priorityContent:
            planDetails.priorityContent,

          fasterStreaming:
            planDetails.fasterStreaming,

          exclusiveCourses:
            planDetails.exclusiveCourses,

          adFree:
            planDetails.adFree,

          premiumVideoAccess:
            planDetails.premiumVideoAccess,

          features:
            planDetails.features,
        },
      });
    } catch (error) {
      console.error(
        "GET MY SUBSCRIPTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading your subscription.",
      });
    }
  };

export const getSubscriptionHistory =
  async (req, res) => {
    const { userid } = req.params;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(userid)
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
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

      const history =
        await subscription
          .find({ userid })
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        subscriptions: history,
      });
    } catch (error) {
      console.error(
        "GET SUBSCRIPTION HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading subscription history.",
      });
    }
  };

export const getPlanDetails =
  async (req, res) => {
    const { plan } = req.params;

    if (
      !plan ||
      !subscriptionPlans[plan]
    ) {
      return res.status(404).json({
        message:
          "Subscription plan not found.",
      });
    }

    return res.status(200).json({
      success: true,

      plan: {
        id: plan,

        ...subscriptionPlans[plan],
      },
    });
  };

export const initializeFreeSubscription =
  async (req, res) => {
    const { userid } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(userid)
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
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

      existingUser.subscriptionPlan = "free";

      existingUser.subscriptionStatus =
        "active";

      existingUser.subscriptionBillingCycle =
        "monthly";

      existingUser.subscriptionStartDate =
        null;

      existingUser.subscriptionExpiryDate =
        null;

      existingUser.nextRenewalDate = null;

      existingUser.autoRenew = false;

      existingUser.subscriptionCancelledAt =
        null;

      existingUser.currentSubscriptionId =
        null;

      await existingUser.save();

      return res.status(200).json({
        success: true,

        message:
          "Free subscription is active.",

        subscription: {
          plan: "free",
          planName: "Free",
          status: "active",
        },
      });
    } catch (error) {
      console.error(
        "INITIALIZE FREE SUBSCRIPTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while activating the free plan.",
      });
    }
  };

/*
  DAY 2:
  Cancel current subscription.

  Important:
  We do NOT immediately remove the paid plan.
  The current plan remains active until its
  expiry date. Auto-renew is simply disabled.
*/

export const cancelSubscription =
  async (req, res) => {
    const { userid } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(userid)
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
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

      await checkSubscriptionExpiry(
        existingUser
      );

      if (
        existingUser.subscriptionPlan ===
        "free"
      ) {
        return res.status(400).json({
          message:
            "Free plan cannot be cancelled.",
        });
      }

      existingUser.autoRenew = false;

      existingUser.subscriptionCancelledAt =
        new Date();

      await existingUser.save();

      return res.status(200).json({
        success: true,

        message:
          "Subscription auto-renewal has been cancelled. Your current plan remains active until its expiry date.",

        subscription: {
          plan:
            existingUser.subscriptionPlan,

          status:
            existingUser.subscriptionStatus,

          expiryDate:
            existingUser.subscriptionExpiryDate,

          autoRenew:
            existingUser.autoRenew,

          cancelledAt:
            existingUser.subscriptionCancelledAt,
        },
      });
    } catch (error) {
      console.error(
        "CANCEL SUBSCRIPTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while cancelling the subscription.",
      });
    }
  };

/*
  DAY 2:
  Re-enable auto renewal.

  Actual payment/renewal will be handled
  through Razorpay on Day 3.
*/

export const renewSubscription =
  async (req, res) => {
    const { userid } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(userid)
    ) {
      return res.status(400).json({
        message: "Invalid user ID.",
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

      await checkSubscriptionExpiry(
        existingUser
      );

      if (
        existingUser.subscriptionPlan ===
        "free"
      ) {
        return res.status(400).json({
          message:
            "Please select a paid plan before renewing.",
        });
      }

      existingUser.autoRenew = true;

      existingUser.subscriptionCancelledAt =
        null;

      existingUser.subscriptionStatus =
        "active";

      await existingUser.save();

      return res.status(200).json({
        success: true,

        message:
          "Renewal preference restored. Payment will be processed through Razorpay.",

        subscription: {
          plan:
            existingUser.subscriptionPlan,

          status:
            existingUser.subscriptionStatus,

          autoRenew:
            existingUser.autoRenew,

          expiryDate:
            existingUser.subscriptionExpiryDate,
        },
      });
    } catch (error) {
      console.error(
        "RENEW SUBSCRIPTION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while preparing subscription renewal.",
      });
    }
  };

/*
  DAY 2:
  Select a plan/billing cycle.

  This does NOT activate a paid plan.
  It only validates the requested selection.

  Actual activation happens only after
  successful Razorpay verification on Day 3.
*/

export const prepareSubscriptionChange =
  async (req, res) => {
    const {
      userid,
      plan,
      billingCycle,
    } = req.body;

    if (
      !userid ||
      !mongoose.Types.ObjectId.isValid(userid)
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

      return res.status(200).json({
        success: true,

        message:
          "Subscription selection validated. Payment will be required to activate the selected paid plan.",

        selection: {
          plan,
          planName:
            selectedPlan.name,
          billingCycle,
          amount,
          currency: "INR",
          validityDays:
            selectedPlan.validity[
              billingCycle
            ],
          features:
            selectedPlan.features,
        },
      });
    } catch (error) {
      console.error(
        "PREPARE SUBSCRIPTION CHANGE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while preparing the subscription change.",
      });
    }
  };

export {
  calculateExpiryDate,
};