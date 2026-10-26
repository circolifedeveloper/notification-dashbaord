import mongoose from "mongoose";
import { DASHBOARD_ROLES } from "../constants.js";

const dashboardUserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
        },
        role: {
            type: String,
            enum: Object.values(DASHBOARD_ROLES),
            required: true,
            default: DASHBOARD_ROLES.ADMIN,
        },
        isActive: { type: Boolean, default: true },
        lastLoginAt: { type: Date },
        otpHash: { type: String, select: false },
        otpExpiresAt: { type: Date, select: false },
        otpAttempts: { type: Number, default: 0, select: false },
        otpLastSentAt: { type: Date, select: false },
    },
    { timestamps: true, collection: "dashboardusers" }
);

dashboardUserSchema.methods.toSafeJSON = function toSafeJSON() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
        lastLoginAt: this.lastLoginAt,
    };
};

const DashboardUser = mongoose.model("DashboardUser", dashboardUserSchema);
export default DashboardUser;
