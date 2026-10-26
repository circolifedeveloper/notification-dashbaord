import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "../components/Icon.jsx";

const ROLE_BADGE = {
    superAdmin: "bg-violet-100 text-violet-700",
    admin: "bg-sky-100 text-sky-700",
};

function NavItem({ to, icon, children, end, onClick }) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
            }
        >
            <Icon name={icon} className="h-4 w-4 shrink-0" />
            {children}
        </NavLink>
    );
}

export default function DashboardLayout() {
    const { user, logout, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out");
        navigate("/login", { replace: true });
    };

    const sidebar = (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-5 py-5">
                <div className="rounded-lg bg-brand-600 p-1.5 text-white">
                    <Icon name="bell" className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900">Circolife</p>
                    <p className="text-xs text-slate-500">Notification Center</p>
                </div>
            </div>
            <nav className="flex-1 space-y-1 px-3">
                <NavItem to="/" icon="dashboard" end onClick={close}>
                    Dashboard
                </NavItem>
                <NavItem to="/broadcasts" icon="list" end onClick={close}>
                    All broadcasts
                </NavItem>
                <NavItem to="/broadcasts/new" icon="plus" onClick={close}>
                    Create broadcast
                </NavItem>
                {isSuperAdmin && (
                    <NavItem to="/approvals" icon="shield" onClick={close}>
                        Approvals
                    </NavItem>
                )}
            </nav>
            <div className="border-t border-slate-200 p-4">
                <button className="btn-secondary w-full" onClick={handleLogout}>
                    <Icon name="logout" className="h-4 w-4" />
                    Log out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen overflow-x-hidden">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

            {open && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={close} />
                    <aside className="relative h-full w-64 bg-white shadow-xl">{sidebar}</aside>
                </div>
            )}

            <div className="min-w-0 lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-6">
                    <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
                        <Icon name="menu" />
                    </button>
                    <div className="hidden lg:block" />
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <div className="min-w-0 text-right">
                            <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                            <p className="hidden truncate text-xs text-slate-500 sm:block">{user?.email}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${ROLE_BADGE[user?.role] || "bg-slate-100"}`}>
                            {user?.role === "superAdmin" ? "Super Admin" : "Admin"}
                        </span>
                    </div>
                </header>
                <main className="mx-auto min-w-0 max-w-7xl p-3 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
