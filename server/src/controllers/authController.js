import DashboardUser from "../models/DashboardUser.js";
import { sendOtpEmail } from "../services/mailService.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { badRequest, tooMany, unauthorized } from "../utils/httpError.js";
import {
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_MS,
    OTP_TTL_MS,
    generateOtp,
    hashOtp,
    otpMatches,
} from "../utils/otp.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEmail(body) {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email) || email.length > 254) throw badRequest("Enter a valid email address");
    return email;
}

const GENERIC_SENT = "If this email belongs to a dashboard account, a login code has been sent.";

export async function sendOtp(req, res) {
    const email = readEmail(req.body);
    const user = await DashboardUser.findOne({ email }).select("+otpLastSentAt");

    if (!user || !user.isActive) {
        return res.json({ success: true, message: GENERIC_SENT });
    }

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil(
            (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000
        );
        throw tooMany(`Please wait ${waitSeconds}s before requesting a new code`);
    }

    const otp = generateOtp();
    user.otpHash = hashOtp(email, otp);
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    await sendOtpEmail({ to: email, name: user.name, otp });

    res.json({ success: true, message: GENERIC_SENT });
}

export async function verifyOtp(req, res) {
    const email = readEmail(req.body);
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : String(req.body?.otp ?? "");
    if (!/^\d{6}$/.test(otp)) throw badRequest("Enter the 6-digit code");

    const user = await DashboardUser.findOne({ email }).select("+otpHash +otpExpiresAt +otpAttempts");
    if (!user || !user.isActive || !user.otpHash) throw unauthorized("Invalid or expired code");

    if (!user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        await user.save();
        throw unauthorized("Code expired, request a new one");
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        await user.save();
        throw tooMany("Too many wrong attempts, request a new code");
    }

    if (!otpMatches(email, otp, user.otpHash)) {
        user.otpAttempts += 1;
        await user.save();
        const left = OTP_MAX_ATTEMPTS - user.otpAttempts;
        throw unauthorized(left > 0 ? `Incorrect code, ${left} attempt(s) left` : "Too many wrong attempts, request a new code");
    }

    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    setAuthCookie(res, user);
    res.json({ success: true, data: user.toSafeJSON() });
}

export async function me(req, res) {
    res.json({ success: true, data: req.user.toSafeJSON() });
}

export async function logout(req, res) {
    clearAuthCookie(res);
    res.json({ success: true, message: "Logged out" });
}
