import express from "express";

import {
  postcomment,
  getallcomment,
  deletecomment,
  editcomment,
  likecomment,
  dislikecomment,
  translatecomment,
} from "../controllers/comment.js";

import commentRateLimiter from "../middleware/commentRateLimiter.js";

const routes = express.Router();

// ==========================================
// COMMENTS
// ==========================================

// Rate limiting is applied to new comments/replies
routes.post(
  "/postcomment",
  commentRateLimiter,
  postcomment
);

routes.get(
  "/:videoid",
  getallcomment
);

// ==========================================
// EDIT / DELETE
// ==========================================

routes.post(
  "/editcomment/:id",
  editcomment
);

routes.delete(
  "/deletecomment/:id",
  deletecomment
);

// ==========================================
// LIKE / DISLIKE
// ==========================================

routes.post(
  "/likecomment/:id",
  likecomment
);

routes.post(
  "/dislikecomment/:id",
  dislikecomment
);

// ==========================================
// TRANSLATION
// ==========================================

routes.post(
  "/translate",
  translatecomment
);

export default routes;