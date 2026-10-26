import rateLimit from "express-rate-limit";
import env from "../config/env.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * The auth cookie is SameSite=strict; this additionally rejects state-changing
 * requests whose Origin is present but not one of the allowed client origins.
 */
export function verifyOrigin(req, res, next) {
    if (!UNSAFE_METHODS.has(req.method)) return next();
    const origin = req.get("origin");
    if (origin && !env.clientOrigins.includes(origin)) {
        return res.status(403).json({ success: false, message: "Origin not allowed" });
    }
    next();
}

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please slow down" },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many login attempts, try again later" },
});
