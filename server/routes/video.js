import express from "express";

import {
  getallvideo,
  uploadvideo,
  playvideo,
} from "../controllers/video.js";

import upload from "../filehelper/filehelper.js";

const routes =
  express.Router();

routes.post(
  "/upload",
  upload.single("file"),
  uploadvideo
);

routes.get(
  "/getall",
  getallvideo
);

// Day 4 secure video access
routes.get(
  "/play/:videoid",
  playvideo
);

export default routes;