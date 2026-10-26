import mongoose from "mongoose";
import Broadcast from "../models/Broadcast.js";
import { customersCollection } from "../config/collections.js";
import { BROADCAST_STATUS, DASHBOARD_ROLES, EDITABLE_STATUSES } from "../constants.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { escapeRegex, isObjectId, normalizeBroadcastInput, parsePagination } from "../utils/validation.js";
import { dispatchBroadcast } from "./dispatchService.js";

export function actorOf(user) {
    return { id: user._id, name: user.name, email: user.email, role: user.role };
}

function isDue(broadcast) {
    return !broadcast.scheduledAt || broadcast.scheduledAt.getTime() <= Date.now();
}

export async function createBroadcast(user, body) {
    const input = normalizeBroadcastInput(body);
    const by = actorOf(user);
    const broadcast = await Broadcast.create({
        ...input,
        status: BROADCAST_STATUS.PENDING,
        createdBy: by,
        history: [{ action: "created", by }],
    });
    return broadcast;
}

export async function listBroadcasts(user, query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 10 });
    const filter = {};

    if (query.status) {
        const statuses = String(query.status).split(",").filter((s) => Object.values(BROADCAST_STATUS).includes(s));
        if (statuses.length) filter.status = { $in: statuses };
    }
    if (query.category) filter.category = String(query.category);
    if (query.audienceMode) filter["audience.mode"] = String(query.audienceMode);
    if (query.createdBy === "me") filter["createdBy.id"] = user._id;
    else if (isObjectId(query.createdBy)) filter["createdBy.id"] = new mongoose.Types.ObjectId(query.createdBy);

    const createdAt = {};
    if (query.from) {
        const from = new Date(query.from);
        if (!Number.isNaN(from.getTime())) createdAt.$gte = from;
    }
    if (query.to) {
        const to = new Date(query.to);
        if (!Number.isNaN(to.getTime())) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setUTCHours(23, 59, 59, 999);
            createdAt.$lte = to;
        }
    }
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;

    const search = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
    if (search) {
        const re = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ title: re }, { body: re }, { "createdBy.name": re }, { "createdBy.email": re }];
    }

    const [items, total] = await Promise.all([
        Broadcast.find(filter).select("-history").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Broadcast.countDocuments(filter),
    ]);

    return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getBroadcast(id) {
    const broadcast = await Broadcast.findById(id).lean();
    if (!broadcast) throw notFound("Broadcast not found");

    const customers = broadcast.audience?.customerIds?.length
        ? await customersCollection()
              .find(
                  { _id: { $in: broadcast.audience.customerIds } },
                  { projection: { customerId: 1, customerName: 1, brandName: 1 } }
              )
              .toArray()
        : [];

    return { ...broadcast, audienceCustomers: customers };
}

export async function updateBroadcast(user, id, body) {
    const broadcast = await Broadcast.findById(id);
    if (!broadcast) throw notFound("Broadcast not found");

    const isOwner = String(broadcast.createdBy?.id) === String(user._id);
    if (!isOwner && user.role !== DASHBOARD_ROLES.SUPER_ADMIN) {
        throw forbidden("Only the creator or a superAdmin can edit this broadcast");
    }
    if (!EDITABLE_STATUSES.includes(broadcast.status)) {
        throw conflict(`A ${broadcast.status} broadcast can no longer be edited`);
    }

    const input = normalizeBroadcastInput(body);
    const wasRejected = broadcast.status === BROADCAST_STATUS.REJECTED;

    Object.assign(broadcast, input);
    broadcast.status = BROADCAST_STATUS.PENDING;
    if (wasRejected) {
        broadcast.rejectionReason = undefined;
        broadcast.reviewedBy = undefined;
        broadcast.reviewedAt = undefined;
    }
    broadcast.history.push({ action: wasRejected ? "resubmitted" : "updated", by: actorOf(user) });
    await broadcast.save();
    return broadcast;
}

export async function approveBroadcast(user, id, note) {
    const by = actorOf(user);
    const comment = typeof note === "string" ? note.trim().slice(0, 500) : "";

    const broadcast = await Broadcast.findOneAndUpdate(
        { _id: id, status: BROADCAST_STATUS.PENDING },
        {
            $set: { status: BROADCAST_STATUS.APPROVED, reviewedBy: by, reviewedAt: new Date() },
            $unset: { rejectionReason: 1 },
            $push: { history: { action: "approved", by, ...(comment ? { note: comment } : {}), at: new Date() } },
        },
        { returnDocument: "after" }
    );

    if (!broadcast) {
        const exists = await Broadcast.exists({ _id: id });
        if (!exists) throw notFound("Broadcast not found");
        throw conflict("Only pending broadcasts can be approved");
    }

    if (isDue(broadcast)) {
        dispatchBroadcast(broadcast._id).catch((error) =>
            console.error(`[Dispatch] Broadcast ${broadcast._id} failed:`, error.message)
        );
    }
    return broadcast;
}

export async function rejectBroadcast(user, id, reason) {
    const text = typeof reason === "string" ? reason.trim() : "";
    if (text.length < 3) throw badRequest("Please give a reason for rejecting (at least 3 characters)");
    if (text.length > 1000) throw badRequest("Reason must be at most 1000 characters");

    const by = actorOf(user);
    const broadcast = await Broadcast.findOneAndUpdate(
        { _id: id, status: BROADCAST_STATUS.PENDING },
        {
            $set: {
                status: BROADCAST_STATUS.REJECTED,
                rejectionReason: text,
                reviewedBy: by,
                reviewedAt: new Date(),
            },
            $push: { history: { action: "rejected", by, note: text, at: new Date() } },
        },
        { returnDocument: "after" }
    );

    if (!broadcast) {
        const exists = await Broadcast.exists({ _id: id });
        if (!exists) throw notFound("Broadcast not found");
        throw conflict("Only pending broadcasts can be rejected");
    }
    return broadcast;
}

async function safeAggregate(pipeline, fallback = []) {
    try {
        return await Broadcast.aggregate(pipeline);
    } catch (error) {
        console.error("[Stats] Aggregation failed:", error.message);
        return fallback;
    }
}

function emptyTrend() {
    const days = [];
    for (let i = 29; i >= 0; i -= 1) {
        days.push({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            created: 0,
            sent: 0,
            rejected: 0,
        });
    }
    return days;
}

export async function getStats() {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 29);

    const statuses = Object.values(BROADCAST_STATUS);
    const countEntries = await Promise.all(
        statuses.map(async (status) => [status, await Broadcast.countDocuments({ status })])
    );
    const counts = Object.fromEntries(countEntries);
    const total = await Broadcast.countDocuments();

    const [byAudience, delivery, trend] = await Promise.all([
        safeAggregate([{ $group: { _id: "$audience.mode", count: { $sum: 1 } } }]),
        safeAggregate([
            {
                $group: {
                    _id: null,
                    targeted: { $sum: { $ifNull: ["$stats.targeted", 0] } },
                    delivered: { $sum: { $ifNull: ["$stats.delivered", 0] } },
                    skippedNoToken: { $sum: { $ifNull: ["$stats.skippedNoToken", 0] } },
                    failed: { $sum: { $ifNull: ["$stats.failed", 0] } },
                },
            },
        ]),
        safeAggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    created: { $sum: 1 },
                    sent: { $sum: { $cond: [{ $eq: ["$status", BROADCAST_STATUS.SENT] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ["$status", BROADCAST_STATUS.REJECTED] }, 1, 0] } },
                },
            },
        ]),
    ]);

    const trendMap = new Map(trend.map((row) => [row._id, row]));
    const days = emptyTrend().map((day) => {
        const row = trendMap.get(day.date);
        return row ? { date: day.date, created: row.created || 0, sent: row.sent || 0, rejected: row.rejected || 0 } : day;
    });

    const deliveryRow = delivery[0] || {};
    return {
        total,
        counts,
        byAudience: Object.fromEntries(byAudience.filter((row) => row._id).map((row) => [row._id, row.count])),
        delivery: {
            targeted: deliveryRow.targeted || 0,
            delivered: deliveryRow.delivered || 0,
            skippedNoToken: deliveryRow.skippedNoToken || 0,
            failed: deliveryRow.failed || 0,
        },
        trend: days,
    };
}
