import mongoose from "mongoose";
import {
    APP_SCREENS,
    APP_USER_ROLES,
    AUDIENCE_MODES,
    CONTENT_TYPES,
    DEFAULT_SCREEN,
    IMAGE_MIME_TYPES,
    MAX_BUTTONS,
    MAX_CONTENT_ITEMS,
    MAX_COUNTDOWNS,
    MAX_IMAGES,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_SUBCATEGORIES,
} from "../constants.js";
import { badRequest } from "./httpError.js";

const MAX_URL_LENGTH = 2000;
const MAX_SELECTED_CUSTOMERS = 1000;

export function isObjectId(value) {
    return typeof value === "string" && mongoose.isValidObjectId(value) && /^[0-9a-fA-F]{24}$/.test(value);
}

export function assertObjectId(value, field = "id") {
    if (!isObjectId(value)) throw badRequest(`Invalid ${field}`);
    return value;
}

function text(value, field, { required = false, max = 200 } = {}) {
    if (value == null || value === "") {
        if (required) throw badRequest(`${field} is required`);
        return undefined;
    }
    if (typeof value !== "string") throw badRequest(`${field} must be text`);
    const trimmed = value.trim();
    if (required && !trimmed) throw badRequest(`${field} is required`);
    if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`);
    return trimmed || undefined;
}

function httpUrl(value, field, { required = false } = {}) {
    const raw = text(value, field, { required, max: MAX_URL_LENGTH });
    if (!raw) return undefined;
    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        throw badRequest(`${field} must be an http or https URL`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw badRequest(`${field} must be an http or https URL`);
    }
    return raw;
}

function matchEnum(value, allowed, field) {
    if (typeof value !== "string") throw badRequest(`${field} is required`);
    const found = allowed.find((item) => item.toLowerCase() === value.trim().toLowerCase());
    if (!found) throw badRequest(`${field} must be one of: ${allowed.join(", ")}`);
    return found;
}

function normalizeContentItem(item, index) {
    const at = `content[${index + 1}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) throw badRequest(`${at} must be an object`);
    const type = matchEnum(item.type, CONTENT_TYPES, `${at}.type`);
    const out = { type };

    if (type === "image") {
        out.url = httpUrl(item.url, "Image URL", { required: true });
        out.key = text(item.key, "Image path", { max: 500 });
        out.fileName = text(item.fileName, "Image file name", { max: 200 });
        out.mimeType = text(item.mimeType, "Image type", { max: 100 });
        if (out.mimeType && !IMAGE_MIME_TYPES.includes(out.mimeType)) {
            throw badRequest("Image must be a JPG, PNG or WEBP file");
        }
    }
    if (type === "button") {
        out.label = text(item.label, "Button label", { required: true, max: 30 });
        const action = item.action === "url" || (item.url && !item.screen) ? "url" : "screen";
        if (action === "url") {
            out.url = httpUrl(item.url, `Button "${out.label}" URL`, { required: true });
        } else {
            out.screen = matchEnum(item.screen || DEFAULT_SCREEN, APP_SCREENS, `Button "${out.label}" screen`);
        }
    }
    if (type === "countdown") {
        out.label = text(item.label, "Countdown label", { max: 80 }) || "Offer ends in";
        const endsAt = new Date(item.endsAt);
        if (!item.endsAt || Number.isNaN(endsAt.getTime())) throw badRequest("Offer end time must be a valid date");
        if (endsAt.getTime() <= Date.now()) throw badRequest("Offer end time must be in the future");
        out.endsAt = endsAt;
    }

    return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== undefined));
}

function normalizeContent(raw) {
    const list = raw == null ? [] : raw;
    if (!Array.isArray(list)) throw badRequest("content must be a list");
    if (list.length > MAX_CONTENT_ITEMS) {
        throw badRequest(`A notification can include ${MAX_IMAGES} image, ${MAX_COUNTDOWNS} countdown and ${MAX_BUTTONS} buttons at most`);
    }
    const content = list.map(normalizeContentItem);
    const images = content.filter((item) => item.type === "image");
    const buttons = content.filter((item) => item.type === "button");
    const countdowns = content.filter((item) => item.type === "countdown");
    if (images.length > MAX_IMAGES) throw badRequest(`Only ${MAX_IMAGES} image is allowed`);
    if (buttons.length > MAX_BUTTONS) throw badRequest(`At most ${MAX_BUTTONS} buttons are allowed`);
    if (countdowns.length > MAX_COUNTDOWNS) throw badRequest("Only one offer countdown is allowed");
    return [...images, ...countdowns, ...buttons];
}

export function normalizeAudience(raw) {
    if (!raw || typeof raw !== "object") throw badRequest("audience is required");
    const mode = matchEnum(raw.mode, AUDIENCE_MODES, "audience.mode");

    const needsCustomers = mode === "customers" || mode === "customersAndRoles";
    const needsRoles = mode === "roles" || mode === "customersAndRoles";

    let customerIds = [];
    if (needsCustomers) {
        if (!Array.isArray(raw.customerIds) || raw.customerIds.length === 0) {
            throw badRequest("Select at least one customer");
        }
        if (raw.customerIds.length > MAX_SELECTED_CUSTOMERS) {
            throw badRequest(`You can select at most ${MAX_SELECTED_CUSTOMERS} customers`);
        }
        customerIds = [...new Set(raw.customerIds.map((id) => assertObjectId(String(id), "customer id")))];
    }

    let roles = [];
    if (needsRoles) {
        if (!Array.isArray(raw.roles) || raw.roles.length === 0) throw badRequest("Select at least one role");
        roles = [...new Set(raw.roles.map((role) => matchEnum(role, APP_USER_ROLES, "audience.roles")))];
    }

    return { mode, customerIds, roles };
}

export function normalizeBroadcastInput(body = {}) {
    const title = text(body.title, "Title", { required: true, max: 120 });
    const message = text(body.body, "Message", { required: true, max: 1000 });
    const category = matchEnum(body.category, NOTIFICATION_CATEGORIES, "Category");
    const subCategory = matchEnum(body.subCategory, NOTIFICATION_SUBCATEGORIES, "Sub category");
    const screen = body.screen ? matchEnum(body.screen, APP_SCREENS, "Open screen") : DEFAULT_SCREEN;
    const content = normalizeContent(body.content);

    let scheduledAt = null;
    if (body.scheduledAt) {
        const date = new Date(body.scheduledAt);
        if (Number.isNaN(date.getTime())) throw badRequest("Schedule time must be a valid date");
        if (date.getTime() < Date.now() - 60 * 1000) throw badRequest("Schedule time must be in the future");
        scheduledAt = date;
    }

    return {
        title,
        body: message,
        category,
        subCategory,
        screen,
        content,
        audience: normalizeAudience(body.audience),
        scheduledAt,
    };
}

export function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
