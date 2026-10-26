import Icon from "./Icon.jsx";

export default function EmptyState({ title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600">
                <Icon name="bell" className="h-6 w-6" />
            </div>
            <p className="font-medium text-slate-900">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
