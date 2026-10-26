import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { broadcastApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import PhonePreview from "../components/PhonePreview.jsx";
import NotificationImage from "../components/NotificationImage.jsx";
import Spinner from "../components/Spinner.jsx";
import Icon from "../components/Icon.jsx";
import { ApproveDialog, RejectDialog } from "../components/ReviewDialogs.jsx";
import { AUDIENCE_LABELS, ROLE_LABELS, formatDateTime, screenLabel } from "../utils/format.js";

const HISTORY_LABELS = {
    created: "Created",
    updated: "Edited",
    resubmitted: "Edited and resubmitted",
    approved: "Approved",
    rejected: "Rejected",
    inProgress: "Delivery started",
    sent: "Delivered",
    failed: "Delivery failed",
};

const HISTORY_DOT = {
    approved: "bg-sky-500",
    rejected: "bg-rose-500",
    sent: "bg-emerald-500",
    failed: "bg-slate-500",
    inProgress: "bg-indigo-500",
};

function Info({ label, children }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{children || "-"}</dd>
        </div>
    );
}

export default function BroadcastDetailPage() {
    const { id } = useParams();
    const { user, isSuperAdmin } = useAuth();
    const [broadcast, setBroadcast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(null);

    const load = useCallback(async () => {
        try {
            setBroadcast(await broadcastApi.get(id));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!broadcast || !["approved", "inProgress"].includes(broadcast.status)) return undefined;
        const timer = setInterval(load, 5000);
        return () => clearInterval(timer);
    }, [broadcast, load]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }
    if (!broadcast) {
        return (
            <div className="card p-10 text-center">
                <p className="font-medium text-slate-900">Broadcast not found</p>
                <Link to="/broadcasts" className="mt-3 inline-block text-sm text-brand-600">
                    Back to all broadcasts
                </Link>
            </div>
        );
    }

    const isOwner = String(broadcast.createdBy?.id) === String(user?.id);
    const canEdit = ["pending", "rejected"].includes(broadcast.status) && (isOwner || isSuperAdmin);
    const canReview = isSuperAdmin && broadcast.status === "pending";
    const { audience, stats = {} } = broadcast;
    const image = broadcast.content?.find((item) => item.type === "image" && item.url);
    const buttons = broadcast.content?.filter((item) => item.type === "button") || [];
    const countdown = broadcast.content?.find((item) => item.type === "countdown" && item.endsAt);

    return (
        <div className="min-w-0 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <Link to="/broadcasts" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                        <Icon name="arrowLeft" className="h-4 w-4" />
                        All broadcasts
                    </Link>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-semibold break-words text-slate-900">{broadcast.title}</h1>
                        <StatusBadge status={broadcast.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                        Created by {broadcast.createdBy?.name} ({broadcast.createdBy?.role === "superAdmin" ? "Super Admin" : "Admin"}) on{" "}
                        {formatDateTime(broadcast.createdAt)}
                    </p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {canEdit && (
                        <Link to={`/broadcasts/${broadcast._id}/edit`} className="btn-secondary">
                            <Icon name="edit" className="h-4 w-4" />
                            {broadcast.status === "rejected" ? "Edit and resubmit" : "Edit"}
                        </Link>
                    )}
                    {canReview && (
                        <>
                            <button className="btn-danger" onClick={() => setDialog("reject")}>
                                <Icon name="x" className="h-4 w-4" />
                                Reject
                            </button>
                            <button className="btn-success" onClick={() => setDialog("approve")}>
                                <Icon name="check" className="h-4 w-4" />
                                Approve
                            </button>
                        </>
                    )}
                </div>
            </div>

            {broadcast.status === "rejected" && (
                <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <Icon name="alert" className="mt-0.5 h-5 w-5 flex-none" />
                    <div>
                        <p className="font-medium">
                            Rejected by {broadcast.reviewedBy?.name} on {formatDateTime(broadcast.reviewedAt)}
                        </p>
                        <p className="mt-1 whitespace-pre-line">{broadcast.rejectionReason}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <section className="card p-5">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900">Message</h2>
                        <p className="text-sm whitespace-pre-line text-slate-700">{broadcast.body}</p>
                        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                            <Info label="Type">{broadcast.category}</Info>
                            <Info label="Sub type">{broadcast.subCategory}</Info>
                            <Info label="Tap opens screen">{screenLabel(broadcast.screen)}</Info>
                        </dl>
                        {image && (
                            <div className="mt-5">
                                <p className="mb-2 text-xs font-medium text-slate-500">Image</p>
                                <a href={image.url} target="_blank" rel="noreferrer noopener" className="block max-w-md">
                                    <NotificationImage src={image.url} className="rounded-lg border border-slate-200" />
                                </a>
                                {image.key && <p className="mt-1 text-xs break-all text-slate-500">Path: {image.key}</p>}
                            </div>
                        )}
                        {countdown && (
                            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                <p className="text-xs font-medium text-amber-800">{countdown.label || "Offer ends in"}</p>
                                <p>{formatDateTime(countdown.endsAt)}</p>
                            </div>
                        )}
                        {buttons.length > 0 && (
                            <div className="mt-5">
                                <p className="mb-2 text-xs font-medium text-slate-500">Buttons</p>
                                <div className="flex flex-wrap gap-2">
                                    {buttons.map((button, index) => (
                                        <span key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                                            <span className="font-semibold">{button.label}</span>
                                            {button.screen && <span className="text-slate-500"> → {screenLabel(button.screen)}</span>}
                                            {button.url && (
                                                <a className="ml-1 break-all text-brand-600 hover:underline" href={button.url} target="_blank" rel="noreferrer noopener">
                                                    {button.url}
                                                </a>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="card p-5">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900">Audience</h2>
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <Info label="Mode">{AUDIENCE_LABELS[audience?.mode]}</Info>
                            <Info label="Roles">
                                {audience?.roles?.length ? audience.roles.map((r) => ROLE_LABELS[r] || r).join(", ") : "All roles"}
                            </Info>
                        </dl>
                        <div className="mt-4">
                            <p className="text-xs font-medium text-slate-500">Customers</p>
                            {audience?.customerIds?.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {broadcast.audienceCustomers.map((c) => (
                                        <span key={c._id} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                                            {c.customerName} <span className="text-brand-500">· {c.customerId}</span>
                                        </span>
                                    ))}
                                    {audience.customerIds.length > broadcast.audienceCustomers.length && (
                                        <span className="text-xs text-slate-500">
                                            +{audience.customerIds.length - broadcast.audienceCustomers.length} not found
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-1 text-sm text-slate-900">All customers</p>
                            )}
                        </div>
                    </section>

                    <section className="card p-5">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900">Delivery</h2>
                        <dl className="grid gap-4 sm:grid-cols-4">
                            <Info label="Targeted users">{String(stats.targeted ?? 0)}</Info>
                            <Info label="Delivered">{String(stats.delivered ?? 0)}</Info>
                            <Info label="No device token">{String(stats.skippedNoToken ?? 0)}</Info>
                            <Info label="Failed">{String(stats.failed ?? 0)}</Info>
                        </dl>
                        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                            <Info label="Scheduled for">{broadcast.scheduledAt ? formatDateTime(broadcast.scheduledAt) : "As soon as approved"}</Info>
                            <Info label="Reviewed by">
                                {broadcast.reviewedBy?.name ? `${broadcast.reviewedBy.name} · ${formatDateTime(broadcast.reviewedAt)}` : null}
                            </Info>
                            <Info label="Sent at">{broadcast.sentAt ? formatDateTime(broadcast.sentAt) : null}</Info>
                        </dl>
                    </section>

                    <section className="card p-5">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900">History</h2>
                        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                            {[...(broadcast.history || [])].reverse().map((entry, index) => (
                                <li key={index} className="relative">
                                    <span className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${HISTORY_DOT[entry.action] || "bg-amber-500"}`} />
                                    <p className="text-sm font-medium text-slate-900">
                                        {HISTORY_LABELS[entry.action] || entry.action}
                                        <span className="font-normal text-slate-500"> by {entry.by?.name || "System"}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">{formatDateTime(entry.at)}</p>
                                    {entry.note && <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{entry.note}</p>}
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>

                <div className="lg:sticky lg:top-24 lg:self-start">
                    <PhonePreview title={broadcast.title} body={broadcast.body} category={broadcast.category} content={broadcast.content} />
                </div>
            </div>

            {dialog === "approve" && <ApproveDialog broadcast={broadcast} onClose={() => setDialog(null)} onDone={load} />}
            {dialog === "reject" && <RejectDialog broadcast={broadcast} onClose={() => setDialog(null)} onDone={load} />}
        </div>
    );
}
