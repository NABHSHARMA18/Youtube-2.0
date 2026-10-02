import express from "express";

import {
  getWatchProgress,
  saveWatchProgress,
} from "../controllers/watchProgress.js";

const router = express.Router();

// Get progress
router.get(
  "/:videoId",
  getWatchProgress
);

// Save/update progress
router.put(
  "/:videoId",
  saveWatchProgress
);

export default router;