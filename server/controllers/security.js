import LoginHistory from "../Modals/loginHistory.js";
import TrustedDevice from "../Modals/trustedDevice.js";
import OtpVerification from "../Modals/otpVerification.js";

/*
|--------------------------------------------------------------------------
| SECURITY DASHBOARD
|--------------------------------------------------------------------------
| Returns all security-related information for a user:
| - Login history
| - OTP history
| - Trusted devices
| - Security summary
|--------------------------------------------------------------------------
*/

const getSecurityDashboard = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const [
            loginHistory,
            otpHistory,
            trustedDevices,
        ] = await Promise.all([
            LoginHistory.find({ userid: id })
                .sort({ loginTimestamp: -1 })
                .limit(100)
                .lean(),

            OtpVerification.find({ userid: id })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),

            TrustedDevice.find({
                userid: id,
                isActive: true,
            })
                .sort({ lastUsedAt: -1 })
                .lean(),
        ]);

        const successfulLogins = loginHistory.filter(
            (login) => login.loginStatus === "success"
        ).length;

        const pendingOtpLogins = loginHistory.filter(
            (login) => login.loginStatus === "pending_otp"
        ).length;

        const failedLogins = loginHistory.filter(
            (login) => login.loginStatus === "failed"
        ).length;

        const verifiedOtps = otpHistory.filter(
            (otp) => otp.status === "verified"
        ).length;

        const failedOtps = otpHistory.filter(
            (otp) => otp.status === "failed"
        ).length;

        const activeTrustedDevices = trustedDevices.filter(
            (device) =>
                device.isActive === true &&
                (!device.trustedUntil ||
                    new Date(device.trustedUntil) > new Date())
        ).length;

        return res.status(200).json({
            success: true,

            summary: {
                totalLogins: loginHistory.length,
                successfulLogins,
                pendingOtpLogins,
                failedLogins,

                totalOtpRequests: otpHistory.length,
                verifiedOtps,
                failedOtps,

                trustedDevices: activeTrustedDevices,
            },

            loginHistory,
            otpHistory,
            trustedDevices,
        });
    } catch (error) {
        console.error("Security dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load security dashboard",
            error: error.message,
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET LOGIN HISTORY
|--------------------------------------------------------------------------
*/

const getSecurityLoginHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const history = await LoginHistory.find({
            userid: id,
        })
            .sort({ loginTimestamp: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            success: true,
            history,
        });
    } catch (error) {
        console.error("Login history error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch login history",
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET OTP HISTORY
|--------------------------------------------------------------------------
*/

const getOtpHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const history = await OtpVerification.find({
            userid: id,
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            success: true,
            history,
        });
    } catch (error) {
        console.error("OTP history error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch OTP history",
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET TRUSTED DEVICES
|--------------------------------------------------------------------------
*/

const getTrustedDevices = async (req, res) => {
    try {
        const { id } = req.params;

        const devices = await TrustedDevice.find({
            userid: id,
            isActive: true,
        })
            .sort({ lastUsedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            devices,
        });
    } catch (error) {
        console.error("Trusted devices error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch trusted devices",
        });
    }
};


/*
|--------------------------------------------------------------------------
| REVOKE SINGLE TRUSTED DEVICE
|--------------------------------------------------------------------------
*/

const revokeTrustedDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { id } = req.body;

        if (!deviceId || !id) {
            return res.status(400).json({
                success: false,
                message: "Device ID and user ID are required",
            });
        }

        const device = await TrustedDevice.findOne({
            _id: deviceId,
            userid: id,
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Trusted device not found",
            });
        }

        device.isActive = false;
        device.revokedAt = new Date();

        await device.save();

        return res.status(200).json({
            success: true,
            message: "Trusted device revoked successfully",
        });
    } catch (error) {
        console.error("Revoke device error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to revoke trusted device",
        });
    }
};


/*
|--------------------------------------------------------------------------
| REVOKE ALL TRUSTED DEVICES
|--------------------------------------------------------------------------
*/

const revokeAllTrustedDevices = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const result = await TrustedDevice.updateMany(
            {
                userid: id,
                isActive: true,
            },
            {
                $set: {
                    isActive: false,
                    revokedAt: new Date(),
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: "All trusted devices revoked successfully",
            revokedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Revoke all devices error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to revoke trusted devices",
        });
    }
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export {
    getSecurityDashboard,
    getSecurityLoginHistory,
    getOtpHistory,
    getTrustedDevices,
    revokeTrustedDevice,
    revokeAllTrustedDevices,
};