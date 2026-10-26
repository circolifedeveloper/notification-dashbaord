import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";
import { AUDIENCE_LABELS, audienceSummary, formatDateTime } from "../utils/format.js";

function reasonText(item) {
    if (item.status === "rejected") return item.rejectionReason || "Rejected";
    if (["sent", "inProgress", "failed"].includes(item.status)) {
        return `${item.stats?.delivered ?? 0} delivered of ${item.stats?.targeted ?? 0}`;
    }
    return null;
}

function BroadcastCard({ item, actions }) {
    const extra = reasonText(item);
    return (
        <article className="border-b border-slate-100 p-4 last:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Link to={`/broadcasts/${item._id}`} className="font-medium break-words text-slate-900 hover:text-brand-700">
                        {item.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                        {item.category} · {item.subCategory}
                    </p>
                </div>
                <StatusBadge status={item.status} />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                    <dt className="text-slate-400">Audience</dt>
                    <dd className="text-slate-700">{AUDIENCE_LABELS[item.audience?.mode]}</dd>
                    <dd className="text-slate-500">{audienceSummary(item.audience)}</dd>
                </div>
                <div>
                    <dt className="text-slate-400">Created</dt>
                    <dd className="text-slate-700">{item.createdBy?.name}</dd>
                    <dd className="text-slate-500">{formatDateTime(item.createdAt)}</dd>
                </div>
            </dl>
            {item.scheduledAt && ["pending", "approved"].includes(item.status) && (
                <p className="mt-2 text-xs text-slate-500">Scheduled {formatDateTime(item.scheduledAt)}</p>
            )}
            {extra && <p className={`mt-2 text-xs ${item.status === "rejected" ? "text-rose-600" : "text-slate-600"}`}>{extra}</p>}
            {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(item)}</div>}
        </article>
    );
}

export default function BroadcastTable({ items, showReason = true, actions }) {
    return (
        <>
            <div className="xl:hidden">
                {items.map((item) => (
                    <BroadcastCard key={item._id} item={item} actions={actions} />
                ))}
            </div>
            <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-3">Broadcast</th>
                            <th className="px-4 py-3">Audience</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created by</th>
                            <th className="px-4 py-3">Created</th>
                            {showReason && <th className="px-4 py-3">Delivery / reason</th>}
                            {actions && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {items.map((item) => (
                            <tr key={item._id} className="align-top hover:bg-slate-50">
                                <td className="max-w-xs px-4 py-3">
                                    <Link to={`/broadcasts/${item._id}`} className="font-medium text-slate-900 hover:text-brand-700">
                                        {item.title}
                                    </Link>
                                    <p className="truncate text-xs text-slate-500">
                                        {item.category} · {item.subCategory}
                                    </p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-slate-700">{AUDIENCE_LABELS[item.audience?.mode]}</p>
                                    <p className="text-xs text-slate-500">{audienceSummary(item.audience)}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={item.status} />
                                    {item.scheduledAt && ["pending", "approved"].includes(item.status) && (
                                        <p className="mt-1 text-xs text-slate-500">Scheduled {formatDateTime(item.scheduledAt)}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-slate-700">{item.createdBy?.name}</p>
                                    <p className="text-xs text-slate-500">{item.createdBy?.role === "superAdmin" ? "Super Admin" : "Admin"}</p>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDateTime(item.createdAt)}</td>
                                {showReason && (
                                    <td className="max-w-xs px-4 py-3 text-xs break-words">
                                        {item.status === "rejected" && <p className="text-rose-600">{item.rejectionReason}</p>}
                                        {["sent", "inProgress", "failed"].includes(item.status) && (
                                            <p className="text-slate-600">
                                                {item.stats?.delivered ?? 0} delivered of {item.stats?.targeted ?? 0}
                                            </p>
                                        )}
                                        {["pending", "approved"].includes(item.status) && <p className="text-slate-400">-</p>}
                                    </td>
                                )}
                                {actions && <td className="px-4 py-3 text-right">{actions(item)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
