import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const AuthContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);

  const [otpRequired, setOtpRequired] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [verificationUserId, setVerificationUserId] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  // ------------------------------------------------
  // DEVICE ID
  // ------------------------------------------------

  const getDeviceId = () => {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      let deviceId = window.localStorage.getItem(
        "youtube_device_id"
      );

      if (!deviceId) {
        deviceId = `${window.crypto.randomUUID()}-${Date.now()}`;

        window.localStorage.setItem(
          "youtube_device_id",
          deviceId
        );
      }

      return deviceId;
    } catch (error) {
      console.error("Device ID error:", error);
      return "";
    }
  };

  // ------------------------------------------------
  // AUTOMATIC THEME
  // ------------------------------------------------

  const getAutomaticTheme = () => {
    try {
      const hour = Number(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          hour12: false,
        }).format(new Date())
      );

      if (hour >= 5 && hour < 12) {
        return "light";
      }

      return "dark";
    } catch (error) {
      console.error("Automatic theme error:", error);
      return "dark";
    }
  };

  // ------------------------------------------------
  // APPLY THEME
  // ------------------------------------------------

  const applyTheme = (selectedTheme) => {
    if (typeof document === "undefined") {
      return;
    }

    if (selectedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      window.localStorage.setItem(
        "theme",
        selectedTheme
      );
    } catch (error) {
      console.error("Theme localStorage error:", error);
    }

    setTheme(selectedTheme);
  };

  // ------------------------------------------------
  // SET LOGGED-IN USER
  // ------------------------------------------------

  const completeLogin = (userdata) => {
    if (!userdata) {
      return;
    }

    setUser(userdata);

    try {
      window.localStorage.setItem(
        "user",
        JSON.stringify(userdata)
      );
    } catch (error) {
      console.error("User localStorage error:", error);
    }

    const savedTheme = userdata.themePreference;

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      applyTheme(savedTheme);
    } else {
      applyTheme(getAutomaticTheme());
    }
  };

  // ------------------------------------------------
  // BACKEND LOGIN
  // ------------------------------------------------

  const loginToBackend = async (firebaseUser) => {
    try {
      const deviceId = getDeviceId();

      const response = await axiosInstance.post(
        "/user/login",
        {
          email: firebaseUser.email,
          name: firebaseUser.displayName || "",
          image: firebaseUser.photoURL || "",
        },
        {
          headers: {
            "x-device-id": deviceId,
          },
        }
      );

      const data = response.data;

      if (data.verificationRequired) {
        setOtpRequired(true);

        setVerificationId(
          data.verificationId
        );

        setVerificationUserId(
          data.userId
        );

        setMaskedEmail(
          data.email ||
            firebaseUser.email ||
            ""
        );

        setOtp("");

        setOtpMessage(
          "We sent a verification OTP to your registered email."
        );

        setOtpError("");

        return;
      }

      completeLogin(data.result);
    } catch (error) {
      console.error(
        "Backend login error:",
        error
      );

      setOtpError(
        error?.response?.data?.message ||
          "Unable to complete login."
      );
    }
  };

  // ------------------------------------------------
  // VERIFY OTP
  // ------------------------------------------------

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    setOtpMessage("");

    try {
      const deviceId = getDeviceId();

      const response = await axiosInstance.post(
        "/user/verify-otp",
        {
          verificationId,
          userId: verificationUserId,
          otp,
          deviceId,
        },
        {
          headers: {
            "x-device-id": deviceId,
          },
        }
      );

      const data = response.data;

      completeLogin(data.result);

      setOtpRequired(false);
      setVerificationId(null);
      setVerificationUserId(null);
      setMaskedEmail("");
      setOtp("");

      setOtpMessage(
        "Login verified successfully."
      );
    } catch (error) {
      console.error(
        "OTP verification error:",
        error
      );

      setOtpError(
        error?.response?.data?.message ||
          "Invalid OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ------------------------------------------------
  // RESEND OTP
  // ------------------------------------------------

  const resendOtp = async () => {
    setResendLoading(true);
    setOtpError("");
    setOtpMessage("");

    try {
      const response = await axiosInstance.post(
        "/user/resend-otp",
        {
          verificationId,
          userId: verificationUserId,
        }
      );

      setOtp("");

      setOtpMessage(
        response.data?.message ||
          "New OTP sent."
      );
    } catch (error) {
      console.error(
        "Resend OTP error:",
        error
      );

      setOtpError(
        error?.response?.data?.message ||
          "Unable to resend OTP."
      );
    } finally {
      setResendLoading(false);
    }
  };

  // ------------------------------------------------
  // GOOGLE LOGIN
  // ------------------------------------------------

  const googleSignIn = async () => {
    try {
      const provider =
        new GoogleAuthProvider();

      await signInWithPopup(
        auth,
        provider
      );
    } catch (error) {
      console.error(
        "Google sign-in error:",
        error
      );
    }
  };

  // ------------------------------------------------
  // CHANGE THEME
  // ------------------------------------------------

  const changeTheme = async (
    selectedTheme
  ) => {
    if (
      !["light", "dark"].includes(
        selectedTheme
      )
    ) {
      return;
    }

    applyTheme(selectedTheme);

    if (!user?._id) {
      return;
    }

    try {
      const response =
        await axiosInstance.patch(
          `/user/theme/${user._id}`,
          {
            theme: selectedTheme,
          }
        );

      if (response.data?.result) {
        const updatedUser =
          response.data.result;

        setUser(updatedUser);

        try {
          window.localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
          );
        } catch (error) {
          console.error(
            "Updated user storage error:",
            error
          );
        }
      }
    } catch (error) {
      console.error(
        "Theme update error:",
        error
      );
    }
  };

  const toggleTheme = () => {
    changeTheme(
      theme === "dark"
        ? "light"
        : "dark"
    );
  };

  // ------------------------------------------------
  // LOGOUT
  // ------------------------------------------------

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    setUser(null);
    setOtpRequired(false);
    setVerificationId(null);
    setVerificationUserId(null);
    setMaskedEmail("");
    setOtp("");
    setOtpMessage("");
    setOtpError("");

    try {
      window.localStorage.removeItem(
        "user"
      );
    } catch (error) {
      console.error(
        "Logout storage error:",
        error
      );
    }
  };

  // ------------------------------------------------
  // FIREBASE AUTH STATE
  // ------------------------------------------------

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          if (firebaseUser) {
            await loginToBackend(
              firebaseUser
            );
          } else {
            setUser(null);

            try {
              window.localStorage.removeItem(
                "user"
              );
            } catch (error) {
              console.error(
                "Auth storage error:",
                error
              );
            }
          }

          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  // ------------------------------------------------
  // OTP UI
  // ------------------------------------------------

  const otpModal = otpRequired ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          background: "var(--background)",
          color: "var(--foreground)",
          borderRadius: "16px",
          padding: "28px",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            textAlign: "center",
          }}
        >
          🔐
        </div>

        <h2
          style={{
            textAlign: "center",
            fontSize: "24px",
            fontWeight: "700",
            marginTop: "10px",
          }}
        >
          Verify Your Login
        </h2>

        <p
          style={{
            textAlign: "center",
            marginTop: "10px",
            opacity: 0.75,
          }}
        >
          We detected a new browser,
          device, IP address or
          location.
        </p>

        <p
          style={{
            textAlign: "center",
            marginTop: "8px",
            fontSize: "14px",
          }}
        >
          OTP sent to{" "}
          <strong>
            {maskedEmail}
          </strong>
        </p>

        <input
          value={otp}
          onChange={(e) =>
            setOtp(
              e.target.value
                .replace(/\D/g, "")
                .slice(0, 6)
            )
          }
          placeholder="Enter 6-digit OTP"
          inputMode="numeric"
          maxLength={6}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #888",
            background: "transparent",
            color: "inherit",
            textAlign: "center",
            fontSize: "22px",
            letterSpacing: "6px",
            outline: "none",
          }}
        />

        {otpError && (
          <p
            style={{
              color: "#ef4444",
              marginTop: "10px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            {otpError}
          </p>
        )}

        {otpMessage && (
          <p
            style={{
              color: "#22c55e",
              marginTop: "10px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            {otpMessage}
          </p>
        )}

        <button
          type="button"
          onClick={verifyOtp}
          disabled={
            otpLoading ||
            otp.length !== 6
          }
          style={{
            width: "100%",
            marginTop: "18px",
            padding: "13px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: "600",
            cursor: "pointer",
            opacity:
              otpLoading ||
              otp.length !== 6
                ? 0.5
                : 1,
          }}
        >
          {otpLoading
            ? "Verifying..."
            : "Verify & Continue"}
        </button>

        <button
          type="button"
          onClick={resendOtp}
          disabled={resendLoading}
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "11px",
            borderRadius: "10px",
            border: "1px solid #888",
            background: "transparent",
            color: "inherit",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {resendLoading
            ? "Sending..."
            : "Resend OTP"}
        </button>

        <button
          type="button"
          onClick={logout}
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "10px",
            border: "none",
            background: "transparent",
            color: "#ef4444",
            cursor: "pointer",
          }}
        >
          Cancel Login
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "14px",
            fontSize: "12px",
            opacity: 0.6,
          }}
        >
          OTP expires in 10 minutes.
        </p>
      </div>
    </div>
  ) : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        googleSignIn,
        logout,

        theme,
        changeTheme,
        toggleTheme,

        otpRequired,
        verifyOtp,
        resendOtp,
      }}
    >
      {children}
      {otpModal}
    </AuthContext.Provider>
  );
};

export const useUser = () =>
  useContext(AuthContext);