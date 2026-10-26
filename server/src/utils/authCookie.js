import jwt from "jsonwebtoken";
import env from "../config/env.js";

function cookieOptions() {
    return {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "strict",
        path: "/",
    };
}

export function setAuthCookie(res, user) {
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
        algorithm: "HS256",
    });
    res.cookie(env.cookieName, token, { ...cookieOptions(), maxAge: env.cookieMaxAgeMs });
}

export function clearAuthCookie(res) {
    res.clearCookie(env.cookieName, cookieOptions());
}

export function verifyAuthToken(token) {
    return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
}
