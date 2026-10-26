import { STATUS_META } from "../utils/format.js";

export default function StatusBadge({ status }) {
    const meta = STATUS_META[status] || { label: status, badge: "bg-slate-100 text-slate-700 ring-slate-200" };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
            {meta.label}
        </span>
    );
}
