/**
 * Builds the per-user notification document and the `inAppQueue` message in the
 * shape NotificationEngine already consumes (see its parseMessage / FCM sender).
 */
import mongoose from "mongoose";
import { DEFAULT_SCREEN } from "../constants.js";

const toStr = (value) => (value == null ? "" : String(value));
const iso = (value) => (value ? new Date(value).toISOString() : "");

export function broadcastExtras(content = []) {
    const image = content.find((item) => item.type === "image");
    const button = content.find((item) => item.type === "button");
    const countdown = content.find((item) => item.type === "countdown");
    const buttons = content
        .filter((item) => item.type === "button")
        .map((item) => ({
            label: item.label || "Open",
            ...(item.url ? { url: item.url } : {}),
            ...(item.screen ? { screen: item.screen } : {}),
        }));

    return {
        imageUrl: image?.url,
        button: buttons[0],
        countdown: countdown ? { label: countdown.label || "Ends in", endsAt: countdown.endsAt } : undefined,
        buttons,
    };
}

const NOTIFICATION_CONTENT_FIELDS = ["type", "url", "thumbnailUrl", "fileName", "mimeType", "label", "endsAt"];

/**
 * Content stored on the user's notification, limited to the Common-Models content fields.
 * That schema has no `button` type or `screen` field, so buttons become `link` items; the
 * screen each button opens is delivered in the push payload (`buttons`, `buttonScreen`).
 */
export function notificationContent(content = []) {
    const items = content
        .map((item) => {
            if (item.type === "text") return null;
            const source = item.type === "button" ? { ...item, type: "link", label: item.label || "Open" } : item;
            return Object.fromEntries(
                NOTIFICATION_CONTENT_FIELDS.filter((field) => source[field] != null && source[field] !== "").map((field) => [
                    field,
                    source[field],
                ])
            );
        })
        .filter(Boolean);
    return items.length ? items : undefined;
}

/**
 * Raw document for the existing `notifications` collection, with the same fields Mongoose
 * writes for Common-Models/notificationModel.js. Undefined keys are left out because the
 * native driver would store them as null.
 */
export function buildNotificationDoc(broadcast, user, customerId, now = new Date()) {
    const content = notificationContent(broadcast.content);
    return {
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        title: broadcast.title,
        ...(customerId ? { customerId } : {}),
        notificationId: user.notificationId.trim(),
        category: broadcast.category,
        subCategory: broadcast.subCategory,
        isRead: false,
        body: broadcast.body,
        visibility: true,
        ...(content ? { content } : {}),
        createdAt: now,
        updatedAt: now,
        __v: 0,
    };
}

export function buildQueueMessage(notification, broadcast, extras) {
    const content = broadcast.content || [];
    const screen = broadcast.screen || extras.button?.screen || DEFAULT_SCREEN;
    const data = {
        id: toStr(notification._id),
        type: toStr(broadcast.category).toLowerCase(),
        title: broadcast.title,
        body: broadcast.body,
        screen,
        category: broadcast.category,
        notificationDbId: toStr(notification._id),
        imageUrl: extras.imageUrl || "",
        buttonLabel: extras.button?.label || "",
        buttonUrl: extras.button?.url || "",
        buttonScreen: extras.button?.screen || "",
        countdownLabel: extras.countdown?.label || "",
        countdownEndsAt: iso(extras.countdown?.endsAt),
        countdown_end_at: iso(extras.countdown?.endsAt),
        content: JSON.stringify(content),
        media: extras.imageUrl ? JSON.stringify({ type: "image", url: extras.imageUrl }) : "",
        buttons: JSON.stringify(extras.buttons),
        broadcastId: toStr(broadcast._id),
    };

    return {
        ...notification,
        notificationType: "inAppQueue",
        category: toStr(broadcast.category).toLowerCase(),
        screen,
        recipience: notification.notificationId,
        content,
        imageUrl: extras.imageUrl,
        button: extras.button,
        countdown: extras.countdown,
        buttons: extras.buttons,
        fcm: {
            token: notification.notificationId,
            notification: { title: broadcast.title, body: broadcast.body },
            data,
            android: {
                priority: "high",
                ttl: 86400000,
                notification: {
                    title: broadcast.title,
                    body: broadcast.body,
                    ...(extras.imageUrl ? { imageUrl: extras.imageUrl } : {}),
                },
            },
            apns: {
                headers: { "apns-push-type": "alert", "apns-priority": "10" },
                payload: {
                    aps: { alert: { title: broadcast.title, body: broadcast.body }, sound: "default", mutableContent: true },
                },
            },
        },
    };
}
