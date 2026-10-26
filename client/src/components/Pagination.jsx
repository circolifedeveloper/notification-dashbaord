export default function Pagination({ page, totalPages, total, onChange }) {
    if (!total) return null;
    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
                Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
                <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                    Previous
                </button>
                <button className="btn-secondary px-3 py-1.5" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                    Next
                </button>
            </div>
        </div>
    );
}
