import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { broadcastApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import { ApproveDialog, RejectDialog } from "../components/ReviewDialogs.jsx";
import { AUDIENCE_LABELS, audienceSummary, formatDateTime } from "../utils/format.js";

export default function ApprovalsPage() {
    const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(null);
    const [rejecting, setRejecting] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await broadcastApi.list({ status: "pending", page, limit: 10 }));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Approvals</h1>
                <p className="text-sm text-slate-500">Broadcasts waiting for a Super Admin decision. Rejections need a reason.</p>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner className="h-7 w-7" />
                </div>
            ) : data.items.length === 0 ? (
                <div className="card">
                    <EmptyState title="All caught up" description="There are no broadcasts waiting for approval." />
                </div>
            ) : (
                <div className="space-y-4">
                    {data.items.map((item) => (
                        <div key={item._id} className="card p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <Link to={`/broadcasts/${item._id}`} className="text-base font-semibold text-slate-900 hover:text-brand-700">
                                        {item.title}
                                    </Link>
                                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.body}</p>
                                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                                        <span>
                                            {item.category} · {item.subCategory}
                                        </span>
                                        <span>
                                            {AUDIENCE_LABELS[item.audience?.mode]}: {audienceSummary(item.audience)}
                                        </span>
                                        <span>
                                            By {item.createdBy?.name} · {formatDateTime(item.createdAt)}
                                        </span>
                                        {item.scheduledAt && <span>Scheduled {formatDateTime(item.scheduledAt)}</span>}
                                    </div>
                                </div>
                                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                                    <Link to={`/broadcasts/${item._id}`} className="btn-secondary">
                                        Details
                                    </Link>
                                    <button className="btn-danger" onClick={() => setRejecting(item)}>
                                        Reject
                                    </button>
                                    <button className="btn-success" onClick={() => setApproving(item)}>
                                        Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="card">
                        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
                    </div>
                </div>
            )}

            {approving && <ApproveDialog broadcast={approving} onClose={() => setApproving(null)} onDone={load} />}
            {rejecting && <RejectDialog broadcast={rejecting} onClose={() => setRejecting(null)} onDone={load} />}
        </div>
    );
}
