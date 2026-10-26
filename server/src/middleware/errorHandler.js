import mongoose from "mongoose";
import { HttpError } from "../utils/httpError.js";

export function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({
            success: false,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }

    if (err instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
            success: false,
            message: Object.values(err.errors)[0]?.message || "Validation failed",
        });
    }

    if (err instanceof mongoose.Error.CastError) {
        return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
    }

    if (err.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "Request body is too large" });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid JSON body" });
    }

    console.error("[Error]", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
}
