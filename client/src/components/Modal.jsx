import { useEffect } from "react";

export default function Modal({ open, title, onClose, children, footer }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => event.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="card relative w-full max-w-lg">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                </div>
                <div className="px-5 py-4">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
            </div>
        </div>
    );
}
