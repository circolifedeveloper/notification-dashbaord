import env from "../config/env.js";
import DashboardUser from "../models/DashboardUser.js";
import { clearAuthCookie, verifyAuthToken } from "../utils/authCookie.js";
import { forbidden, unauthorized } from "../utils/httpError.js";

export async function requireAuth(req, res, next) {
    const token = req.cookies?.[env.cookieName];
    if (!token) throw unauthorized();

    let payload;
    try {
        payload = verifyAuthToken(token);
    } catch {
        clearAuthCookie(res);
        throw unauthorized("Session expired, please log in again");
    }

    const user = await DashboardUser.findById(payload.id);
    if (!user || !user.isActive) {
        clearAuthCookie(res);
        throw unauthorized("Account is not active");
    }

    req.user = user;
    next();
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) throw forbidden();
        next();
    };
}
