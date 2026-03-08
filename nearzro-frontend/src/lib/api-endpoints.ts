import api from "@/lib/api";

// ==================== EVENTS API ====================
export const eventsApi = {
  getAll: () => api.get("/events"),
  getById: (id: number) => api.get(`/events/${id}`),
  create: (data: any) => api.post("/events", data),
  update: (id: number, data: any) => api.patch(`/events/${id}`, data),
  delete: (id: number) => api.delete(`/events/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/events/${id}/status`, { status }),
  assignManager: (id: number, managerId: number) => api.patch(`/events/${id}/assign-manager`, { managerId }),
  addService: (id: number, serviceData: any) => api.post(`/events/${id}/services`, serviceData),
};

// ==================== VENUES API ====================
export const venuesApi = {
  getAll: () => api.get("/venues"),
  getById: (id: number) => api.get(`/venues/${id}`),
  create: (data: any) => api.post("/venues", data),
  update: (id: number, data: any) => api.patch(`/venues/${id}`, data),
  delete: (id: number) => api.delete(`/venues/${id}`),
  approve: (id: number) => api.patch(`/venues/${id}/approve`),
  reject: (id: number) => api.patch(`/venues/${id}/reject`),
  getBookings: (id: number) => api.get(`/venues/${id}/bookings`),
  updateAvailability: (id: number, data: any) => api.patch(`/venues/${id}/availability`, data),
};

// ==================== VENDORS API ====================
export const vendorsApi = {
  getAll: () => api.get("/vendors"),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post("/vendors", data),
  update: (id: number, data: any) => api.patch(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
  approve: (id: number) => api.patch(`/vendors/${id}/approve`),
  reject: (id: number) => api.patch(`/vendors/${id}/reject`),
  getServices: (id: number) => api.get(`/vendors/${id}/services`),
};

// ==================== USERS API ====================
export const usersApi = {
  getAll: () => api.get("/users"),
  getById: (id: number) => api.get(`/users/${id}`),
  update: (id: number, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number, status: string) => api.patch(`/users/${id}/status`, { status }),
  getEvents: (id: number) => api.get(`/users/${id}/events`),
  getPayments: (id: number) => api.get(`/users/${id}/payments`),
};

// ==================== TRANSACTIONS API ====================
export const transactionsApi = {
  getAll: () => api.get("/payments"),
  getById: (id: number) => api.get(`/payments/${id}`),
  approve: (id: number) => api.patch(`/payments/${id}/approve`),
  reject: (id: number) => api.patch(`/payments/${id}/reject`),
  refund: (id: number, data: any) => api.post(`/payments/${id}/refund`, data),
  export: () => api.get("/payments/export", { responseType: "blob" }),
};

// ==================== PAYOUTS API ====================
export const payoutsApi = {
  getAll: () => api.get("/payouts"),
  getById: (id: number) => api.get(`/payouts/${id}`),
  approve: (id: number) => api.patch(`/payouts/${id}/approve`),
  reject: (id: number, reason: string) => api.patch(`/payouts/${id}/reject`, { reason }),
  process: (id: number) => api.post(`/payouts/${id}/process`),
  export: () => api.get("/payouts/export", { responseType: "blob" }),
};

// ==================== APPROVALS API ====================
export const approvalsApi = {
  getPending: () => api.get("/approvals/pending"),
  approve: (id: number, type: string) => api.patch(`/approvals/${id}/approve`, { type }),
  reject: (id: number, type: string, reason: string) => api.patch(`/approvals/${id}/reject`, { type, reason }),
  getById: (id: number) => api.get(`/approvals/${id}`),
};

// ==================== REPORTS API ====================
export const reportsApi = {
  getRevenue: (params: any) => api.get("/reports/revenue", { params }),
  getUsers: (params: any) => api.get("/reports/users", { params }),
  getVenues: (params: any) => api.get("/reports/venues", { params }),
  getVendors: (params: any) => api.get("/reports/vendors", { params }),
  exportRevenue: () => api.get("/reports/revenue/export", { responseType: "blob" }),
  exportUsers: () => api.get("/reports/users/export", { responseType: "blob" }),
};

// ==================== NOTIFICATIONS API ====================
export const notificationsApi = {
  getAll: () => api.get("/notifications"),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete("/notifications"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
};

// ==================== AUDIT LOGS API ====================
export const auditApi = {
  getAll: (params: any) => api.get("/audit", { params }),
  getById: (id: number) => api.get(`/audit/${id}`),
  export: (params: any) => api.get("/audit/export", { params, responseType: "blob" }),
};

// ==================== SETTINGS API ====================
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data: any) => api.patch("/settings", data),
  getFeatureFlags: () => api.get("/settings/feature-flags"),
  updateFeatureFlags: (data: any) => api.patch("/settings/feature-flags", data),
};

// ==================== EXPRESS API ====================
export const expressApi = {
  getAll: () => api.get("/express"),
  process: (id: number) => api.post(`/express/${id}/process`),
  reject: (id: number, reason: string) => api.patch(`/express/${id}/reject`, { reason }),
};

// ==================== DASHBOARD API ====================
export const dashboardApi = {
  getStats: () => api.get("/dashboard/stats"),
  getRevenue: () => api.get("/dashboard/revenue"),
  getRecentActivity: () => api.get("/dashboard/activity"),
};
