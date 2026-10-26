import Icon from "./Icon.jsx";
import { screenLabel } from "../utils/format.js";

const emptyButton = (screens) => ({
    label: "",
    action: "screen",
    screen: screens[0] || "notification",
    url: "",
});

/** Up to `max` buttons. Each one opens either an app screen or a web URL. */
export default function ScreenButtons({ value, onChange, screens, max = 2 }) {
    const update = (index, patch) => onChange(value.map((button, i) => (i === index ? { ...button, ...patch } : button)));
    const remove = (index) => onChange(value.filter((_, i) => i !== index));
    const setAction = (index, action) => {
        const button = value[index];
        update(index, {
            action,
            screen: action === "screen" ? button.screen || screens[0] : "",
            url: action === "url" ? button.url : "",
        });
    };

    return (
        <div className="space-y-3">
            {value.map((button, index) => {
                const action = button.action === "url" ? "url" : "screen";
                return (
                <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <label className="label text-xs" htmlFor={`button-label-${index}`}>
                                Button {index + 1} text
                            </label>
                            <input
                                id={`button-label-${index}`}
                                className="input"
                                maxLength={30}
                                placeholder="e.g. Renew now"
                                value={button.label}
                                onChange={(event) => update(index, { label: event.target.value })}
                            />
                        </div>
                        <button
                            type="button"
                            className="mt-6 cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => remove(index)}
                            aria-label={`Remove button ${index + 1}`}
                        >
                            <Icon name="trash" className="h-4 w-4" />
                        </button>
                    </div>

                    <div>
                        <p className="label text-xs">Opens</p>
                        <div className="mb-2 flex flex-wrap gap-2">
                            {[
                                { id: "screen", label: "App screen" },
                                { id: "url", label: "Web URL" },
                            ].map((option) => (
                                <label
                                    key={option.id}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                                        action === option.id
                                            ? "border-brand-500 bg-white text-brand-700 ring-1 ring-brand-500"
                                            : "border-slate-200 bg-white text-slate-600"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        className="accent-brand-600"
                                        name={`button-action-${index}`}
                                        checked={action === option.id}
                                        onChange={() => setAction(index, option.id)}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                        {action === "url" ? (
                            <input
                                className="input"
                                type="url"
                                placeholder="https://example.com/offer"
                                value={button.url || ""}
                                onChange={(event) => update(index, { action: "url", url: event.target.value, screen: "" })}
                            />
                        ) : (
                            <select
                                className="input"
                                value={button.screen || screens[0] || "notification"}
                                onChange={(event) => update(index, { action: "screen", screen: event.target.value, url: "" })}
                            >
                                {screens.map((screen) => (
                                    <option key={screen} value={screen}>
                                        {screenLabel(screen)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
                );
            })}

            {value.length < max ? (
                <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => onChange([...value, emptyButton(screens)])}>
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    Add button ({value.length}/{max})
                </button>
            ) : (
                <p className="text-xs text-slate-500">Maximum of {max} buttons reached.</p>
            )}
        </div>
    );
}
