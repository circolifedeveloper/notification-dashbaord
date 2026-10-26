import { toLocalInputValue } from "../utils/format.js";
import { remainingLabel } from "../utils/countdown.js";

/** Optional offer countdown. `value` is { enabled, label, endsAt } or the enabled fields on the form. */
export default function OfferCountdown({ enabled, label, endsAt, onChange }) {
    return (
        <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={enabled}
                    onChange={(event) => onChange({ enabled: event.target.checked, label, endsAt })}
                />
                Add an offer countdown
            </label>
            {enabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="label text-xs" htmlFor="countdown-label">
                            Label
                        </label>
                        <input
                            id="countdown-label"
                            className="input"
                            maxLength={80}
                            placeholder="Offer ends in"
                            value={label}
                            onChange={(event) => onChange({ enabled, label: event.target.value, endsAt })}
                        />
                    </div>
                    <div>
                        <label className="label text-xs" htmlFor="countdown-ends">
                            Ends at
                        </label>
                        <input
                            id="countdown-ends"
                            className="input"
                            type="datetime-local"
                            min={toLocalInputValue(new Date())}
                            value={endsAt}
                            onChange={(event) => onChange({ enabled, label, endsAt: event.target.value })}
                        />
                    </div>
                    {endsAt && (
                        <p className="text-xs text-amber-700 sm:col-span-2">
                            Preview: {label.trim() || "Offer ends in"} {remainingLabel(new Date(endsAt).toISOString())}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
