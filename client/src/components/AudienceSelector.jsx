import { useEffect, useState } from "react";
import { audienceApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import useDebounce from "../hooks/useDebounce.js";
import CustomerMultiSelect from "./CustomerMultiSelect.jsx";
import Icon from "./Icon.jsx";
import Spinner from "./Spinner.jsx";
import { ROLE_LABELS } from "../utils/format.js";

const MODES = [
    { value: "allCustomers", title: "All customers", description: "Every active app user across all customers." },
    { value: "customers", title: "Selected customers", description: "All users (any role) of the customers you pick." },
    { value: "roles", title: "By role", description: "Users with the chosen roles across all customers." },
    { value: "customersAndRoles", title: "Customers + roles", description: "Only the chosen roles inside the customers you pick." },
];

export function isAudienceComplete(audience) {
    if (audience.mode === "customers") return audience.customers.length > 0;
    if (audience.mode === "roles") return audience.roles.length > 0;
    if (audience.mode === "customersAndRoles") return audience.customers.length > 0 && audience.roles.length > 0;
    return Boolean(audience.mode);
}

export function toAudiencePayload(audience) {
    return {
        mode: audience.mode,
        customerIds: ["customers", "customersAndRoles"].includes(audience.mode) ? audience.customers.map((c) => c._id) : [],
        roles: ["roles", "customersAndRoles"].includes(audience.mode) ? audience.roles : [],
    };
}

/** `audience` is { mode, customers: [{ _id, customerName }], roles: [] }. */
export default function AudienceSelector({ audience, onChange, roles }) {
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState("");
    const [loading, setLoading] = useState(false);

    const payloadKey = JSON.stringify(toAudiencePayload(audience));
    const debouncedKey = useDebounce(payloadKey, 500);

    useEffect(() => {
        const payload = JSON.parse(debouncedKey);
        const complete =
            payload.mode === "allCustomers" ||
            (payload.mode === "customers" && payload.customerIds.length) ||
            (payload.mode === "roles" && payload.roles.length) ||
            (payload.mode === "customersAndRoles" && payload.customerIds.length && payload.roles.length);
        if (!complete) {
            setPreview(null);
            setPreviewError("");
            return;
        }
        let cancelled = false;
        setLoading(true);
        audienceApi
            .preview(payload)
            .then((data) => {
                if (cancelled) return;
                setPreview(data);
                setPreviewError("");
            })
            .catch((error) => !cancelled && setPreviewError(errorMessage(error)))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [debouncedKey]);

    const showCustomers = audience.mode === "customers" || audience.mode === "customersAndRoles";
    const showRoles = audience.mode === "roles" || audience.mode === "customersAndRoles";

    const toggleRole = (role) =>
        onChange({
            ...audience,
            roles: audience.roles.includes(role) ? audience.roles.filter((r) => r !== role) : [...audience.roles, role],
        });

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                {MODES.map((mode) => (
                    <label
                        key={mode.value}
                        className={`cursor-pointer rounded-lg border p-3 transition ${
                            audience.mode === mode.value ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <input
                            type="radio"
                            name="audience-mode"
                            className="sr-only"
                            checked={audience.mode === mode.value}
                            onChange={() => onChange({ ...audience, mode: mode.value })}
                        />
                        <p className="text-sm font-medium text-slate-900">{mode.title}</p>
                        <p className="text-xs text-slate-500">{mode.description}</p>
                    </label>
                ))}
            </div>

            {showCustomers && (
                <div>
                    <label className="label">Customers</label>
                    <CustomerMultiSelect selected={audience.customers} onChange={(customers) => onChange({ ...audience, customers })} />
                </div>
            )}

            {showRoles && (
                <div>
                    <label className="label">User roles</label>
                    <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                            <label
                                key={role}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                    audience.roles.includes(role) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-700"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-brand-600"
                                    checked={audience.roles.includes(role)}
                                    onChange={() => toggleRole(role)}
                                />
                                {ROLE_LABELS[role] || role}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <Icon name="users" className="h-5 w-5 text-slate-500" />
                {loading ? (
                    <Spinner className="h-4 w-4" />
                ) : previewError ? (
                    <span className="text-rose-600">{previewError}</span>
                ) : preview ? (
                    <span className="text-slate-700">
                        <span className="font-semibold text-slate-900">{preview.total.toLocaleString("en-IN")}</span> users match ·{" "}
                        <span className="text-emerald-700">{preview.withToken.toLocaleString("en-IN")} can receive a push</span>
                        {preview.withoutToken > 0 && <span className="text-slate-500"> · {preview.withoutToken} without a device token</span>}
                    </span>
                ) : (
                    <span className="text-slate-500">Complete the audience to see how many users will receive it.</span>
                )}
            </div>
        </div>
    );
}
