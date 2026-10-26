import mongoose from "mongoose";
import {
    APP_USER_ROLES,
    AUDIENCE_MODES,
    BROADCAST_STATUS,
    DASHBOARD_ROLES,
    DEFAULT_SCREEN,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_SUBCATEGORIES,
    STORED_CONTENT_TYPES,
} from "../constants.js";

const { ObjectId } = mongoose.Schema.Types;

const contentItemSchema = new mongoose.Schema(
    {
        type: { type: String, enum: STORED_CONTENT_TYPES, required: true },
        text: { type: String, trim: true },
        url: { type: String, trim: true },
        /** S3 object key returned by the upload API (the presigned `url` expires). */
        key: { type: String, trim: true },
        thumbnailUrl: { type: String, trim: true },
        fileName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        label: { type: String, trim: true },
        screen: { type: String, trim: true },
        endsAt: { type: Date },
    },
    { _id: false }
);

const actorSchema = new mongoose.Schema(
    {
        id: { type: ObjectId, ref: "DashboardUser" },
        name: String,
        email: String,
        role: { type: String, enum: Object.values(DASHBOARD_ROLES) },
    },
    { _id: false }
);

const historySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ["created", "updated", "resubmitted", "approved", "rejected", "inProgress", "sent", "failed"],
            required: true,
        },
        by: actorSchema,
        note: { type: String, trim: true },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const broadcastSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        body: { type: String, required: true, trim: true, maxlength: 1000 },
        category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
        subCategory: { type: String, enum: NOTIFICATION_SUBCATEGORIES, required: true },
        content: { type: [contentItemSchema], default: [] },
        screen: { type: String, trim: true, default: DEFAULT_SCREEN },

        audience: {
            mode: { type: String, enum: AUDIENCE_MODES, required: true },
            customerIds: [{ type: ObjectId }],
            roles: [{ type: String, enum: APP_USER_ROLES }],
        },

        status: {
            type: String,
            enum: Object.values(BROADCAST_STATUS),
            default: BROADCAST_STATUS.PENDING,
            index: true,
        },
        scheduledAt: { type: Date },
        rejectionReason: { type: String, trim: true, maxlength: 1000 },

        createdBy: { type: actorSchema, required: true },
        reviewedBy: actorSchema,
        reviewedAt: { type: Date },
        sentAt: { type: Date },

        stats: {
            targeted: { type: Number, default: 0 },
            delivered: { type: Number, default: 0 },
            skippedNoToken: { type: Number, default: 0 },
            failed: { type: Number, default: 0 },
        },

        history: { type: [historySchema], default: [] },
    },
    { timestamps: true, collection: "broadcasts" }
);

broadcastSchema.index({ createdAt: -1 });
broadcastSchema.index({ "createdBy.id": 1, createdAt: -1 });
broadcastSchema.index({ status: 1, scheduledAt: 1 });

const Broadcast = mongoose.model("Broadcast", broadcastSchema);
export default Broadcast;
