import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
    withCredentials: true,
    timeout: 20000,
    headers: { "Content-Type": "application/json" },
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        if (status === 401 && onUnauthorized && !url.startsWith("/auth/")) {
            onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export function errorMessage(error, fallback = "Something went wrong") {
    return error?.response?.data?.message || error?.message || fallback;
}

export default api;
