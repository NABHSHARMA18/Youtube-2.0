import WatchProgress from "../Modals/watchProgress.js";

const getCompletionPercentage = () => {
  const value = Number(
    process.env.WATCH_COMPLETION_PERCENTAGE || 90
  );

  if (Number.isNaN(value)) {
    return 90;
  }

  return Math.min(Math.max(value, 1), 100);
};

// GET WATCH PROGRESS
export const getWatchProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();

    if (!videoId) {
      return res.status(400).json({
        message: "Video ID is required.",
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "User email is required.",
      });
    }

    const progress = await WatchProgress.findOne({
      email,
      videoId,
    });

    if (!progress) {
      return res.status(200).json({
        success: true,
        exists: false,
        progress: {
          watchedSeconds: 0,
          duration: 0,
          progressPercent: 0,
          completed: false,
        },
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      progress,
    });
  } catch (error) {
    console.error(
      "GET WATCH PROGRESS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch watch progress.",
    });
  }
};

// SAVE WATCH PROGRESS
export const saveWatchProgress = async (req, res) => {
  try {
    const { videoId } = req.params;

    const {
      email,
      watchedSeconds,
      duration,
    } = req.body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!videoId) {
      return res.status(400).json({
        message: "Video ID is required.",
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        message: "User email is required.",
      });
    }

    const watched = Math.max(
      Number(watchedSeconds) || 0,
      0
    );

    const totalDuration = Math.max(
      Number(duration) || 0,
      0
    );

    let progressPercent = 0;

    if (totalDuration > 0) {
      progressPercent = Math.min(
        (watched / totalDuration) * 100,
        100
      );
    }

    const completionPercentage =
      getCompletionPercentage();

    const completed =
      progressPercent >= completionPercentage;

    const progress =
      await WatchProgress.findOneAndUpdate(
        {
          email: normalizedEmail,
          videoId,
        },
        {
          $set: {
            watchedSeconds: watched,
            duration: totalDuration,
            progressPercent,
            completed,
            lastWatchedAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message: completed
        ? "Video marked as completed."
        : "Watch progress saved.",
      progress,
      completionPercentage,
    });
  } catch (error) {
    console.error(
      "SAVE WATCH PROGRESS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to save watch progress.",
    });
  }
};