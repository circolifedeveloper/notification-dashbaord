import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { broadcastApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useEnums } from "../context/EnumsContext.jsx";
import AudienceSelector, { isAudienceComplete, toAudiencePayload } from "../components/AudienceSelector.jsx";
import ImageUpload from "../components/ImageUpload.jsx";
import ScreenButtons from "../components/ScreenButtons.jsx";
import OfferCountdown from "../components/OfferCountdown.jsx";
import PhonePreview from "../components/PhonePreview.jsx";
import Icon from "../components/Icon.jsx";
import Spinner from "../components/Spinner.jsx";
import { screenLabel, toLocalInputValue } from "../utils/format.js";

const EMPTY_FORM = {
    title: "",
    body: "",
    category: "General",
    subCategory: "Announcement",
    screen: "notification",
    image: null,
    buttons: [],
    countdownEnabled: false,
    countdownLabel: "Offer ends in",
    countdownEndsAt: "",
    scheduleLater: false,
    scheduledAt: "",
    audience: { mode: "allCustomers", customers: [], roles: [] },
};

function Section({ title, description, children }) {
    return (
        <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && <p className="mb-4 text-xs text-slate-500">{description}</p>}
            {!description && <div className="mb-4" />}
            {children}
        </section>
    );
}

export default function CreateBroadcastPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user, isSuperAdmin } = useAuth();
    const enums = useEnums();
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        if (!isEdit) {
            setForm(EMPTY_FORM);
            return;
        }
        broadcastApi
            .get(id)
            .then((broadcast) => {
                const isOwner = String(broadcast.createdBy?.id) === String(user?.id);
                if (!["pending", "rejected"].includes(broadcast.status) || (!isOwner && !isSuperAdmin)) {
                    toast.error("This broadcast can no longer be edited");
                    navigate(`/broadcasts/${id}`, { replace: true });
                    return;
                }
                const known = new Map((broadcast.audienceCustomers || []).map((c) => [String(c._id), c]));
                const content = broadcast.content || [];
                const image = content.find((item) => item.type === "image" && item.url);
                const countdown = content.find((item) => item.type === "countdown" && item.endsAt);
                const screens = enums.appScreens;
                setRejectionReason(broadcast.status === "rejected" ? broadcast.rejectionReason : "");
                setForm({
                    title: broadcast.title,
                    body: broadcast.body,
                    category: broadcast.category,
                    subCategory: broadcast.subCategory,
                    screen: screens.includes(broadcast.screen) ? broadcast.screen : enums.defaultScreen,
                    image: image ? { url: image.url, key: image.key, fileName: image.fileName, mimeType: image.mimeType } : null,
                    countdownEnabled: Boolean(countdown),
                    countdownLabel: countdown?.label || "Offer ends in",
                    countdownEndsAt: countdown ? toLocalInputValue(countdown.endsAt) : "",
                    buttons: content
                        .filter((item) => item.type === "button")
                        .slice(0, enums.maxButtons)
                        .map((item) =>
                            item.url
                                ? { label: item.label || "Open", action: "url", url: item.url, screen: "" }
                                : {
                                      label: item.label || "Open",
                                      action: "screen",
                                      screen: screens.includes(item.screen) ? item.screen : enums.defaultScreen,
                                      url: "",
                                  }
                        ),
                    scheduleLater: Boolean(broadcast.scheduledAt),
                    scheduledAt: toLocalInputValue(broadcast.scheduledAt),
                    audience: {
                        mode: broadcast.audience.mode,
                        roles: broadcast.audience.roles || [],
                        customers: (broadcast.audience.customerIds || []).map(
                            (cid) => known.get(String(cid)) || { _id: String(cid), customerName: String(cid) }
                        ),
                    },
                });
            })
            .catch((error) => {
                toast.error(errorMessage(error));
                navigate("/broadcasts", { replace: true });
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isEdit, isSuperAdmin, navigate, user?.id]);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const content = [
        ...(form.image ? [{ type: "image", ...form.image }] : []),
        ...form.buttons.map((button) => {
            const action = button.action === "url" ? "url" : "screen";
            return {
                type: "button",
                label: button.label.trim(),
                action,
                ...(action === "url" ? { url: (button.url || "").trim() } : { screen: button.screen || "notification" }),
            };
        }),
        ...(form.countdownEnabled && form.countdownEndsAt
            ? [
                  {
                      type: "countdown",
                      label: form.countdownLabel.trim() || "Offer ends in",
                      endsAt: new Date(form.countdownEndsAt).toISOString(),
                  },
              ]
            : []),
    ];

    const submit = async (event) => {
        event.preventDefault();
        if (uploading) return toast.error("Please wait for the image upload to finish");
        if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message are required");
        if (form.buttons.some((button) => !button.label.trim())) return toast.error("Every button needs a text");
        if (form.buttons.some((button) => button.action === "url" && !button.url.trim())) {
            return toast.error("Every URL button needs an https link");
        }
        if (form.buttons.some((button) => button.action !== "url" && !button.screen)) {
            return toast.error("Every screen button needs an app screen");
        }
        if (!isAudienceComplete(form.audience)) return toast.error("Complete the audience selection");
        if (form.countdownEnabled && !form.countdownEndsAt) return toast.error("Pick when the offer ends");
        if (form.countdownEnabled && new Date(form.countdownEndsAt).getTime() <= Date.now()) {
            return toast.error("Offer end time must be in the future");
        }
        if (form.scheduleLater && !form.scheduledAt) return toast.error("Pick a schedule time or turn scheduling off");

        const payload = {
            title: form.title.trim(),
            body: form.body.trim(),
            category: form.category,
            subCategory: form.subCategory,
            screen: form.screen,
            content,
            audience: toAudiencePayload(form.audience),
            scheduledAt: form.scheduleLater && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        };

        setSaving(true);
        try {
            const saved = isEdit ? await broadcastApi.update(id, payload) : await broadcastApi.create(payload);
            toast.success(isEdit ? "Broadcast updated and sent for approval" : "Broadcast submitted for approval");
            navigate(`/broadcasts/${saved._id}`);
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="min-w-0 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <Link to={isEdit ? `/broadcasts/${id}` : "/broadcasts"} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <Icon name="arrowLeft" className="h-4 w-4" />
                        Back
                    </Link>
                    <h1 className="text-xl font-semibold text-slate-900">{isEdit ? "Edit broadcast" : "Create broadcast"}</h1>
                    <p className="text-sm text-slate-500">
                        It will be sent for Super Admin approval{isEdit ? " again after saving" : ""} before delivery.
                    </p>
                </div>
                <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving || uploading}>
                    <Icon name="send" className="h-4 w-4" />
                    {saving ? "Submitting..." : isEdit ? "Save and resubmit" : "Submit for approval"}
                </button>
            </div>

            {rejectionReason && (
                <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <Icon name="alert" className="mt-0.5 h-5 w-5 flex-none" />
                    <div>
                        <p className="font-medium">Rejected by Super Admin</p>
                        <p>{rejectionReason}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Section title="Message" description="What users will see in the push and in the app inbox.">
                        <div className="space-y-4">
                            <div>
                                <label className="label" htmlFor="title">
                                    Title
                                </label>
                                <input id="title" className="input" maxLength={120} value={form.title} onChange={set("title")} required />
                                <p className="mt-1 text-right text-xs text-slate-400">{form.title.length}/120</p>
                            </div>
                            <div>
                                <label className="label" htmlFor="body">
                                    Message
                                </label>
                                <textarea id="body" className="input min-h-28" maxLength={1000} value={form.body} onChange={set("body")} required />
                                <p className="mt-1 text-right text-xs text-slate-400">{form.body.length}/1000</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="label" htmlFor="category">
                                        Type (category)
                                    </label>
                                    <select id="category" className="input" value={form.category} onChange={set("category")}>
                                        {enums.categories.map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label" htmlFor="subCategory">
                                        Sub type
                                    </label>
                                    <select id="subCategory" className="input" value={form.subCategory} onChange={set("subCategory")}>
                                        {enums.subCategories.map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label" htmlFor="screen">
                                        Tap opens screen
                                    </label>
                                    <select id="screen" className="input" value={form.screen} onChange={set("screen")}>
                                        {enums.appScreens.map((screen) => (
                                            <option key={screen} value={screen}>
                                                {screenLabel(screen)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section title="Image" description="Optional. One image, fitted to the same 2:1 size as the phone preview. Drag and zoom before upload.">
                        <ImageUpload
                            value={form.image}
                            onChange={(image) => setForm((prev) => ({ ...prev, image }))}
                            onUploadingChange={setUploading}
                        />
                    </Section>

                    <Section
                        title="Buttons"
                        description={`Optional. Add up to ${enums.maxButtons} buttons. Each one opens an app screen or a web URL.`}
                    >
                        <ScreenButtons
                            value={form.buttons}
                            onChange={(buttons) => setForm((prev) => ({ ...prev, buttons }))}
                            screens={enums.appScreens}
                            max={enums.maxButtons}
                        />
                    </Section>

                    <Section
                        title="Offer countdown"
                        description="Optional. Shows a timer on the notification so users know when the offer ends."
                    >
                        <OfferCountdown
                            enabled={form.countdownEnabled}
                            label={form.countdownLabel}
                            endsAt={form.countdownEndsAt}
                            onChange={(countdown) =>
                                setForm((prev) => ({
                                    ...prev,
                                    countdownEnabled: countdown.enabled,
                                    countdownLabel: countdown.label,
                                    countdownEndsAt: countdown.endsAt,
                                }))
                            }
                        />
                    </Section>

                    <Section title="Audience" description="Choose who receives this broadcast.">
                        <AudienceSelector
                            audience={form.audience}
                            onChange={(audience) => setForm((prev) => ({ ...prev, audience }))}
                            roles={enums.targetRoles}
                        />
                    </Section>

                    <Section title="Delivery time">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-brand-600"
                                checked={form.scheduleLater}
                                onChange={(event) => setForm((prev) => ({ ...prev, scheduleLater: event.target.checked }))}
                            />
                            Schedule for later (otherwise sent as soon as it is approved)
                        </label>
                        {form.scheduleLater && (
                            <input
                                type="datetime-local"
                                className="input mt-3 max-w-xs"
                                min={toLocalInputValue(new Date())}
                                value={form.scheduledAt}
                                onChange={set("scheduledAt")}
                            />
                        )}
                    </Section>
                </div>

                <div className="lg:sticky lg:top-24 lg:self-start">
                    <p className="mb-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">Live preview</p>
                    <PhonePreview title={form.title} body={form.body} category={form.category} content={content} />
                </div>
            </div>
        </form>
    );
}
