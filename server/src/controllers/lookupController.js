import {
    APP_SCREENS,
    APP_USER_ROLES,
    AUDIENCE_MODES,
    BROADCAST_STATUS,
    CONTENT_TYPES,
    DEFAULT_SCREEN,
    IMAGE_MIME_TYPES,
    MAX_BUTTONS,
    MAX_COUNTDOWNS,
    MAX_IMAGES,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_SUBCATEGORIES,
} from "../constants.js";
import { customersCollection } from "../config/collections.js";
import { previewAudience } from "../services/audienceService.js";
import { escapeRegex, normalizeAudience, parsePagination } from "../utils/validation.js";

export function enums(req, res) {
    res.json({
        success: true,
        data: {
            categories: NOTIFICATION_CATEGORIES,
            subCategories: NOTIFICATION_SUBCATEGORIES,
            targetRoles: APP_USER_ROLES,
            audienceModes: AUDIENCE_MODES,
            contentTypes: CONTENT_TYPES,
            statuses: Object.values(BROADCAST_STATUS),
            appScreens: APP_SCREENS,
            defaultScreen: DEFAULT_SCREEN,
            maxImages: MAX_IMAGES,
            maxButtons: MAX_BUTTONS,
            maxCountdowns: MAX_COUNTDOWNS,
            imageMimeTypes: IMAGE_MIME_TYPES,
        },
    });
}

export async function customers(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const filter = { visibility: { $ne: false } };
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    if (search) {
        const re = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ customerName: re }, { brandName: re }, { billingName: re }, { customerId: re }, { email: re }];
    }

    const customers = customersCollection();
    const [items, total] = await Promise.all([
        customers
            .find(filter, { projection: { customerId: 1, customerName: 1, brandName: 1, email: 1 } })
            .sort({ customerName: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        customers.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

export async function audiencePreview(req, res) {
    const audience = normalizeAudience(req.body?.audience ?? req.body);
    const data = await previewAudience(audience);
    res.json({ success: true, data });
}
