export const NOTIFICATION_CATEGORIES = ["Subscription", "Query", "Info", "General"];

export const NOTIFICATION_SUBCATEGORIES = [
    "Success",
    "Failure",
    "Warning",
    "Announcement",
    "Information",
    "Reminder",
];

/** Roles of Circolife app users, used for audience targeting. */
export const APP_USER_ROLES = ["superAdmin", "admin", "guest"];

/** Roles of people who log in to this dashboard. */
export const DASHBOARD_ROLES = {
    ADMIN: "admin",
    SUPER_ADMIN: "superAdmin",
};

export const BROADCAST_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    IN_PROGRESS: "inProgress",
    SENT: "sent",
    FAILED: "failed",
};

export const EDITABLE_STATUSES = [BROADCAST_STATUS.PENDING, BROADCAST_STATUS.REJECTED];

export const AUDIENCE_MODES = ["allCustomers", "customers", "roles", "customersAndRoles"];

/** App screens a notification tap or a button can open. */
export const APP_SCREENS = [
    "referral",
    "request",
    "service",
    "subscription",
    "invoice",
    "analytics",
    "notification",
    "device",
];
export const DEFAULT_SCREEN = "notification";

/** Content a new broadcast may include: one image, one offer countdown, and up to two buttons. */
export const CONTENT_TYPES = ["image", "button", "countdown"];
export const MAX_IMAGES = 1;
export const MAX_BUTTONS = 2;
export const MAX_COUNTDOWNS = 1;
export const MAX_CONTENT_ITEMS = MAX_IMAGES + MAX_BUTTONS + MAX_COUNTDOWNS;

/** Types accepted when reading stored broadcasts, so older documents still load. */
export const STORED_CONTENT_TYPES = ["text", "image", "video", "document", "button", "countdown"];

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
