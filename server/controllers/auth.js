import mongoose from "mongoose";
import crypto from "crypto";
import nodemailer from "nodemailer";

import users from "../Modals/Auth.js";
import LoginHistory from "../Modals/loginHistory.js";
import TrustedDevice from "../Modals/trustedDevice.js";
import OtpVerification from "../Modals/otpVerification.js";

const TRUSTED_DEVICE_DAYS =
  Number(process.env.TRUSTED_DEVICE_DAYS) || 7;

const OTP_EXPIRES_MINUTES =
  Number(process.env.OTP_EXPIRES_MINUTES) || 10;

const MAX_OTP_ATTEMPTS = 5;

// --------------------------------------------------
// CLIENT IP
// --------------------------------------------------

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
};

const cleanIpAddress = (ip) => {
  if (!ip) return "";

  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }

  if (ip === "::1") {
    return "127.0.0.1";
  }

  return ip;
};

// --------------------------------------------------
// BROWSER
// --------------------------------------------------

const detectBrowser = (userAgent) => {
  if (!userAgent) {
    return {
      name: "Unknown",
      version: "",
    };
  }

  let match;

  match = userAgent.match(/Edg\/([\d.]+)/i);

  if (match) {
    return {
      name: "Edge",
      version: match[1],
    };
  }

  match = userAgent.match(/(?:OPR|Opera)\/([\d.]+)/i);

  if (match) {
    return {
      name: "Opera",
      version: match[1],
    };
  }

  match = userAgent.match(/Chrome\/([\d.]+)/i);

  if (match && !/Edg/i.test(userAgent)) {
    return {
      name: "Chrome",
      version: match[1],
    };
  }

  match = userAgent.match(/Firefox\/([\d.]+)/i);

  if (match) {
    return {
      name: "Firefox",
      version: match[1],
    };
  }

  match = userAgent.match(
    /Version\/([\d.]+).*Safari/i
  );

  if (match) {
    return {
      name: "Safari",
      version: match[1],
    };
  }

  return {
    name: "Unknown",
    version: "",
  };
};

// --------------------------------------------------
// OPERATING SYSTEM
// --------------------------------------------------

const detectOperatingSystem = (userAgent) => {
  if (!userAgent) return "Unknown";

  if (/Windows NT 10.0/i.test(userAgent)) {
    return "Windows 10/11";
  }

  if (/Windows NT 6.3/i.test(userAgent)) {
    return "Windows 8.1";
  }

  if (/Windows NT 6.2/i.test(userAgent)) {
    return "Windows 8";
  }

  if (/Windows NT 6.1/i.test(userAgent)) {
    return "Windows 7";
  }

  if (/Android/i.test(userAgent)) {
    const match = userAgent.match(
      /Android\s([\d.]+)/i
    );

    return match
      ? `Android ${match[1]}`
      : "Android";
  }

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    const match = userAgent.match(
      /OS\s([\d_]+)/i
    );

    return match
      ? `iOS ${match[1].replace(/_/g, ".")}`
      : "iOS";
  }

  if (/Mac OS X/i.test(userAgent)) {
    const match = userAgent.match(
      /Mac OS X\s?([\d_\.]+)/i
    );

    return match
      ? `macOS ${match[1].replace(/_/g, ".")}`
      : "macOS";
  }

  if (/CrOS/i.test(userAgent)) {
    return "ChromeOS";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Unknown";
};

// --------------------------------------------------
// DEVICE TYPE
// --------------------------------------------------

const detectDeviceType = (userAgent) => {
  if (!userAgent) return "Unknown";

  if (
    /iPad/i.test(userAgent) ||
    /Tablet/i.test(userAgent) ||
    (/Android/i.test(userAgent) &&
      !/Mobile/i.test(userAgent))
  ) {
    return "Tablet";
  }

  if (
    /Mobile/i.test(userAgent) ||
    /iPhone/i.test(userAgent) ||
    /iPod/i.test(userAgent) ||
    /Android/i.test(userAgent)
  ) {
    return "Mobile";
  }

  return "Desktop";
};

// --------------------------------------------------
// DEVICE MODEL
// --------------------------------------------------

const detectDeviceModel = (
  userAgent,
  deviceType
) => {
  if (!userAgent) return "Unknown";

  if (/iPhone/i.test(userAgent)) {
    return "iPhone";
  }

  if (/iPad/i.test(userAgent)) {
    return "iPad";
  }

  if (/Android/i.test(userAgent)) {
    const match = userAgent.match(
      /Android[^;)]*;\s*(?:[a-zA-Z]{2}-[a-zA-Z]{2};\s*)?(?:wv;\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?[;) ]/i
    );

    if (match && match[1]) {
      const model = match[1].trim();

      if (
        model &&
        !/^Android/i.test(model)
      ) {
        return model;
      }
    }

    return "Android Device";
  }

  if (deviceType === "Desktop") {
    return "Desktop";
  }

  return "Unknown";
};

// --------------------------------------------------
// IP LOCATION
// --------------------------------------------------

const getLocationFromIp = async (
  ipAddress
) => {
  const defaultLocation = {
    city: "",
    state: "",
    country: "",
    latitude: null,
    longitude: null,
    locationSource: "IP",
  };

  if (
    !ipAddress ||
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1"
  ) {
    return defaultLocation;
  }

  try {
    const response = await fetch(
      `https://ipapi.co/${encodeURIComponent(
        ipAddress
      )}/json/`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return defaultLocation;
    }

    const data = await response.json();

    return {
      city: data.city || "",
      state:
        data.region ||
        data.region_code ||
        "",
      country:
        data.country_name ||
        data.country ||
        "",
      latitude:
        typeof data.latitude === "number"
          ? data.latitude
          : null,
      longitude:
        typeof data.longitude === "number"
          ? data.longitude
          : null,
      locationSource: "IP",
    };
  } catch (error) {
    console.error(
      "IP location lookup failed:",
      error.message
    );

    return defaultLocation;
  }
};

// --------------------------------------------------
// DEVICE HASH
// --------------------------------------------------

const createDeviceHash = (
  deviceId,
  browserName,
  deviceType,
  deviceModel,
  operatingSystem
) => {
  return crypto
    .createHash("sha256")
    .update(
      `${deviceId}|${browserName}|${deviceType}|${deviceModel}|${operatingSystem}`
    )
    .digest("hex");
};

// --------------------------------------------------
// OTP
// --------------------------------------------------

const generateOtp = () => {
  return Math.floor(
    100000 +
      Math.random() * 900000
  ).toString();
};

const hashOtp = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

// --------------------------------------------------
// EMAIL
// --------------------------------------------------

const transporter = nodemailer.createTransport(
  {
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  }
);

const sendLoginOtpEmail = async (
  email,
  otp,
  user
) => {
  const name =
    user?.name || "User";

  await transporter.sendMail({
    from: `"Your-Tube Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject:
      "Your-Tube Login Verification OTP",
    text: `Hello ${name},

Your Your-Tube login verification OTP is:

${otp}

This OTP will expire in ${OTP_EXPIRES_MINUTES} minutes.

If you did not attempt to login, please secure your account immediately.

Regards,
Your-Tube Security Team`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2>Your-Tube Login Verification</h2>

        <p>Hello ${name},</p>

        <p>
          We detected a login from a new browser,
          device, IP address or location.
        </p>

        <div style="
          background:#f3f4f6;
          padding:20px;
          text-align:center;
          border-radius:10px;
          margin:20px 0;
        ">
          <div style="font-size:14px;">
            Your verification OTP
          </div>

          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            margin-top:10px;
          ">
            ${otp}
          </div>
        </div>

        <p>
          This OTP expires in
          <strong>${OTP_EXPIRES_MINUTES} minutes</strong>.
        </p>

        <p>
          If you did not attempt this login,
          please secure your account.
        </p>

        <p>
          Regards,<br/>
          Your-Tube Security Team
        </p>
      </div>
    `,
  });
};

// --------------------------------------------------
// LOGIN CONTEXT
// --------------------------------------------------

const getLoginContext = async (req) => {
  const userAgent =
    req.headers["user-agent"] || "";

  const ipAddress = cleanIpAddress(
    getClientIp(req)
  );

  const browser =
    detectBrowser(userAgent);

  const operatingSystem =
    detectOperatingSystem(userAgent);

  const deviceType =
    detectDeviceType(userAgent);

  const deviceModel =
    detectDeviceModel(
      userAgent,
      deviceType
    );

  const location =
    await getLocationFromIp(
      ipAddress
    );

  const deviceId =
    req.headers["x-device-id"] || "";

  const deviceHash =
    createDeviceHash(
      deviceId,
      browser.name,
      deviceType,
      deviceModel,
      operatingSystem
    );

  return {
    userAgent,
    ipAddress,
    browser,
    operatingSystem,
    deviceType,
    deviceModel,
    location,
    deviceId,
    deviceHash,
  };
};

// --------------------------------------------------
// SECURITY COMPARISON
// --------------------------------------------------

const checkNewLogin = async (
  userid,
  context
) => {
  const {
    ipAddress,
    browser,
    deviceType,
    deviceModel,
    location,
    deviceHash,
  } = context;

  const previousLogin =
    await LoginHistory.findOne({
      userid,
      loginStatus: "success",
    }).sort({
      loginTimestamp: -1,
    });

  const isNewBrowser =
    !previousLogin ||
    previousLogin.browserName !==
      browser.name;

  const isNewDevice =
    !previousLogin ||
    previousLogin.deviceType !==
      deviceType ||
    previousLogin.deviceModel !==
      deviceModel;

  const isNewIp =
    !previousLogin ||
    previousLogin.ipAddress !==
      ipAddress;

  const isNewLocation =
    !previousLogin ||
    previousLogin.city !==
      location.city ||
    previousLogin.state !==
      location.state;

  const trustedDevice =
    await TrustedDevice.findOne({
      userid,
      deviceHash,
      isActive: true,
      revokedAt: null,
      trustedUntil: {
        $gt: new Date(),
      },
    });

  /*
   * Requirement says a new IP/city/state/browser/device
   * should require OTP.
   *
   * Therefore trusted device is valid only when
   * current IP and location also match.
   */
  const trustedAndSameEnvironment =
    trustedDevice &&
    trustedDevice.ipAddress ===
      ipAddress &&
    trustedDevice.city ===
      location.city &&
    trustedDevice.state ===
      location.state &&
    trustedDevice.browserName ===
      browser.name &&
    trustedDevice.deviceType ===
      deviceType;

  const otpRequired =
    !trustedAndSameEnvironment &&
    (
      isNewBrowser ||
      isNewDevice ||
      isNewIp ||
      isNewLocation
    );

  return {
    isNewBrowser,
    isNewDevice,
    isNewIp,
    isNewLocation,
    otpRequired,
    trustedDevice:
      trustedAndSameEnvironment
        ? trustedDevice
        : null,
  };
};

// --------------------------------------------------
// CREATE LOGIN HISTORY
// --------------------------------------------------

const createLoginHistory = async (
  userid,
  context,
  security
) => {
  const record =
    await LoginHistory.create({
      userid,

      loginTimestamp:
        new Date(),

      ipAddress:
        context.ipAddress,

      browserName:
        context.browser.name,

      browserVersion:
        context.browser.version,

      operatingSystem:
        context.operatingSystem,

      deviceType:
        context.deviceType,

      deviceModel:
        context.deviceModel,

      city:
        context.location.city,

      state:
        context.location.state,

      country:
        context.location.country,

      latitude:
        context.location.latitude,

      longitude:
        context.location.longitude,

      locationSource:
        context.location.locationSource,

      loginStatus:
        security.otpRequired
          ? "pending_otp"
          : "success",

      verificationStatus:
        security.otpRequired
          ? "required"
          : "not_required",

      otpRequired:
        security.otpRequired,

      otpVerified: false,

      isNewBrowser:
        security.isNewBrowser,

      isNewDevice:
        security.isNewDevice,

      isNewIp:
        security.isNewIp,

      isNewLocation:
        security.isNewLocation,

      trustedDevice:
        Boolean(
          security.trustedDevice
        ),

      trustedUntil:
        security.trustedDevice
          ?.trustedUntil || null,

      deviceHash:
        context.deviceHash,
    });

  return record;
};

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export const login = async (
  req,
  res
) => {
  const {
    email,
    name,
    image,
  } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        message:
          "Email is required.",
      });
    }

    let existingUser =
      await users.findOne({
        email,
      });

    if (!existingUser) {
      existingUser =
        await users.create({
          email,
          name,
          image,
        });
    }

    const context =
      await getLoginContext(req);

    const security =
      await checkNewLogin(
        existingUser._id,
        context
      );

    const loginRecord =
      await createLoginHistory(
        existingUser._id,
        context,
        security
      );

    // ------------------------------------------------
    // TRUSTED / NORMAL LOGIN
    // ------------------------------------------------

    if (!security.otpRequired) {
      if (
        security.trustedDevice
      ) {
        security.trustedDevice.lastUsedAt =
          new Date();

        await security.trustedDevice.save();
      }

      loginRecord.loginStatus =
        "success";

      await loginRecord.save();

      return res.status(200).json({
        result: existingUser,
        verificationRequired: false,
        trustedDevice:
          Boolean(
            security.trustedDevice
          ),
      });
    }

    // ------------------------------------------------
    // OTP REQUIRED
    // ------------------------------------------------

    const otp =
      generateOtp();

    const otpRecord =
      await OtpVerification.create({
        userid:
          existingUser._id,

        email:
          existingUser.email,

        otpHash:
          hashOtp(otp),

        expiresAt:
          new Date(
            Date.now() +
              OTP_EXPIRES_MINUTES *
                60 *
                1000
          ),

        attempts: 0,

        maxAttempts:
          MAX_OTP_ATTEMPTS,

        status:
          "pending",

        purpose:
          "login",

        loginHistoryId:
          loginRecord._id,

        ipAddress:
          context.ipAddress,

        browserName:
          context.browser.name,

        deviceType:
          context.deviceType,

        deviceModel:
          context.deviceModel,

        city:
          context.location.city,

        state:
          context.location.state,

        country:
          context.location.country,
      });

    loginRecord.otpVerificationId =
      otpRecord._id;

    await loginRecord.save();

    try {
      await sendLoginOtpEmail(
        existingUser.email,
        otp,
        existingUser
      );
    } catch (emailError) {
      console.error(
        "OTP email error:",
        emailError
      );

      otpRecord.status =
        "failed";

      await otpRecord.save();

      loginRecord.loginStatus =
        "failed";

      await loginRecord.save();

      return res.status(500).json({
        message:
          "Unable to send verification OTP. Please check email configuration.",
      });
    }

    return res.status(200).json({
      verificationRequired: true,

      verificationId:
        otpRecord._id,

      userId:
        existingUser._id,

      email:
        existingUser.email.replace(
          /^(.{2}).+(@.*)$/,
          "$1****$2"
        ),

      reason: {
        newBrowser:
          security.isNewBrowser,

        newDevice:
          security.isNewDevice,

        newIp:
          security.isNewIp,

        newLocation:
          security.isNewLocation,
      },

      message:
        "OTP verification required.",
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message:
        "Something went wrong",
    });
  }
};

// --------------------------------------------------
// VERIFY OTP
// --------------------------------------------------

export const verifyLoginOtp =
  async (req, res) => {
    const {
      verificationId,
      otp,
      userId,
      deviceId,
    } = req.body;

    try {
      if (
        !verificationId ||
        !otp ||
        !userId
      ) {
        return res.status(400).json({
          message:
            "Verification ID, user ID and OTP are required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          verificationId
        ) ||
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid verification information.",
        });
      }

      const otpRecord =
        await OtpVerification.findOne({
          _id: verificationId,
          userid: userId,
          purpose: "login",
        });

      if (!otpRecord) {
        return res.status(404).json({
          message:
            "OTP verification request not found.",
        });
      }

      if (
        otpRecord.status !==
        "pending"
      ) {
        return res.status(400).json({
          message:
            "This OTP is no longer valid.",
        });
      }

      if (
        new Date() >
        otpRecord.expiresAt
      ) {
        otpRecord.status =
          "expired";

        await otpRecord.save();

        return res.status(400).json({
          message:
            "OTP has expired. Please request a new OTP.",
        });
      }

      if (
        otpRecord.attempts >=
        MAX_OTP_ATTEMPTS
      ) {
        otpRecord.status =
          "failed";

        await otpRecord.save();

        return res.status(429).json({
          message:
            "Maximum OTP attempts exceeded. Please request a new OTP.",
        });
      }

      otpRecord.attempts += 1;
      otpRecord.lastAttemptAt =
        new Date();

      const submittedHash =
        hashOtp(
          String(otp).trim()
        );

      if (
        submittedHash !==
        otpRecord.otpHash
      ) {
        if (
          otpRecord.attempts >=
          MAX_OTP_ATTEMPTS
        ) {
          otpRecord.status =
            "failed";
        }

        await otpRecord.save();

        const loginRecord =
          await LoginHistory.findById(
            otpRecord.loginHistoryId
          );

        if (loginRecord) {
          loginRecord.otpAttempts =
            otpRecord.attempts;

          loginRecord.verificationStatus =
            "failed";

          if (
            otpRecord.status ===
            "failed"
          ) {
            loginRecord.loginStatus =
              "failed";
          }

          await loginRecord.save();
        }

        return res.status(400).json({
          message:
            otpRecord.status ===
            "failed"
              ? "Maximum OTP attempts exceeded."
              : `Invalid OTP. ${
                  MAX_OTP_ATTEMPTS -
                  otpRecord.attempts
                } attempts remaining.`,
        });
      }

      // ------------------------------------------------
      // OTP SUCCESS
      // ------------------------------------------------

      otpRecord.status =
        "verified";

      otpRecord.verifiedAt =
        new Date();

      await otpRecord.save();

      const user =
        await users.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      const context =
        await getLoginContext(req);

      const trustedUntil =
        new Date(
          Date.now() +
            TRUSTED_DEVICE_DAYS *
              24 *
              60 *
              60 *
              1000
        );

      const trusted =
        await TrustedDevice.findOneAndUpdate(
          {
            userid: userId,
            deviceHash:
              context.deviceHash,
          },
          {
            $set: {
              browserName:
                context.browser.name,

              browserVersion:
                context.browser.version,

              operatingSystem:
                context.operatingSystem,

              deviceType:
                context.deviceType,

              deviceModel:
                context.deviceModel,

              ipAddress:
                context.ipAddress,

              city:
                context.location.city,

              state:
                context.location.state,

              country:
                context.location.country,

              trustedAt:
                new Date(),

              trustedUntil,

              lastUsedAt:
                new Date(),

              revokedAt: null,

              isActive: true,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

      const loginRecord =
        await LoginHistory.findById(
          otpRecord.loginHistoryId
        );

      if (loginRecord) {
        loginRecord.loginStatus =
          "success";

        loginRecord.verificationStatus =
          "verified";

        loginRecord.otpVerified =
          true;

        loginRecord.otpAttempts =
          otpRecord.attempts;

        loginRecord.trustedDevice =
          true;

        loginRecord.trustedUntil =
          trustedUntil;

        await loginRecord.save();
      }

      return res.status(200).json({
        message:
          "Login verified successfully.",

        result: user,

        verificationRequired:
          false,

        trustedDevice: true,

        trustedUntil:
          trusted.trustedUntil,
      });
    } catch (error) {
      console.error(
        "OTP verification error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while verifying OTP.",
      });
    }
  };

// --------------------------------------------------
// RESEND OTP
// --------------------------------------------------

export const resendLoginOtp =
  async (req, res) => {
    const {
      verificationId,
      userId,
    } = req.body;

    try {
      if (
        !verificationId ||
        !userId
      ) {
        return res.status(400).json({
          message:
            "Verification information is required.",
        });
      }

      const oldOtp =
        await OtpVerification.findOne({
          _id: verificationId,
          userid: userId,
          purpose: "login",
        });

      if (!oldOtp) {
        return res.status(404).json({
          message:
            "Verification request not found.",
        });
      }

      if (
        oldOtp.status ===
        "verified"
      ) {
        return res.status(400).json({
          message:
            "OTP is already verified.",
        });
      }

      const user =
        await users.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      const otp =
        generateOtp();

      oldOtp.otpHash =
        hashOtp(otp);

      oldOtp.expiresAt =
        new Date(
          Date.now() +
            OTP_EXPIRES_MINUTES *
              60 *
              1000
        );

      oldOtp.attempts = 0;

      oldOtp.status =
        "pending";

      oldOtp.lastAttemptAt =
        null;

      await oldOtp.save();

      await sendLoginOtpEmail(
        user.email,
        otp,
        user
      );

      return res.status(200).json({
        message:
          "A new OTP has been sent to your registered email.",
      });
    } catch (error) {
      console.error(
        "Resend OTP error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to resend OTP.",
      });
    }
  };

// --------------------------------------------------
// UPDATE PROFILE
// --------------------------------------------------

export const updateprofile =
  async (req, res) => {
    const {
      id: _id,
    } = req.params;

    const {
      channelname,
      description,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        _id
      )
    ) {
      return res.status(500).json({
        message:
          "User unavailable...",
      });
    }

    try {
      const updatedata =
        await users.findByIdAndUpdate(
          _id,
          {
            $set: {
              channelname,
              description,
            },
          },
          {
            new: true,
          }
        );

      return res.status(201).json(
        updatedata
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message:
          "Something went wrong",
      });
    }
  };

// --------------------------------------------------
// THEME
// --------------------------------------------------

export const updateThemePreference =
  async (req, res) => {
    const {
      id: _id,
    } = req.params;

    const {
      theme,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        _id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid user ID.",
      });
    }

    if (
      !["light", "dark"].includes(
        theme
      )
    ) {
      return res.status(400).json({
        message:
          "Theme must be either light or dark.",
      });
    }

    try {
      const updatedUser =
        await users.findByIdAndUpdate(
          _id,
          {
            $set: {
              themePreference:
                theme,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedUser) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      return res.status(200).json({
        message:
          "Theme preference updated successfully.",

        result:
          updatedUser,
      });
    } catch (error) {
      console.error(
        "Theme update error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong.",
      });
    }
  };

// --------------------------------------------------
// LOGIN HISTORY
// --------------------------------------------------

export const getLoginHistory =
  async (req, res) => {
    const {
      id: _id,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        _id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid user ID.",
      });
    }

    try {
      const loginHistory =
        await LoginHistory.find({
          userid: _id,
        })
          .sort({
            loginTimestamp: -1,
          })
          .limit(100);

      return res.status(200).json({
        result:
          loginHistory,
      });
    } catch (error) {
      console.error(
        "Get login history error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong.",
      });
    }
  };