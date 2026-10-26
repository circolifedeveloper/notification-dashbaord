import api from "./client.js";

const data = (response) => response.data.data;

export const authApi = {
    sendOtp: (email) => api.post("/auth/send-otp", { email }).then((r) => r.data),
    verifyOtp: (email, otp) => api.post("/auth/verify-otp", { email, otp }).then(data),
    me: () => api.get("/auth/me").then(data),
    logout: () => api.post("/auth/logout").then((r) => r.data),
};

export const metaApi = {
    enums: () => api.get("/meta/enums").then(data),
};

export const customerApi = {
    search: (params) => api.get("/customers", { params }).then(data),
};

export const audienceApi = {
    preview: (audience) => api.post("/audience/preview", { audience }).then(data),
};

export const broadcastApi = {
    list: (params) => api.get("/broadcasts", { params }).then(data),
    stats: () => api.get("/broadcasts/stats").then(data),
    get: (id) => api.get(`/broadcasts/${id}`).then(data),
    create: (payload) => api.post("/broadcasts", payload).then(data),
    update: (id, payload) => api.patch(`/broadcasts/${id}`, payload).then(data),
    approve: (id, note) => api.post(`/broadcasts/${id}/approve`, { note }).then(data),
    reject: (id, reason) => api.post(`/broadcasts/${id}/reject`, { reason }).then(data),
};
