import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CreateBroadcastPage from "./pages/CreateBroadcastPage.jsx";
import BroadcastListPage from "./pages/BroadcastListPage.jsx";
import BroadcastDetailPage from "./pages/BroadcastDetailPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import { EnumsProvider } from "./context/EnumsContext.jsx";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
                <Route
                    element={
                        <EnumsProvider>
                            <DashboardLayout />
                        </EnumsProvider>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="broadcasts" element={<BroadcastListPage />} />
                    <Route path="broadcasts/new" element={<CreateBroadcastPage />} />
                    <Route path="broadcasts/:id" element={<BroadcastDetailPage />} />
                    <Route path="broadcasts/:id/edit" element={<CreateBroadcastPage />} />
                    <Route element={<ProtectedRoute roles={["superAdmin"]} />}>
                        <Route path="approvals" element={<ApprovalsPage />} />
                    </Route>
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
