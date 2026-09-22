import express from "express";

import {
  downloadVideo,
  getDownloadHistory,
} from "../controllers/download.js";

import downloadSecurity from "../middleware/downloadSecurity.js";

const routes = express.Router();

routes.post(
  "/video",
  downloadSecurity,
  downloadVideo
);

routes.get(
  "/history/:userid",
  getDownloadHistory
);

export default routes;