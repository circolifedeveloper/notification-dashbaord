import mongoose from "mongoose";
import { usersCollection } from "../config/collections.js";

const toObjectIds = (ids = []) => ids.map((id) => new mongoose.Types.ObjectId(String(id)));

/** Mongo filter on the `users` collection for a broadcast audience. */
export function buildUserFilter(audience) {
    const base = { visibility: true };
    const customerIds = toObjectIds(audience.customerIds);
    const roles = audience.roles || [];

    switch (audience.mode) {
        case "allCustomers":
            return base;
        case "customers":
            return {
                ...base,
                $or: [{ customerId: { $in: customerIds } }, { "customerIds.customerId": { $in: customerIds } }],
            };
        case "roles":
            return {
                ...base,
                $or: [{ role: { $in: roles } }, { "customerIds.role": { $in: roles } }],
            };
        case "customersAndRoles":
            return {
                ...base,
                $or: [
                    { customerIds: { $elemMatch: { customerId: { $in: customerIds }, role: { $in: roles } } } },
                    { customerId: { $in: customerIds }, role: { $in: roles } },
                ],
            };
        default:
            throw new Error(`Unknown audience mode: ${audience.mode}`);
    }
}

/**
 * Customer to stamp on a user's notification. Left empty for audiences that are not
 * customer-specific so the app shows it regardless of the user's active customer.
 */
export function customerForUser(user, audience) {
    if (audience.mode !== "customers" && audience.mode !== "customersAndRoles") return undefined;
    const selected = new Set((audience.customerIds || []).map(String));
    const roles = new Set(audience.roles || []);
    const roleOk = (role) => audience.mode === "customers" || roles.has(role);

    if (user.customerId && selected.has(String(user.customerId)) && roleOk(user.role)) {
        return user.customerId;
    }
    const entry = (user.customerIds || []).find(
        (item) => item?.customerId && selected.has(String(item.customerId)) && roleOk(item.role)
    );
    return entry?.customerId || user.customerId || undefined;
}

export async function previewAudience(audience) {
    const filter = buildUserFilter(audience);
    const users = usersCollection();
    const [total, withToken] = await Promise.all([
        users.countDocuments(filter),
        users.countDocuments({ ...filter, notificationId: { $exists: true, $nin: [null, ""] } }),
    ]);
    return { total, withToken, withoutToken: total - withToken };
}
