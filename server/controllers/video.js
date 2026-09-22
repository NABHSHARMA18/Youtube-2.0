import mongoose from "mongoose";

import video from "../Modals/video.js";
import user from "../Modals/auth.js";

import subscriptionPlans from "../config/subscriptionPlans.js";

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
    existingUser.subscriptionPlan =
      "free";

    existingUser.subscriptionStatus =
      "expired";

    existingUser.subscriptionBillingCycle =
      "monthly";

    existingUser.subscriptionStartDate =
      null;

    existingUser.subscriptionExpiryDate =
      null;

    existingUser.nextRenewalDate =
      null;

    existingUser.autoRenew = false;

    existingUser.subscriptionCancelledAt =
      null;

    existingUser.currentSubscriptionId =
      null;

    await existingUser.save();

    return true;
  }

  return false;
};

export const uploadvideo = async (
  req,
  res
) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({
        message:
          "plz upload a mp4 video file only",
      });
  }

  try {
    const isPremium =
      req.body.isPremium === true ||
      req.body.isPremium === "true";

    const file = new video({
      videotitle:
        req.body.videotitle,

      filename:
        req.file.originalname,

      filepath:
        req.file.path,

      filetype:
        req.file.mimetype,

      filesize:
        req.file.size,

      videochanel:
        req.body.videochanel,

      uploader:
        req.body.uploader,

      isPremium,
    });

    await file.save();

    return res
      .status(201)
      .json({
        message:
          "file uploaded successfully",

        video: {
          id: file._id,
          title: file.videotitle,
          isPremium:
            file.isPremium,
        },
      });
  } catch (error) {
    console.error(
      "UPLOAD VIDEO ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Something went wrong",
      });
  }
};

export const getallvideo = async (
  req,
  res
) => {
  try {
    const files =
      await video.find();

    return res
      .status(200)
      .send(files);
  } catch (error) {
    console.error(
      "GET ALL VIDEO ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Something went wrong",
      });
  }
};

/*
  Day 4:
  Secure video playback endpoint.

  Free users cannot access premium videos.
  Bronze/Silver/Gold users can access premium videos.
*/
export const playvideo = async (
  req,
  res
) => {
  const { videoid } = req.params;
  const { email } = req.query;

  if (
    !videoid ||
    !mongoose.Types.ObjectId.isValid(
      videoid
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          "Invalid video ID.",
      });
  }

  try {
    const existingVideo =
      await video.findById(videoid);

    if (!existingVideo) {
      return res
        .status(404)
        .json({
          message:
            "Video not found.",
        });
    }

    /*
      Normal videos are available
      to everyone.
    */
    if (!existingVideo.isPremium) {
      return res.status(200).json({
        success: true,
        accessGranted: true,

        video: {
          _id:
            existingVideo._id,

          videotitle:
            existingVideo.videotitle,

          filepath:
            existingVideo.filepath,

          filetype:
            existingVideo.filetype,

          isPremium: false,
        },
      });
    }

    /*
      Premium video requires
      logged-in user.
    */
    if (!email) {
      return res
        .status(401)
        .json({
          accessGranted: false,
          message:
            "Please sign in to watch this premium video.",
        });
    }

    const existingUser =
      await user.findOne({
        email,
      });

    if (!existingUser) {
      return res
        .status(404)
        .json({
          accessGranted: false,
          message:
            "User account not found.",
        });
    }

    /*
      Automatically downgrade
      expired subscriptions.
    */
    await checkSubscriptionExpiry(
      existingUser
    );

    const currentPlan =
      existingUser.subscriptionPlan ||
      "free";

    const currentStatus =
      existingUser.subscriptionStatus ||
      "active";

    const planDetails =
      subscriptionPlans[
        currentPlan
      ];

    if (!planDetails) {
      return res
        .status(403)
        .json({
          accessGranted: false,
          message:
            "Invalid subscription plan.",
        });
    }

    /*
      Only paid active plans
      can access premium videos.
    */
    if (
      currentPlan === "free" ||
      currentStatus !== "active" ||
      !planDetails.premiumVideoAccess
    ) {
      return res
        .status(403)
        .json({
          accessGranted: false,

          message:
            "This is a premium video. Please subscribe to a paid plan to watch it.",

          requiredPlan:
            "bronze",

          currentPlan,
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        accessGranted: true,

        message:
          "Premium video access granted.",

        subscription: {
          plan:
            currentPlan,

          status:
            currentStatus,

          expiryDate:
            existingUser.subscriptionExpiryDate,
        },

        video: {
          _id:
            existingVideo._id,

          videotitle:
            existingVideo.videotitle,

          filepath:
            existingVideo.filepath,

          filetype:
            existingVideo.filetype,

          isPremium: true,
        },
      });
  } catch (error) {
    console.error(
      "PLAY VIDEO ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        accessGranted: false,
        message:
          "Something went wrong while checking video access.",
      });
  }
};