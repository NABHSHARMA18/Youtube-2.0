import express from "express";

import {
  reportcomment,
  getreports,
  reviewreport,
  getmoderationlogs,
} from "../controllers/report.js";

const routes = express.Router();

routes.post(
  "/reportcomment",
  reportcomment
);

routes.get(
  "/reports",
  getreports
);

routes.post(
  "/review/:reportid",
  reviewreport
);

routes.get(
  "/moderationlogs",
  getmoderationlogs
);

export default routes;