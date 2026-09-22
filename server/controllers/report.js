import mongoose from "mongoose";
import report from "../Modals/report.js";
import comment from "../Modals/comment.js";
import moderation from "../Modals/moderation.js";


// ==========================================
// ADMIN CHECK
// ==========================================

const isAdmin = async (userid) => {
  if (!userid || !mongoose.Types.ObjectId.isValid(userid)) {
    return false;
  }

  const admin = await user.findById(userid);

  if (!admin) {
    return false;
  }

  // Put your admin email in server/.env
  // ADMIN_EMAIL=your-email@gmail.com

  return (
    process.env.ADMIN_EMAIL &&
    admin.email === process.env.ADMIN_EMAIL
  );
};

// ==========================================
// REPORT COMMENT
// ==========================================

export const reportcomment = async (req, res) => {
  const { commentid, reportedby, reason } = req.body;

  if (
    !commentid ||
    !mongoose.Types.ObjectId.isValid(commentid)
  ) {
    return res.status(400).json({
      message: "Invalid comment ID",
    });
  }

  if (
    !reportedby ||
    !mongoose.Types.ObjectId.isValid(reportedby)
  ) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const allowedReasons = [
    "spam",
    "harassment",
    "offensive",
  ];

  if (!allowedReasons.includes(reason)) {
    return res.status(400).json({
      message: "Invalid report reason",
    });
  }

  try {
    const existingComment =
      await comment.findById(commentid);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    // Prevent duplicate reports
    const alreadyReported = await report.findOne({
      commentid,
      reportedby,
    });

    if (alreadyReported) {
      return res.status(400).json({
        message:
          "You have already reported this comment.",
      });
    }

    const newReport = await report.create({
      commentid,
      reportedby,
      reason,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Comment reported successfully. It has been sent for administrator review.",
      data: newReport,
    });
  } catch (error) {
    console.error(
      "REPORT COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// GET REPORTS - ADMIN ONLY
// ==========================================

export const getreports = async (req, res) => {
  const { adminid } = req.query;

  try {
    if (!(await isAdmin(adminid))) {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const reports = await report
      .find()
      .populate(
        "commentid",
        "commentbody usercommented commentedon edited"
      )
      .populate(
        "reportedby",
        "name image email"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json(reports);
  } catch (error) {
    console.error(
      "GET REPORTS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// REVIEW REPORT - ADMIN ONLY
// ==========================================

export const reviewreport = async (req, res) => {
  const { reportid } = req.params;
  const { adminid, action, note } = req.body;

  if (!mongoose.Types.ObjectId.isValid(reportid)) {
    return res.status(400).json({
      message: "Invalid report ID",
    });
  }

  if (!(await isAdmin(adminid))) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  const allowedActions = [
    "approved",
    "dismissed",
    "removed",
  ];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({
      message: "Invalid moderation action",
    });
  }

  try {
    const existingReport =
      await report.findById(reportid);

    if (!existingReport) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    if (existingReport.status !== "pending") {
      return res.status(400).json({
        message:
          "This report has already been reviewed.",
      });
    }

    const existingComment =
      await comment.findById(
        existingReport.commentid
      );

    // If comment was already deleted
    if (!existingComment) {
      existingReport.status = "dismissed";
      existingReport.adminNote =
        "Comment was already deleted.";
      existingReport.reviewedBy = adminid;
      existingReport.reviewedAt = new Date();

      await existingReport.save();

      await moderation.create({
        commentid: existingReport.commentid,
        adminid,
        action: "dismissed",
        note: "Comment was already deleted.",
      });

      return res.status(200).json({
        message:
          "Report handled because the comment no longer exists.",
      });
    }

    // Remove comment only after admin action
    if (action === "removed") {
      await comment.findByIdAndDelete(
        existingReport.commentid
      );
    }

    existingReport.status = action;
    existingReport.adminNote = note || "";
    existingReport.reviewedBy = adminid;
    existingReport.reviewedAt = new Date();

    await existingReport.save();

    await moderation.create({
      commentid: existingReport.commentid,
      adminid,
      action,
      note: note || "",
    });

    return res.status(200).json({
      success: true,
      message: `Report ${action} successfully.`,
    });
  } catch (error) {
    console.error(
      "REVIEW REPORT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// MODERATION HISTORY - ADMIN ONLY
// ==========================================

export const getmoderationlogs = async (
  req,
  res
) => {
  const { adminid } = req.query;

  try {
    if (!(await isAdmin(adminid))) {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const logs = await moderation
      .find()
      .populate(
        "commentid",
        "commentbody usercommented"
      )
      .populate(
        "adminid",
        "name email"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    console.error(
      "GET MODERATION LOGS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};