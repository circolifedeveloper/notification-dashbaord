import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { broadcastApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useEnums } from "../context/EnumsContext.jsx";
import useDebounce from "../hooks/useDebounce.js";
import BroadcastTable from "../components/BroadcastTable.jsx";
import Pagination from "../components/Pagination.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Spinner from "../components/Spinner.jsx";
import Icon from "../components/Icon.jsx";
import { ApproveDialog, RejectDialog } from "../components/ReviewDialogs.jsx";
import { AUDIENCE_LABELS, STATUS_META } from "../utils/format.js";

const FILTER_KEYS = ["status", "category", "audienceMode", "createdBy", "from", "to"];

export default function BroadcastListPage() {
    const { isSuperAdmin } = useAuth();
    const enums = useEnums();
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState(params.get("search") || "");
    const debouncedSearch = useDebounce(search, 400);
    const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(null);
    const [rejecting, setRejecting] = useState(null);

    const page = Number(params.get("page")) || 1;
    const queryKey = params.toString();

    const updateParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        setParams(next);
    };

    useEffect(() => {
        if ((params.get("search") || "") !== debouncedSearch) updateParam("search", debouncedSearch.trim());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const query = Object.fromEntries(new URLSearchParams(queryKey));
            setData(await broadcastApi.list({ limit: 15, ...query }));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [queryKey]);

    useEffect(() => {
        load();
    }, [load]);

    const hasFilters = FILTER_KEYS.some((key) => params.get(key)) || params.get("search");

    return (
        <div className="min-w-0 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-slate-900">All broadcasts</h1>
                    <p className="text-sm text-slate-500">Every broadcast created by Admins and Super Admins, with its status.</p>
                </div>
                <Link to="/broadcasts/new" className="btn-primary w-full sm:w-auto">
                    <Icon name="plus" className="h-4 w-4" />
                    Create broadcast
                </Link>
            </div>

            <div className="card min-w-0 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                    {["", ...enums.statuses].map((status) => (
                        <button
                            key={status || "all"}
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                                (params.get("status") || "") === status
                                    ? "bg-brand-600 text-white ring-brand-600"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                            }`}
                            onClick={() => updateParam("status", status)}
                        >
                            {status ? STATUS_META[status]?.label || status : "All"}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative sm:col-span-2">
                        <Icon name="search" className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                        <input
                            className="input pl-9"
                            placeholder="Search title, message or creator"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <select className="input" value={params.get("category") || ""} onChange={(e) => updateParam("category", e.target.value)}>
                        <option value="">All types</option>
                        {enums.categories.map((c) => (
                            <option key={c}>{c}</option>
                        ))}
                    </select>
                    <select className="input" value={params.get("audienceMode") || ""} onChange={(e) => updateParam("audienceMode", e.target.value)}>
                        <option value="">All audiences</option>
                        {enums.audienceModes.map((mode) => (
                            <option key={mode} value={mode}>
                                {AUDIENCE_LABELS[mode]}
                            </option>
                        ))}
                    </select>
                    <select className="input" value={params.get("createdBy") || ""} onChange={(e) => updateParam("createdBy", e.target.value)}>
                        <option value="">Anyone</option>
                        <option value="me">Created by me</option>
                    </select>
                    <input
                        type="date"
                        className="input"
                        title="From date"
                        value={params.get("from") || ""}
                        onChange={(e) => updateParam("from", e.target.value)}
                    />
                    <input
                        type="date"
                        className="input"
                        title="To date"
                        value={params.get("to") || ""}
                        onChange={(e) => updateParam("to", e.target.value)}
                    />
                </div>
                {hasFilters && (
                    <button
                        className="mt-3 cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700"
                        onClick={() => {
                            setSearch("");
                            setParams(new URLSearchParams());
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            <div className="card min-w-0 overflow-hidden">
                {loading ? (
                    <div className="flex h-48 items-center justify-center">
                        <Spinner className="h-7 w-7" />
                    </div>
                ) : data.items.length ? (
                    <>
                        <BroadcastTable
                            items={data.items}
                            actions={
                                isSuperAdmin
                                    ? (item) =>
                                          item.status === "pending" ? (
                                              <div className="flex flex-wrap gap-2 xl:justify-end">
                                                  <button className="btn-success px-3 py-1.5 text-xs" onClick={() => setApproving(item)}>
                                                      Approve
                                                  </button>
                                                  <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => setRejecting(item)}>
                                                      Reject
                                                  </button>
                                              </div>
                                          ) : (
                                              <Link to={`/broadcasts/${item._id}`} className="text-xs font-medium text-brand-600">
                                                  View
                                              </Link>
                                          )
                                    : null
                            }
                        />
                        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(p) => updateParam("page", String(p))} />
                    </>
                ) : (
                    <EmptyState
                        title={hasFilters ? "No broadcasts match these filters" : "No broadcasts yet"}
                        description={hasFilters ? "Try changing or clearing the filters." : "Create the first broadcast to get started."}
                    />
                )}
            </div>

            {approving && <ApproveDialog broadcast={approving} onClose={() => setApproving(null)} onDone={load} />}
            {rejecting && <RejectDialog broadcast={rejecting} onClose={() => setRejecting(null)} onDone={load} />}
        </div>
    );
}
