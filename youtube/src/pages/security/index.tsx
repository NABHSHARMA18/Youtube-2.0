import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useUser } from "../../lib/AuthContext";


type SecuritySummary = {
    totalLogins: number;
    successfulLogins: number;
    pendingOtpLogins: number;
    failedLogins: number;

    totalOtpRequests: number;
    verifiedOtps: number;
    failedOtps: number;

    trustedDevices: number;
};


type LoginRecord = {
    _id: string;

    loginTimestamp?: string;

    ipAddress?: string;

    browserName?: string;
    browserVersion?: string;

    operatingSystem?: string;

    deviceType?: string;
    deviceModel?: string;

    city?: string;
    state?: string;
    country?: string;

    loginStatus?: string;

    verificationStatus?: string;

    otpRequired?: boolean;
    otpVerified?: boolean;

    otpAttempts?: number;

    isNewBrowser?: boolean;
    isNewDevice?: boolean;
    isNewIp?: boolean;
    isNewLocation?: boolean;

    trustedDevice?: boolean;

    trustedUntil?: string;
};


type OtpRecord = {
    _id: string;

    createdAt?: string;

    email?: string;

    status?: string;

    attempts?: number;

    maxAttempts?: number;

    expiresAt?: string;

    verifiedAt?: string;

    lastAttemptAt?: string;

    browserName?: string;

    deviceType?: string;

    ipAddress?: string;
};


type TrustedDevice = {
    _id: string;

    browserName?: string;
    browserVersion?: string;

    operatingSystem?: string;

    deviceType?: string;
    deviceModel?: string;

    ipAddress?: string;

    city?: string;
    state?: string;
    country?: string;

    trustedAt?: string;
    trustedUntil?: string;

    lastUsedAt?: string;

    isActive?: boolean;
};


const formatDate = (date?: string) => {
    if (!date) return "N/A";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return "N/A";
    }

    return d.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};


const getStatusClass = (status?: string) => {
    if (status === "success" || status === "verified") {
        return "status success";
    }

    if (status === "failed") {
        return "status failed";
    }

    if (status === "pending_otp") {
        return "status warning";
    }

    return "status neutral";
};


export default function SecurityPage() {
    const router = useRouter();

    const { user } = useUser();

    const [summary, setSummary] = useState<SecuritySummary | null>(null);

    const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);

    const [otpHistory, setOtpHistory] = useState<OtpRecord[]>([]);

    const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [activeTab, setActiveTab] = useState<
        "overview" | "logins" | "otp" | "devices"
    >("overview");

    const [revokingDevice, setRevokingDevice] = useState("");

    const [message, setMessage] = useState("");


    /*
    |--------------------------------------------------------------------------
    | GET USER ID
    |--------------------------------------------------------------------------
    */

    const getUserId = () => {
        if (!user) return null;

        return (
            user._id ||
            user.id ||
            user.uid ||
            null
        );
    };


    /*
    |--------------------------------------------------------------------------
    | LOAD SECURITY DATA
    |--------------------------------------------------------------------------
    */

    const loadSecurityData = async () => {
        try {
            setLoading(true);

            setError("");

            setMessage("");

            const userId = getUserId();

            if (!userId) {
                setError("User information is not available.");
                setLoading(false);
                return;
            }

            const backendUrl =
                process.env.NEXT_PUBLIC_BACKEND_URL ||
                "http://localhost:5000";

            const response = await axios.get(
                `${backendUrl}/user/security/${userId}`
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Failed to load security information"
                );
            }

            setSummary(response.data.summary || null);

            setLoginHistory(
                response.data.loginHistory || []
            );

            setOtpHistory(
                response.data.otpHistory || []
            );

            setTrustedDevices(
                response.data.trustedDevices || []
            );
        } catch (err: any) {
            console.error(
                "Security dashboard error:",
                err
            );

            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load security information"
            );
        } finally {
            setLoading(false);
        }
    };


    /*
    |--------------------------------------------------------------------------
    | INITIAL LOAD
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!user) {
            return;
        }

        loadSecurityData();
    }, [user]);


    /*
    |--------------------------------------------------------------------------
    | REVOKE DEVICE
    |--------------------------------------------------------------------------
    */

    const revokeDevice = async (
        deviceId: string
    ) => {
        try {
            const userId = getUserId();

            if (!userId) {
                return;
            }

            const confirmed = window.confirm(
                "Are you sure you want to revoke this trusted device?"
            );

            if (!confirmed) {
                return;
            }

            setRevokingDevice(deviceId);

            setMessage("");

            const backendUrl =
                process.env.NEXT_PUBLIC_BACKEND_URL ||
                "http://localhost:5000";

            const response = await axios.patch(
                `${backendUrl}/user/security/revoke-device/${deviceId}`,
                {
                    id: userId,
                }
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Failed to revoke device"
                );
            }

            setMessage(
                "Trusted device revoked successfully."
            );

            await loadSecurityData();
        } catch (err: any) {
            console.error(
                "Revoke device error:",
                err
            );

            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to revoke device"
            );
        } finally {
            setRevokingDevice("");
        }
    };


    /*
    |--------------------------------------------------------------------------
    | REVOKE ALL DEVICES
    |--------------------------------------------------------------------------
    */

    const revokeAllDevices = async () => {
        try {
            const userId = getUserId();

            if (!userId) {
                return;
            }

            const confirmed = window.confirm(
                "This will revoke all trusted devices. Continue?"
            );

            if (!confirmed) {
                return;
            }

            setMessage("");

            const backendUrl =
                process.env.NEXT_PUBLIC_BACKEND_URL ||
                "http://localhost:5000";

            const response = await axios.patch(
                `${backendUrl}/user/security/revoke-all-devices`,
                {
                    id: userId,
                }
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Failed to revoke devices"
                );
            }

            setMessage(
                "All trusted devices have been revoked."
            );

            await loadSecurityData();
        } catch (err: any) {
            console.error(
                "Revoke all devices error:",
                err
            );

            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to revoke devices"
            );
        }
    };


    /*
    |--------------------------------------------------------------------------
    | USER CHECK
    |--------------------------------------------------------------------------
    */

    if (!user && !loading) {
        return (
            <div className="security-page">
                <div className="security-empty">
                    <h2>Login Required</h2>

                    <p>
                        Please login to view your account security.
                    </p>

                    <button
                        onClick={() => router.push("/")}
                    >
                        Go Home
                    </button>
                </div>

                <style jsx>{styles}</style>
            </div>
        );
    }


    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="security-page">
                <div className="security-loading">
                    <div className="spinner"></div>

                    <p>
                        Loading security information...
                    </p>
                </div>

                <style jsx>{styles}</style>
            </div>
        );
    }


    return (
        <div className="security-page">

            {/* HEADER */}

            <div className="security-header">

                <div>
                    <div className="back-button">
                        <button
                            onClick={() => router.back()}
                        >
                            ← Back
                        </button>
                    </div>

                    <h1>
                        Account Security
                    </h1>

                    <p>
                        Monitor your login activity,
                        trusted devices and verification history.
                    </p>
                </div>

                <button
                    className="refresh-button"
                    onClick={loadSecurityData}
                >
                    ↻ Refresh
                </button>

            </div>


            {/* ALERTS */}

            {error && (
                <div className="alert error-alert">
                    ⚠️ {error}
                </div>
            )}

            {message && (
                <div className="alert success-alert">
                    ✓ {message}
                </div>
            )}


            {/* SUMMARY CARDS */}

            {summary && (
                <div className="summary-grid">

                    <div className="summary-card">
                        <div className="summary-icon">
                            🔐
                        </div>

                        <div>
                            <span>
                                Total Logins
                            </span>

                            <strong>
                                {summary.totalLogins}
                            </strong>
                        </div>
                    </div>


                    <div className="summary-card">
                        <div className="summary-icon">
                            ✓
                        </div>

                        <div>
                            <span>
                                Successful
                            </span>

                            <strong>
                                {summary.successfulLogins}
                            </strong>
                        </div>
                    </div>


                    <div className="summary-card">
                        <div className="summary-icon">
                            🔑
                        </div>

                        <div>
                            <span>
                                OTP Verified
                            </span>

                            <strong>
                                {summary.verifiedOtps}
                            </strong>
                        </div>
                    </div>


                    <div className="summary-card">
                        <div className="summary-icon">
                            📱
                        </div>

                        <div>
                            <span>
                                Trusted Devices
                            </span>

                            <strong>
                                {summary.trustedDevices}
                            </strong>
                        </div>
                    </div>

                </div>
            )}


            {/* TABS */}

            <div className="tabs">

                <button
                    className={
                        activeTab === "overview"
                            ? "tab active"
                            : "tab"
                    }
                    onClick={() =>
                        setActiveTab("overview")
                    }
                >
                    Overview
                </button>

                <button
                    className={
                        activeTab === "logins"
                            ? "tab active"
                            : "tab"
                    }
                    onClick={() =>
                        setActiveTab("logins")
                    }
                >
                    Login History
                </button>

                <button
                    className={
                        activeTab === "otp"
                            ? "tab active"
                            : "tab"
                    }
                    onClick={() =>
                        setActiveTab("otp")
                    }
                >
                    OTP History
                </button>

                <button
                    className={
                        activeTab === "devices"
                            ? "tab active"
                            : "tab"
                    }
                    onClick={() =>
                        setActiveTab("devices")
                    }
                >
                    Trusted Devices
                </button>

            </div>


            {/* OVERVIEW */}

            {activeTab === "overview" && (
                <div className="section">

                    <div className="section-title">
                        <h2>
                            Security Overview
                        </h2>

                        <p>
                            Recent account security activity.
                        </p>
                    </div>


                    <div className="overview-grid">

                        <div className="info-card">

                            <h3>
                                Login Security
                            </h3>

                            <div className="info-row">
                                <span>
                                    Successful logins
                                </span>

                                <strong>
                                    {summary?.successfulLogins || 0}
                                </strong>
                            </div>

                            <div className="info-row">
                                <span>
                                    OTP-required logins
                                </span>

                                <strong>
                                    {summary?.pendingOtpLogins || 0}
                                </strong>
                            </div>

                            <div className="info-row">
                                <span>
                                    Failed logins
                                </span>

                                <strong>
                                    {summary?.failedLogins || 0}
                                </strong>
                            </div>

                        </div>


                        <div className="info-card">

                            <h3>
                                OTP Security
                            </h3>

                            <div className="info-row">
                                <span>
                                    OTP requests
                                </span>

                                <strong>
                                    {summary?.totalOtpRequests || 0}
                                </strong>
                            </div>

                            <div className="info-row">
                                <span>
                                    Verified OTPs
                                </span>

                                <strong>
                                    {summary?.verifiedOtps || 0}
                                </strong>
                            </div>

                            <div className="info-row">
                                <span>
                                    Failed OTPs
                                </span>

                                <strong>
                                    {summary?.failedOtps || 0}
                                </strong>
                            </div>

                        </div>

                    </div>


                    <div className="recent-section">

                        <h2>
                            Recent Login
                        </h2>

                        {loginHistory.length === 0 ? (
                            <div className="empty-card">
                                No login records found.
                            </div>
                        ) : (
                            <div className="recent-login">

                                <div className="device-icon">
                                    💻
                                </div>

                                <div className="recent-info">

                                    <strong>
                                        {loginHistory[0].browserName ||
                                            "Unknown Browser"}
                                    </strong>

                                    <span>
                                        {loginHistory[0].operatingSystem ||
                                            "Unknown OS"}
                                        {" • "}
                                        {loginHistory[0].deviceType ||
                                            "Unknown Device"}
                                    </span>

                                    <small>
                                        {loginHistory[0].city ||
                                            "Unknown City"}
                                        {loginHistory[0].state
                                            ? `, ${loginHistory[0].state}`
                                            : ""}
                                        {loginHistory[0].country
                                            ? `, ${loginHistory[0].country}`
                                            : ""}
                                    </small>

                                    <small>
                                        IP:{" "}
                                        {loginHistory[0].ipAddress ||
                                            "Unknown"}
                                    </small>

                                </div>

                                <div className="recent-time">
                                    <span
                                        className={getStatusClass(
                                            loginHistory[0].loginStatus
                                        )}
                                    >
                                        {loginHistory[0].loginStatus ||
                                            "unknown"}
                                    </span>

                                    <small>
                                        {formatDate(
                                            loginHistory[0].loginTimestamp
                                        )}
                                    </small>
                                </div>

                            </div>
                        )}

                    </div>

                </div>
            )}


            {/* LOGIN HISTORY */}

            {activeTab === "logins" && (
                <div className="section">

                    <div className="section-title">
                        <h2>
                            Login History
                        </h2>

                        <p>
                            Detailed record of account login attempts.
                        </p>
                    </div>


                    {loginHistory.length === 0 ? (
                        <div className="empty-card">
                            No login history available.
                        </div>
                    ) : (
                        <div className="history-list">

                            {loginHistory.map((login) => (
                                <div
                                    className="history-card"
                                    key={login._id}
                                >

                                    <div className="history-icon">
                                        {login.deviceType === "Mobile"
                                            ? "📱"
                                            : login.deviceType === "Tablet"
                                                ? "📲"
                                                : "💻"}
                                    </div>


                                    <div className="history-main">

                                        <div className="history-top">

                                            <h3>
                                                {login.browserName ||
                                                    "Unknown Browser"}
                                                {login.browserVersion
                                                    ? ` ${login.browserVersion}`
                                                    : ""}
                                            </h3>

                                            <span
                                                className={getStatusClass(
                                                    login.loginStatus
                                                )}
                                            >
                                                {login.loginStatus ||
                                                    "unknown"}
                                            </span>

                                        </div>


                                        <p>
                                            {login.operatingSystem ||
                                                "Unknown OS"}
                                            {" • "}
                                            {login.deviceType ||
                                                "Unknown Device"}

                                            {login.deviceModel
                                                ? ` • ${login.deviceModel}`
                                                : ""}
                                        </p>


                                        <p>
                                            📍{" "}
                                            {login.city ||
                                                "Unknown City"}
                                            {login.state
                                                ? `, ${login.state}`
                                                : ""}
                                            {login.country
                                                ? `, ${login.country}`
                                                : ""}
                                        </p>


                                        <p>
                                            🌐 IP:{" "}
                                            {login.ipAddress ||
                                                "Unknown"}
                                        </p>


                                        <small>
                                            🕐{" "}
                                            {formatDate(
                                                login.loginTimestamp
                                            )}
                                        </small>


                                        <div className="badges">

                                            {login.otpRequired && (
                                                <span className="badge">
                                                    OTP Required
                                                </span>
                                            )}

                                            {login.otpVerified && (
                                                <span className="badge green">
                                                    OTP Verified
                                                </span>
                                            )}

                                            {login.isNewBrowser && (
                                                <span className="badge">
                                                    New Browser
                                                </span>
                                            )}

                                            {login.isNewDevice && (
                                                <span className="badge">
                                                    New Device
                                                </span>
                                            )}

                                            {login.isNewIp && (
                                                <span className="badge">
                                                    New IP
                                                </span>
                                            )}

                                            {login.isNewLocation && (
                                                <span className="badge">
                                                    New Location
                                                </span>
                                            )}

                                            {login.trustedDevice && (
                                                <span className="badge green">
                                                    Trusted
                                                </span>
                                            )}

                                        </div>

                                    </div>

                                </div>
                            ))}

                        </div>
                    )}

                </div>
            )}


            {/* OTP HISTORY */}

            {activeTab === "otp" && (
                <div className="section">

                    <div className="section-title">
                        <h2>
                            OTP Verification History
                        </h2>

                        <p>
                            Review OTP requests and verification attempts.
                        </p>
                    </div>


                    {otpHistory.length === 0 ? (
                        <div className="empty-card">
                            No OTP history available.
                        </div>
                    ) : (
                        <div className="history-list">

                            {otpHistory.map((otp) => (
                                <div
                                    className="history-card"
                                    key={otp._id}
                                >

                                    <div className="history-icon">
                                        🔑
                                    </div>


                                    <div className="history-main">

                                        <div className="history-top">

                                            <h3>
                                                Login Verification
                                            </h3>

                                            <span
                                                className={getStatusClass(
                                                    otp.status
                                                )}
                                            >
                                                {otp.status ||
                                                    "unknown"}
                                            </span>

                                        </div>


                                        <p>
                                            📧{" "}
                                            {otp.email ||
                                                "Registered email"}
                                        </p>


                                        <p>
                                            🌐 IP:{" "}
                                            {otp.ipAddress ||
                                                "Unknown"}
                                        </p>


                                        <p>
                                            {otp.browserName ||
                                                "Unknown Browser"}
                                            {" • "}
                                            {otp.deviceType ||
                                                "Unknown Device"}
                                        </p>


                                        <p>
                                            Attempts:{" "}
                                            {otp.attempts || 0}
                                            {" / "}
                                            {otp.maxAttempts || 5}
                                        </p>


                                        <small>
                                            Requested:{" "}
                                            {formatDate(
                                                otp.createdAt
                                            )}
                                        </small>

                                        {otp.verifiedAt && (
                                            <small>
                                                Verified:{" "}
                                                {formatDate(
                                                    otp.verifiedAt
                                                )}
                                            </small>
                                        )}

                                    </div>

                                </div>
                            ))}

                        </div>
                    )}

                </div>
            )}


            {/* TRUSTED DEVICES */}

            {activeTab === "devices" && (
                <div className="section">

                    <div className="section-title device-header">

                        <div>
                            <h2>
                                Trusted Devices
                            </h2>

                            <p>
                                Devices that can login without repeated OTP verification.
                            </p>
                        </div>


                        {trustedDevices.length > 0 && (
                            <button
                                className="danger-button"
                                onClick={revokeAllDevices}
                            >
                                Revoke All
                            </button>
                        )}

                    </div>


                    {trustedDevices.length === 0 ? (
                        <div className="empty-card">

                            <div className="empty-icon">
                                🛡️
                            </div>

                            <h3>
                                No Trusted Devices
                            </h3>

                            <p>
                                Devices become trusted after successful OTP verification.
                            </p>

                        </div>
                    ) : (
                        <div className="devices-grid">

                            {trustedDevices.map((device) => (
                                <div
                                    className="device-card"
                                    key={device._id}
                                >

                                    <div className="device-card-header">

                                        <div className="device-large-icon">
                                            {device.deviceType === "Mobile"
                                                ? "📱"
                                                : device.deviceType === "Tablet"
                                                    ? "📲"
                                                    : "💻"}
                                        </div>

                                        <span className="trusted-label">
                                            ✓ Trusted
                                        </span>

                                    </div>


                                    <h3>
                                        {device.browserName ||
                                            "Unknown Browser"}
                                        {device.browserVersion
                                            ? ` ${device.browserVersion}`
                                            : ""}
                                    </h3>


                                    <p>
                                        {device.operatingSystem ||
                                            "Unknown OS"}
                                    </p>


                                    <p>
                                        Device:{" "}
                                        {device.deviceType ||
                                            "Unknown"}

                                        {device.deviceModel
                                            ? ` • ${device.deviceModel}`
                                            : ""}
                                    </p>


                                    <p>
                                        IP:{" "}
                                        {device.ipAddress ||
                                            "Unknown"}
                                    </p>


                                    <p>
                                        📍{" "}
                                        {device.city ||
                                            "Unknown City"}
                                        {device.state
                                            ? `, ${device.state}`
                                            : ""}
                                    </p>


                                    <div className="device-dates">

                                        <span>
                                            Trusted:
                                            <br />
                                            {formatDate(
                                                device.trustedAt
                                            )}
                                        </span>

                                        <span>
                                            Expires:
                                            <br />
                                            {formatDate(
                                                device.trustedUntil
                                            )}
                                        </span>

                                    </div>


                                    <button
                                        className="revoke-button"
                                        disabled={
                                            revokingDevice ===
                                            device._id
                                        }
                                        onClick={() =>
                                            revokeDevice(
                                                device._id
                                            )
                                        }
                                    >
                                        {revokingDevice ===
                                        device._id
                                            ? "Revoking..."
                                            : "Revoke Device"}
                                    </button>

                                </div>
                            ))}

                        </div>
                    )}

                </div>
            )}

        </div>
    );
}


/*
|--------------------------------------------------------------------------
| PAGE STYLES
|--------------------------------------------------------------------------
*/

const styles = `
.security-page {
    min-height: 100vh;
    padding: 32px;
    background: var(--background, #f7f7f8);
    color: var(--foreground, #111827);
}

.security-header {
    max-width: 1200px;
    margin: 0 auto 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
}

.back-button button {
    border: none;
    background: transparent;
    padding: 0;
    margin-bottom: 12px;
    cursor: pointer;
    color: #6b7280;
    font-size: 14px;
}

.security-header h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 800;
}

.security-header p {
    margin: 8px 0 0;
    color: #6b7280;
}

.refresh-button,
.security-empty button {
    border: none;
    border-radius: 10px;
    padding: 11px 18px;
    background: #111827;
    color: white;
    cursor: pointer;
    font-weight: 600;
}

.summary-grid {
    max-width: 1200px;
    margin: 0 auto 25px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
}

.summary-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 3px 15px rgba(0,0,0,.04);
}

.summary-icon {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    font-size: 21px;
}

.summary-card span {
    display: block;
    color: #6b7280;
    font-size: 13px;
}

.summary-card strong {
    display: block;
    margin-top: 4px;
    font-size: 25px;
}

.tabs {
    max-width: 1200px;
    margin: 0 auto 25px;
    display: flex;
    gap: 5px;
    padding: 5px;
    background: #e5e7eb;
    border-radius: 12px;
}

.tab {
    flex: 1;
    border: none;
    padding: 12px;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    font-weight: 600;
    color: #4b5563;
}

.tab.active {
    background: white;
    color: #111827;
    box-shadow: 0 2px 7px rgba(0,0,0,.08);
}

.section {
    max-width: 1200px;
    margin: 0 auto;
}

.section-title {
    margin-bottom: 20px;
}

.section-title h2 {
    margin: 0;
    font-size: 24px;
}

.section-title p {
    color: #6b7280;
    margin-top: 6px;
}

.overview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
}

.info-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 22px;
}

.info-card h3 {
    margin-top: 0;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 13px 0;
    border-bottom: 1px solid #f1f1f1;
}

.info-row:last-child {
    border-bottom: none;
}

.info-row span {
    color: #6b7280;
}

.recent-section {
    margin-top: 22px;
}

.recent-section h2 {
    font-size: 21px;
}

.recent-login {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 18px;
}

.device-icon,
.history-icon {
    width: 50px;
    height: 50px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #f3f4f6;
    font-size: 23px;
}

.recent-info {
    flex: 1;
}

.recent-info strong,
.recent-info span,
.recent-info small {
    display: block;
}

.recent-info span,
.recent-info small {
    margin-top: 4px;
    color: #6b7280;
}

.recent-time {
    text-align: right;
}

.recent-time small {
    display: block;
    margin-top: 7px;
    color: #6b7280;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 13px;
}

.history-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    gap: 18px;
}

.history-main {
    flex: 1;
}

.history-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
}

.history-top h3 {
    margin: 0;
}

.history-main p {
    margin: 7px 0;
    color: #6b7280;
}

.history-main small {
    display: block;
    margin-top: 7px;
    color: #6b7280;
}

.status {
    display: inline-block;
    padding: 5px 9px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
}

.status.success {
    background: #dcfce7;
    color: #166534;
}

.status.failed {
    background: #fee2e2;
    color: #991b1b;
}

.status.warning {
    background: #fef3c7;
    color: #92400e;
}

.status.neutral {
    background: #e5e7eb;
    color: #374151;
}

.badges {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 10px;
}

.badge {
    padding: 5px 9px;
    border-radius: 20px;
    background: #fef3c7;
    color: #92400e;
    font-size: 11px;
    font-weight: 600;
}

.badge.green {
    background: #dcfce7;
    color: #166534;
}

.devices-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
}

.device-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 17px;
    padding: 22px;
}

.device-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.device-large-icon {
    width: 55px;
    height: 55px;
    border-radius: 14px;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
}

.trusted-label {
    color: #166534;
    background: #dcfce7;
    padding: 6px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
}

.device-card h3 {
    margin-bottom: 5px;
}

.device-card p {
    margin: 7px 0;
    color: #6b7280;
}

.device-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 18px 0;
    padding: 13px;
    border-radius: 10px;
    background: #f9fafb;
    color: #6b7280;
    font-size: 12px;
}

.revoke-button,
.danger-button {
    border: none;
    cursor: pointer;
    border-radius: 9px;
    padding: 10px 15px;
    font-weight: 600;
}

.revoke-button {
    width: 100%;
    background: #fee2e2;
    color: #991b1b;
}

.revoke-button:hover {
    background: #fecaca;
}

.revoke-button:disabled {
    opacity: .6;
    cursor: not-allowed;
}

.danger-button {
    background: #dc2626;
    color: white;
}

.device-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.empty-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 45px 25px;
    text-align: center;
    color: #6b7280;
}

.empty-icon {
    font-size: 40px;
    margin-bottom: 10px;
}

.empty-card h3 {
    color: #111827;
}

.security-loading,
.security-empty {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #111827;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.alert {
    max-width: 1200px;
    margin: 0 auto 18px;
    padding: 13px 17px;
    border-radius: 10px;
    font-weight: 600;
}

.error-alert {
    background: #fee2e2;
    color: #991b1b;
}

.success-alert {
    background: #dcfce7;
    color: #166534;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 900px) {
    .summary-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .devices-grid,
    .overview-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 650px) {
    .security-page {
        padding: 18px;
    }

    .security-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .security-header h1 {
        font-size: 28px;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }

    .tabs {
        overflow-x: auto;
    }

    .tab {
        min-width: 130px;
    }

    .recent-login,
    .history-card {
        align-items: flex-start;
    }

    .recent-login {
        flex-wrap: wrap;
    }

    .recent-time {
        width: 100%;
        text-align: left;
    }

    .history-top {
        align-items: flex-start;
        flex-direction: column;
    }
}
`;