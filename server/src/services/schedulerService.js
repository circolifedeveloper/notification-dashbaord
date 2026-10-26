import Broadcast from "../models/Broadcast.js";
import { BROADCAST_STATUS } from "../constants.js";
import { dispatchBroadcast } from "./dispatchService.js";

const INTERVAL_MS = 60 * 1000;
let timer = null;
let ticking = false;

async function tick() {
    if (ticking) return;
    ticking = true;
    try {
        const due = await Broadcast.find({
            status: BROADCAST_STATUS.APPROVED,
            $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
        })
            .select("_id")
            .sort({ scheduledAt: 1 })
            .limit(20)
            .lean();

        for (const { _id } of due) {
            await dispatchBroadcast(_id).catch((error) =>
                console.error(`[Scheduler] Broadcast ${_id} failed:`, error.message)
            );
        }
    } catch (error) {
        console.error("[Scheduler] Tick failed:", error.message);
    } finally {
        ticking = false;
    }
}

/** A broadcast left `inProgress` by a crash cannot be resumed safely without duplicates. */
async function failInterrupted() {
    const result = await Broadcast.updateMany(
        { status: BROADCAST_STATUS.IN_PROGRESS },
        {
            $set: { status: BROADCAST_STATUS.FAILED },
            $push: {
                history: {
                    action: "failed",
                    by: { name: "System" },
                    note: "Delivery was interrupted by a server restart",
                    at: new Date(),
                },
            },
        }
    );
    if (result.modifiedCount) console.warn(`[Scheduler] Marked ${result.modifiedCount} interrupted broadcast(s) as failed`);
}

export function startScheduler() {
    if (timer) return;
    failInterrupted()
        .catch((error) => console.error("[Scheduler] Startup check failed:", error.message))
        .finally(() => {
            tick();
            timer = setInterval(tick, INTERVAL_MS);
        });
}

export function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
}
