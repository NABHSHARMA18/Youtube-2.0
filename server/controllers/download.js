import mongoose from "mongoose";
import path from "path";
import fs from "fs";

import download from "../Modals/download.js";
import video from "../Modals/video.js";
import user from "../Modals/auth.js";
import subscriptionPlans from "../config/subscriptionPlans.js";

const getStartOfDay = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
};

const getStartOfMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
};

const getTodayKey = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getBrowser = (userAgent = "") => {
  if (userAgent.includes("Edg")) {
    return "Edge";
  }

  if (userAgent.includes("OPR")) {
    return "Opera";
  }

  if (userAgent.includes("Chrome")) {
    return "Chrome";
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox";
  }

  if (userAgent.includes("Safari")) {
    return "Safari";
  }

  return "Unknown";
};

const getDevice = (userAgent = "") => {
  if (/tablet|ipad/i.test(userAgent)) {
    return "Tablet";
  }

  if (/mobile/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
};


// ==========================================
// DOWNLOAD VIDEO
// ==========================================

export const downloadVideo = async (req, res) => {
  const { userid, videoid } = req.body;

  try {
    // --------------------------------------
    // USER CHECK
    // --------------------------------------

    const existingUser =
      await user.findById(userid);

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // --------------------------------------
    // VIDEO CHECK
    // --------------------------------------

    const existingVideo =
      await video.findById(videoid);

    if (!existingVideo) {
      return res.status(404).json({
        message: "Video not found.",
      });
    }

    // --------------------------------------
    // VIDEO FILE ACCESS CHECK
    // --------------------------------------

    const videoPath = path.resolve(
      existingVideo.filepath
    );

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        message:
          "Video file is not available.",
      });
    }

    // --------------------------------------
    // SUBSCRIPTION CHECK
    // --------------------------------------

    let currentPlan =
      existingUser.subscriptionPlan ||
      "free";

    let currentStatus =
      existingUser.subscriptionStatus ||
      "active";

    // --------------------------------------
    // SUBSCRIPTION EXPIRY CHECK
    // --------------------------------------

    if (
      existingUser.subscriptionExpiryDate &&
      new Date() >
        new Date(
          existingUser.subscriptionExpiryDate
        )
    ) {
      currentPlan = "free";
      currentStatus = "expired";

      existingUser.subscriptionPlan =
        "free";

      existingUser.subscriptionStatus =
        "expired";

      await existingUser.save();

      return res.status(403).json({
        message:
          "Your subscription has expired. Please renew your subscription to continue downloading.",
      });
    }

    // --------------------------------------
    // ACTIVE SUBSCRIPTION CHECK
    // --------------------------------------

    if (
      currentStatus !== "active" ||
      !subscriptionPlans[currentPlan]
    ) {
      return res.status(403).json({
        message:
          "You do not have an active subscription.",
      });
    }

    const plan =
      subscriptionPlans[currentPlan];

    // --------------------------------------
    // TODAY'S DOWNLOAD COUNT
    // --------------------------------------

    const todayDownloads =
      await download.countDocuments({
        userid,
        status: "completed",
        downloadAt: {
          $gte: getStartOfDay(),
        },
      });

    // --------------------------------------
    // DAILY LIMIT CHECK
    // --------------------------------------

    if (
      todayDownloads >=
      plan.dailyDownloadLimit
    ) {
      return res.status(403).json({
        message:
          `Daily download limit reached. Your ${plan.name} plan allows ${plan.dailyDownloadLimit} download(s) per day.`,
      });
    }

    // --------------------------------------
    // MONTHLY DOWNLOAD COUNT
    // --------------------------------------

    const monthlyDownloads =
      await download.countDocuments({
        userid,
        status: "completed",
        downloadAt: {
          $gte: getStartOfMonth(),
        },
      });

    // --------------------------------------
    // MONTHLY LIMIT CHECK
    // --------------------------------------

    if (
      monthlyDownloads >=
      plan.monthlyDownloadLimit
    ) {
      return res.status(403).json({
        message:
          `Monthly download limit reached. Your ${plan.name} plan allows ${plan.monthlyDownloadLimit} download(s) per month.`,
      });
    }

    // --------------------------------------
    // DUPLICATE DOWNLOAD CHECK
    // --------------------------------------

    const today = getTodayKey();

    const downloadKey =
      `${userid}_${videoid}_${today}`;

    const existingDownload =
      await download.findOne({
        downloadKey,
      });

    if (existingDownload) {
      return res.status(409).json({
        message:
          "You have already downloaded this video today or a download is already in progress.",
      });
    }

    // --------------------------------------
    // USER DEVICE INFORMATION
    // --------------------------------------

    const userAgent =
      req.headers["user-agent"] || "";

    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "";

    const device =
      getDevice(userAgent);

    const browser =
      getBrowser(userAgent);

    // --------------------------------------
    // CREATE DOWNLOAD RECORD
    // --------------------------------------

    const downloadRecord =
      await download.create({
        userid,
        videoid,
        ipAddress,
        device,
        browser,
        subscriptionPlan:
          currentPlan,
        fileSize:
          existingVideo.filesize || 0,
        status: "started",
        downloadKey,
      });

    // --------------------------------------
    // REMAINING QUOTA
    // --------------------------------------

    const remainingDaily =
      Math.max(
        0,
        plan.dailyDownloadLimit -
          (todayDownloads + 1)
      );

    const remainingMonthly =
      Math.max(
        0,
        plan.monthlyDownloadLimit -
          (monthlyDownloads + 1)
      );

    res.setHeader(
      "X-Remaining-Daily",
      remainingDaily
    );

    res.setHeader(
      "X-Remaining-Monthly",
      remainingMonthly
    );

    // --------------------------------------
    // SEND VIDEO FILE
    // --------------------------------------

    res.download(
      videoPath,
      existingVideo.filename,
      async (error) => {
        if (error) {
          console.error(
            "DOWNLOAD FILE ERROR:",
            error
          );

          try {
            await download.findByIdAndUpdate(
              downloadRecord._id,
              {
                status: "failed",
                errorMessage:
                  error.message ||
                  "Download failed.",
              }
            );
          } catch (updateError) {
            console.error(
              "FAILED TO UPDATE DOWNLOAD STATUS:",
              updateError
            );
          }

          return;
        }

        try {
          await download.findByIdAndUpdate(
            downloadRecord._id,
            {
              status: "completed",
            }
          );

          console.log(
            "DOWNLOAD COMPLETED:",
            existingVideo.filename
          );
        } catch (updateError) {
          console.error(
            "FAILED TO UPDATE DOWNLOAD COMPLETION:",
            updateError
          );
        }
      }
    );
  } catch (error) {
    console.error(
      "DOWNLOAD VIDEO ERROR:",
      error
    );

    // --------------------------------------
    // DUPLICATE KEY ERROR
    // --------------------------------------

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This video has already been downloaded today or a download is already in progress.",
      });
    }

    return res.status(500).json({
      message:
        "Something went wrong while processing the download.",
    });
  }
};


// ==========================================
// DOWNLOAD HISTORY + QUOTA
// ==========================================

export const getDownloadHistory = async (
  req,
  res
) => {
  const { userid } = req.params;

  try {
    // --------------------------------------
    // USER CHECK
    // --------------------------------------

    const existingUser =
      await user.findById(userid);

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // --------------------------------------
    // SUBSCRIPTION INFORMATION
    // --------------------------------------

    let currentPlan =
      existingUser.subscriptionPlan ||
      "free";

    let currentStatus =
      existingUser.subscriptionStatus ||
      "active";

    // --------------------------------------
    // EXPIRY CHECK
    // --------------------------------------

    if (
      existingUser.subscriptionExpiryDate &&
      new Date() >
        new Date(
          existingUser.subscriptionExpiryDate
        )
    ) {
      currentPlan = "free";
      currentStatus = "expired";

      existingUser.subscriptionPlan =
        "free";

      existingUser.subscriptionStatus =
        "expired";

      await existingUser.save();
    }

    const plan =
      subscriptionPlans[currentPlan];

    // --------------------------------------
    // TODAY'S DOWNLOADS
    // --------------------------------------

    const todayDownloads =
      await download.countDocuments({
        userid,
        status: "completed",
        downloadAt: {
          $gte: getStartOfDay(),
        },
      });

    // --------------------------------------
    // MONTHLY DOWNLOADS
    // --------------------------------------

    const monthlyDownloads =
      await download.countDocuments({
        userid,
        status: "completed",
        downloadAt: {
          $gte: getStartOfMonth(),
        },
      });

    // --------------------------------------
    // REMAINING QUOTA
    // --------------------------------------

    const remainingDaily =
      Math.max(
        0,
        plan.dailyDownloadLimit -
          todayDownloads
      );

    const remainingMonthly =
      Math.max(
        0,
        plan.monthlyDownloadLimit -
          monthlyDownloads
      );

    // --------------------------------------
    // DOWNLOAD HISTORY
    // --------------------------------------

    const history =
      await download
        .find({ userid })
        .populate(
          "videoid",
          "videotitle filename filesize"
        )
        .sort({
          downloadAt: -1,
        });

    // --------------------------------------
    // RESPONSE
    // --------------------------------------

    return res.status(200).json({
      success: true,

      quota: {
        plan: currentPlan,

        planName:
          plan.name,

        status:
          currentStatus,

        dailyLimit:
          plan.dailyDownloadLimit,

        dailyUsed:
          todayDownloads,

        dailyRemaining:
          remainingDaily,

        monthlyLimit:
          plan.monthlyDownloadLimit,

        monthlyUsed:
          monthlyDownloads,

        monthlyRemaining:
          remainingMonthly,
      },

      downloads: history,
    });
  } catch (error) {
    console.error(
      "DOWNLOAD HISTORY ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Something went wrong while loading download history.",
    });
  }
};