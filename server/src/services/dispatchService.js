import Broadcast from "../models/Broadcast.js";
import { notificationsCollection, usersCollection } from "../config/collections.js";
import { BROADCAST_STATUS } from "../constants.js";
import { buildUserFilter, customerForUser } from "./audienceService.js";
import { connectRabbit, publishInAppBatch } from "./rabbitmqService.js";
import { broadcastExtras, buildNotificationDoc, buildQueueMessage } from "./inAppMessage.js";

const BATCH_SIZE = 500;
const SYSTEM_ACTOR = { name: "System" };

const running = new Set();

async function markFailed(id, message, fromStatus) {
    await Broadcast.updateOne(
        { _id: id, status: fromStatus },
        {
            $set: { status: BROADCAST_STATUS.FAILED },
            $push: { history: { action: "failed", by: SYSTEM_ACTOR, note: message.slice(0, 1000), at: new Date() } },
        }
    );
}

async function processBatch(broadcast, users, extras) {
    const withToken = users.filter((user) => typeof user.notificationId === "string" && user.notificationId.trim());
    const skippedNoToken = users.length - withToken.length;
    if (!withToken.length) return { delivered: 0, failed: 0, skippedNoToken };

    const now = new Date();
    const docs = withToken.map((user) =>
        buildNotificationDoc(broadcast, user, customerForUser(user, broadcast.audience), now)
    );

    let inserted = docs;
    try {
        await notificationsCollection().insertMany(docs, { ordered: false });
    } catch (error) {
        const failedIndexes = new Set((error.writeErrors || []).map((writeError) => writeError.index));
        inserted = failedIndexes.size ? docs.filter((_, index) => !failedIndexes.has(index)) : [];
        console.error(`[Dispatch] ${docs.length - inserted.length} notification inserts failed:`, error.message);
    }

    const messages = inserted.map((doc) => buildQueueMessage(doc, broadcast, extras));
    let delivered = 0;
    try {
        delivered = await publishInAppBatch(messages);
    } catch (error) {
        console.error("[Dispatch] Publishing batch failed:", error.message);
    }

    return { delivered, failed: withToken.length - delivered, skippedNoToken };
}

/**
 * Delivers an approved broadcast. Safe to call more than once: only the caller that
 * moves the broadcast from `approved` to `inProgress` does the work.
 */
export async function dispatchBroadcast(id) {
    const key = String(id);
    if (running.has(key)) return;
    running.add(key);

    try {
        try {
            await connectRabbit();
        } catch (error) {
            await markFailed(id, `RabbitMQ unavailable: ${error.message}`, BROADCAST_STATUS.APPROVED);
            return;
        }

        const broadcast = await Broadcast.findOneAndUpdate(
            {
                _id: id,
                status: BROADCAST_STATUS.APPROVED,
                $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
            },
            {
                $set: {
                    status: BROADCAST_STATUS.IN_PROGRESS,
                    stats: { targeted: 0, delivered: 0, skippedNoToken: 0, failed: 0 },
                },
                $push: { history: { action: "inProgress", by: SYSTEM_ACTOR, at: new Date() } },
            },
            { returnDocument: "after" }
        ).lean();
        if (!broadcast) return;

        try {
            const filter = buildUserFilter(broadcast.audience);
            const users = usersCollection();
            const targeted = await users.countDocuments(filter);
            await Broadcast.updateOne({ _id: id }, { $set: { "stats.targeted": targeted } });

            const extras = broadcastExtras(broadcast.content || []);
            const totals = { delivered: 0, failed: 0, skippedNoToken: 0 };
            const cursor = users
                .find(filter, { projection: { _id: 1, customerId: 1, role: 1, customerIds: 1, notificationId: 1 } })
                .batchSize(BATCH_SIZE);

            let batch = [];
            const flush = async () => {
                if (!batch.length) return;
                const result = await processBatch(broadcast, batch, extras);
                batch = [];
                totals.delivered += result.delivered;
                totals.failed += result.failed;
                totals.skippedNoToken += result.skippedNoToken;
                await Broadcast.updateOne(
                    { _id: id },
                    {
                        $inc: {
                            "stats.delivered": result.delivered,
                            "stats.failed": result.failed,
                            "stats.skippedNoToken": result.skippedNoToken,
                        },
                    }
                );
            };

            for await (const user of cursor) {
                batch.push(user);
                if (batch.length >= BATCH_SIZE) await flush();
            }
            await flush();

            const allFailed = totals.delivered === 0 && totals.failed > 0;
            const note = `Targeted ${targeted}, delivered ${totals.delivered}, no device token ${totals.skippedNoToken}, failed ${totals.failed}`;
            await Broadcast.updateOne(
                { _id: id },
                {
                    $set: {
                        status: allFailed ? BROADCAST_STATUS.FAILED : BROADCAST_STATUS.SENT,
                        ...(allFailed ? {} : { sentAt: new Date() }),
                    },
                    $push: {
                        history: { action: allFailed ? "failed" : "sent", by: SYSTEM_ACTOR, note, at: new Date() },
                    },
                }
            );
            console.log(`[Dispatch] Broadcast ${id}: ${note}`);
        } catch (error) {
            await markFailed(id, error.message, BROADCAST_STATUS.IN_PROGRESS);
            throw error;
        }
    } finally {
        running.delete(key);
    }
}
