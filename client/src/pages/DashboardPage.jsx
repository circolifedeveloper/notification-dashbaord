import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { broadcastApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "../components/Icon.jsx";
import Spinner from "../components/Spinner.jsx";
import BroadcastTable from "../components/BroadcastTable.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { AUDIENCE_LABELS, STATUS_META, formatDate } from "../utils/format.js";

const CARDS = [
    { key: "total", label: "Total broadcasts", icon: "bell", tone: "text-slate-700 bg-slate-100", to: "/broadcasts" },
    { key: "pending", label: "Pending approval", icon: "clock", tone: "text-amber-700 bg-amber-50" },
    { key: "approved", label: "Approved", icon: "check", tone: "text-sky-700 bg-sky-50" },
    { key: "inProgress", label: "In progress", icon: "refresh", tone: "text-indigo-700 bg-indigo-50" },
    { key: "sent", label: "Sent", icon: "send", tone: "text-emerald-700 bg-emerald-50" },
    { key: "rejected", label: "Rejected", icon: "x", tone: "text-rose-700 bg-rose-50" },
    { key: "failed", label: "Failed", icon: "alert", tone: "text-slate-700 bg-slate-100" },
];

function StatCard({ label, value, icon, tone, to }) {
    return (
        <Link to={to} className="card flex min-w-0 items-center gap-3 p-3 transition hover:border-brand-200 hover:shadow sm:gap-4 sm:p-4">
            <div className={`shrink-0 rounded-lg p-2 ${tone} sm:p-2.5`}>
                <Icon name={icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-semibold text-slate-900 sm:text-2xl">{value ?? 0}</p>
                <p className="text-[11px] leading-tight font-medium text-slate-500 sm:text-xs">{label}</p>
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const { user, isSuperAdmin } = useAuth();
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const [statsResult, listResult] = await Promise.allSettled([broadcastApi.stats(), broadcastApi.list({ limit: 8 })]);
        if (statsResult.status === "fulfilled") {
            setStats(statsResult.value);
        } else {
            toast.error(errorMessage(statsResult.reason, "Could not load counts"));
        }
        if (listResult.status === "fulfilled") {
            setRecent(listResult.value.items);
        } else if (statsResult.status !== "rejected") {
            toast.error(errorMessage(listResult.reason, "Could not load broadcasts"));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
    }, [load]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    const counts = { total: stats?.total, ...(stats?.counts || {}) };
    const pieData = Object.entries(stats?.counts || {})
        .filter(([, value]) => value > 0)
        .map(([status, value]) => ({ name: STATUS_META[status]?.label || status, value, color: STATUS_META[status]?.color }));
    const delivery = stats?.delivery || {};

    return (
        <div className="min-w-0 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-slate-900">Welcome back, {user?.name?.split(" ")[0]}</h1>
                    <p className="text-sm text-slate-500">Overview of every broadcast created on this dashboard.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {isSuperAdmin && counts.pending > 0 && (
                        <Link to="/approvals" className="btn-secondary w-full sm:w-auto">
                            <Icon name="shield" className="h-4 w-4" />
                            Review {counts.pending} pending
                        </Link>
                    )}
                    <Link to="/broadcasts/new" className="btn-primary">
                        <Icon name="plus" className="h-4 w-4" />
                        Create broadcast
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
                {CARDS.map((card) => (
                    <StatCard
                        key={card.key}
                        {...card}
                        value={counts[card.key]}
                        to={card.to || `/broadcasts?status=${card.key}`}
                    />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[
                    ["Users targeted", delivery.targeted],
                    ["Delivered", delivery.delivered],
                    ["No device token", delivery.skippedNoToken],
                    ["Delivery failures", delivery.failed],
                ].map(([label, value]) => (
                    <div key={label} className="card p-4">
                        <p className="text-xs font-medium text-slate-500">{label}</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">{(value || 0).toLocaleString("en-IN")}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="card p-5 lg:col-span-2">
                    <h2 className="mb-4 text-sm font-semibold text-slate-900">Last 30 days</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.trend || []} margin={{ left: -20, right: 8 }}>
                                <defs>
                                    <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} minTickGap={20} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip labelFormatter={formatDate} />
                                <Legend />
                                <Area type="monotone" dataKey="created" name="Created" stroke="#0ea5e9" fill="url(#created)" />
                                <Area type="monotone" dataKey="sent" name="Sent" stroke="#10b981" fill="none" />
                                <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#f43f5e" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card p-5">
                    <h2 className="mb-4 text-sm font-semibold text-slate-900">By status</h2>
                    {pieData.length ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                                        {pieData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="py-20 text-center text-sm text-slate-400">No data yet</p>
                    )}
                    {stats?.byAudience && Object.keys(stats.byAudience).length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-slate-100 pt-3 text-xs">
                            {Object.entries(stats.byAudience).map(([mode, count]) => (
                                <div key={mode} className="flex justify-between text-slate-600">
                                    <span>{AUDIENCE_LABELS[mode] || mode}</span>
                                    <span className="font-medium text-slate-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="card min-w-0">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">Recent broadcasts</h2>
                    <Link to="/broadcasts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                        View all
                    </Link>
                </div>
                {recent.length ? (
                    <BroadcastTable items={recent} />
                ) : (
                    <EmptyState
                        title="No broadcasts yet"
                        description="Create your first broadcast to notify customers."
                        action={
                            <Link to="/broadcasts/new" className="btn-primary">
                                Create broadcast
                            </Link>
                        }
                    />
                )}
            </div>
        </div>
    );
}
