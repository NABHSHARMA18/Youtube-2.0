import express from "express";

import {
  createMeeting,
  getMeeting,
  updateMeeting,
} from "../controllers/meeting.js";

const router = express.Router();

router.post(
  "/create",
  createMeeting
);

router.get(
  "/:roomId",
  getMeeting
);

router.patch(
  "/:roomId",
  updateMeeting
);

export default router;