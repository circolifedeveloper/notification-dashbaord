import { useEffect, useRef, useState } from "react";
import { customerApi } from "../api/endpoints.js";
import useDebounce from "../hooks/useDebounce.js";
import Icon from "./Icon.jsx";
import Spinner from "./Spinner.jsx";

/** `selected` is a list of { _id, customerName, brandName, customerId }. */
export default function CustomerMultiSelect({ selected, onChange }) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounced = useDebounce(search, 300);
    const boxRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        customerApi
            .search({ search: debounced, limit: 20 })
            .then((data) => !cancelled && setResults(data.items))
            .catch(() => !cancelled && setResults([]))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [debounced, open]);

    useEffect(() => {
        const onClick = (event) => {
            if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const selectedIds = new Set(selected.map((c) => c._id));
    const toggle = (customer) => {
        if (selectedIds.has(customer._id)) onChange(selected.filter((c) => c._id !== customer._id));
        else onChange([...selected, customer]);
    };

    return (
        <div ref={boxRef} className="relative">
            <div className="relative">
                <Icon name="search" className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                    className="input pl-9"
                    placeholder="Search customers by name, brand, ID or email"
                    value={search}
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setOpen(true);
                    }}
                />
            </div>

            {open && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {loading && (
                        <div className="flex justify-center p-4">
                            <Spinner />
                        </div>
                    )}
                    {!loading && results.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No customers found</p>}
                    {!loading &&
                        results.map((customer) => (
                            <label
                                key={customer._id}
                                className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                                    checked={selectedIds.has(customer._id)}
                                    onChange={() => toggle(customer)}
                                />
                                <span className="flex-1">
                                    <span className="font-medium text-slate-800">{customer.customerName}</span>
                                    <span className="block text-xs text-slate-500">
                                        {customer.brandName} · {customer.customerId}
                                    </span>
                                </span>
                            </label>
                        ))}
                </div>
            )}

            {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selected.map((customer) => (
                        <span
                            key={customer._id}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-xs font-medium text-brand-700"
                        >
                            {customer.customerName || customer._id}
                            <button
                                type="button"
                                className="cursor-pointer rounded-full p-0.5 hover:bg-brand-100"
                                onClick={() => toggle(customer)}
                                aria-label={`Remove ${customer.customerName}`}
                            >
                                <Icon name="x" className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button type="button" className="cursor-pointer text-xs text-slate-500 hover:text-slate-800" onClick={() => onChange([])}>
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
