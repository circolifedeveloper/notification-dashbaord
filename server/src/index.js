import env from "./config/env.js";
import { connectDb } from "./config/db.js";
import app from "./app.js";
import { connectRabbit, closeRabbit } from "./services/rabbitmqService.js";
import { startScheduler, stopScheduler } from "./services/schedulerService.js";
import mongoose from "mongoose";

async function start() {
    await connectDb();

    try {
        await connectRabbit();
    } catch (error) {
        console.error("[RabbitMQ] Not connected at startup; delivery will retry on demand:", error.message);
    }

    const server = app.listen(env.port, () => {
        console.log(`[Server] Notification dashboard API listening on port ${env.port}`);
    });

    startScheduler();

    const shutdown = async (signal) => {
        console.log(`[Server] ${signal} received, shutting down`);
        stopScheduler();
        server.close();
        await closeRabbit();
        await mongoose.disconnect();
        process.exit(0);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
});
