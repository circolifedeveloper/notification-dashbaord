export const STATUS_META = {
    pending: { label: "Pending", badge: "bg-amber-50 text-amber-700 ring-amber-200", color: "#f59e0b" },
    approved: { label: "Approved", badge: "bg-sky-50 text-sky-700 ring-sky-200", color: "#0ea5e9" },
    inProgress: { label: "In progress", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", color: "#6366f1" },
    sent: { label: "Sent", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", color: "#10b981" },
    rejected: { label: "Rejected", badge: "bg-rose-50 text-rose-700 ring-rose-200", color: "#f43f5e" },
    failed: { label: "Failed", badge: "bg-slate-100 text-slate-700 ring-slate-300", color: "#64748b" },
};

export const AUDIENCE_LABELS = {
    allCustomers: "All customers",
    customers: "Selected customers",
    roles: "By role",
    customersAndRoles: "Customers + roles",
};

export const SCREEN_LABELS = {
    referral: "Referral",
    request: "Request",
    service: "Service",
    subscription: "Subscription",
    invoice: "Invoice",
    analytics: "Analytics",
    notification: "Notification",
    device: "Device",
};

export const screenLabel = (screen) => SCREEN_LABELS[screen] || screen;

export const ROLE_LABELS = {
    superAdmin: "Super Admin",
    admin: "Admin",
    guest: "Guest",
};

export function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function audienceSummary(audience, customers = []) {
    if (!audience) return "-";
    const roles = (audience.roles || []).map((role) => ROLE_LABELS[role] || role).join(", ");
    const customerCount = audience.customerIds?.length || 0;
    const customerText =
        customers.length && customers.length <= 2
            ? customers.map((c) => c.customerName).join(", ")
            : `${customerCount} customer${customerCount === 1 ? "" : "s"}`;

    switch (audience.mode) {
        case "allCustomers":
            return "All customers, all users";
        case "customers":
            return `${customerText}, all roles`;
        case "roles":
            return `All customers, ${roles}`;
        case "customersAndRoles":
            return `${customerText}, ${roles}`;
        default:
            return "-";
    }
}

/** Value for <input type="datetime-local"> in the browser's local time. */
export function toLocalInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
