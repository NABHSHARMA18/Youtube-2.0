import express from "express";

import {
  getSecurityDashboard,
  getSecurityLoginHistory,
  getOtpHistory,
  getTrustedDevices,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
} from "../controllers/security.js";

const router = express.Router();


// Security dashboard
router.get(
  "/:id",
  getSecurityDashboard
);


// Login history
router.get(
  "/:id/login-history",
  getSecurityLoginHistory
);


// OTP history
router.get(
  "/:id/otp-history",
  getOtpHistory
);


// Trusted devices
router.get(
  "/:id/trusted-devices",
  getTrustedDevices
);


// Revoke single trusted device
router.patch(
  "/revoke-device/:deviceId",
  revokeTrustedDevice
);


// Revoke all trusted devices
router.patch(
  "/revoke-all-devices",
  revokeAllTrustedDevices
);


export default router;