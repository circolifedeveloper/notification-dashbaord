import crypto from "crypto";
import env from "../config/env.js";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

/** Hash is bound to the email so a leaked hash cannot be replayed for another account. */
export function hashOtp(email, otp) {
    return crypto.createHmac("sha256", env.jwtSecret).update(`${email}:${otp}`).digest("hex");
}

export function otpMatches(email, otp, storedHash) {
    if (!storedHash) return false;
    const candidate = Buffer.from(hashOtp(email, otp), "hex");
    const stored = Buffer.from(storedHash, "hex");
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}
