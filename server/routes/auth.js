import express from "express";

import {
  login,
  updateprofile,
  updateThemePreference,
  getLoginHistory,
  verifyLoginOtp,
  resendLoginOtp,
} from "../controllers/auth.js";

const routes =
  express.Router();

routes.post(
  "/login",
  login
);

routes.post(
  "/verify-otp",
  verifyLoginOtp
);

routes.post(
  "/resend-otp",
  resendLoginOtp
);

routes.patch(
  "/update/:id",
  updateprofile
);

routes.patch(
  "/theme/:id",
  updateThemePreference
);

routes.get(
  "/login-history/:id",
  getLoginHistory
);

export default routes;