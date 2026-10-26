import amqp from "amqplib";
import env from "../config/env.js";

let connection = null;
let channel = null;
let connecting = null;

async function open() {
    if (!env.rabbit.url) throw new Error("RabbitMQ is not configured (set RABBITMQ_URL or RABBITMQ_HOST)");

    const conn = await amqp.connect(env.rabbit.url);
    const ch = await conn.createConfirmChannel();
    await ch.assertExchange(env.rabbit.exchange, "topic", { durable: true });
    await ch.assertQueue(env.rabbit.queue, { durable: true });
    await ch.bindQueue(env.rabbit.queue, env.rabbit.exchange, env.rabbit.routingKey);

    const reset = () => {
        connection = null;
        channel = null;
    };
    conn.on("error", (error) => console.error("[RabbitMQ] Connection error:", error.message));
    conn.on("close", () => {
        console.warn("[RabbitMQ] Connection closed");
        reset();
    });
    ch.on("error", (error) => console.error("[RabbitMQ] Channel error:", error.message));
    ch.on("close", reset);

    connection = conn;
    channel = ch;
    console.log("[RabbitMQ] Connected");
    return ch;
}

export async function connectRabbit() {
    if (channel) return channel;
    if (!connecting) {
        connecting = open().finally(() => {
            connecting = null;
        });
    }
    return connecting;
}

/** Publishes in-app messages and waits for broker confirms. Returns the number confirmed. */
export async function publishInAppBatch(messages) {
    const ch = await connectRabbit();
    for (const message of messages) {
        const ok = ch.publish(env.rabbit.exchange, env.rabbit.routingKey, Buffer.from(JSON.stringify(message)), {
            persistent: true,
            contentType: "application/json",
        });
        if (!ok) await new Promise((resolve) => ch.once("drain", resolve));
    }
    await ch.waitForConfirms();
    return messages.length;
}

export async function closeRabbit() {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
    } catch (error) {
        console.error("[RabbitMQ] Error while closing:", error.message);
    }
}
