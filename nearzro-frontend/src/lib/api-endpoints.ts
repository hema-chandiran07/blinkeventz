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
  getMyVenues: () => api.get("/venues/my"),
  getVenueOwnerStats: () => api.get("/venues/owner/stats"),
};

// ==================== BOOKING API ====================
export const bookingApi = {
  create: (data: { venueId: number; date: string; timeSlot: string; eventName?: string; guestCount?: number; specialNotes?: string }) =>
    api.post("/booking/create", data),
  book: (availabilitySlotId: number) => api.post("/booking", { availabilitySlotId }),
  getVenueOwnerBookings: () => api.get("/booking/owner"),
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

// ==================== VENDOR SERVICES API ====================
export const vendorServicesApi = {
  // Public endpoints
  getByVendor: (vendorId: number) => api.get(`/vendor-services/vendor/${vendorId}`),
  // Vendor endpoints
  getMyServices: () => api.get("/vendors/me/services"),
  create: (data: any) => api.post("/vendor-services", data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: any) => api.patch(`/vendor-services/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/vendor-services/${id}`),
  activate: (id: number) => api.patch(`/vendor-services/${id}/activate`),
  deactivate: (id: number) => api.patch(`/vendor-services/${id}/deactivate`),
  // Admin endpoints
  getPending: () => api.get("/vendor-services/admin/pending"),
  getById: (id: number) => api.get(`/vendor-services/admin/${id}`),
  approve: (id: number, reason?: string) => api.patch(`/vendor-services/${id}/approve`, { reason }),
  reject: (id: number, reason: string) => api.patch(`/vendor-services/${id}/reject`, { reason }),
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
  getAll: (params?: any) => api.get("/notifications", { params }),
  getById: (id: number) => api.get(`/notifications/${id}`),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete("/notifications"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  // Admin endpoints
  send: (data: any) => api.post("/notifications/send", data),
  broadcast: (data: any) => api.post("/notifications/send", data),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: any) => api.patch("/notifications/preferences", data),
};

// ==================== AUDIT API ====================
export const auditApi = {
  getAll: (params?: any) => api.get("/audit", { params }),
  getById: (id: number) => api.get(`/audit/${id}`),
  export: () => api.get("/audit/export", { responseType: "blob" }),
};

// ==================== SETTINGS API ====================
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data: any) => api.patch("/settings", data),
  getFeatureFlags: () => api.get("/settings/feature-flags"),
  updateFeatureFlags: (data: any) => api.patch("/settings/feature-flags", data),
  getIntegrations: () => api.get("/settings/integrations"),
  updateIntegrations: (data: any) => api.patch("/settings/integrations", data),
  getSecurity: () => api.get("/settings/security"),
  updateSecurity: (data: any) => api.patch("/settings/security", data),
};

// ==================== EXPRESS API ====================
export const expressApi = {
  getAll: () => api.get("/express"),
  process: (id: number) => api.patch(`/express/${id}/process`),
  reject: (id: number, reason: string) => api.patch(`/express/${id}/reject`, { reason }),
};

// ==================== DASHBOARD API (CORRECTED to role-specific endpoints) ====================
export const dashboardApi = {
  // Admin endpoints
  getAdminStats: () => api.get("/dashboard/admin/stats"),
  getAdminRevenue: () => api.get("/dashboard/admin/revenue"),
  getAdminRecentActivity: () => api.get("/dashboard/admin/activity"),
  
  // Vendor endpoints
  getVendorStats: () => api.get("/dashboard/vendor/stats"),
  
  // Venue owner endpoints
  getVenueStats: () => api.get("/dashboard/venue/stats"),
  
  // Legacy aliases for backward compatibility
  getStats: () => api.get("/dashboard/admin/stats"),
  getRevenue: () => api.get("/dashboard/admin/revenue"),
  getRecentActivity: () => api.get("/dashboard/admin/activity"),
};

// ==================== VENDOR (ME) API ====================
export const vendorApi = {
  getMyProfile: () => api.get("/vendors/me"),
  updateProfile: (data: any) => api.patch("/vendors/me", data),
  getServices: () => api.get("/vendors/me/services"),
  createService: (data: any) => api.post("/vendor-services", data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateService: (id: number, data: any) => api.patch(`/vendor-services/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteService: (id: number) => api.delete(`/vendor-services/${id}`),
  getBookings: () => api.get("/vendors/me/bookings"),
  updateBookingStatus: (bookingId: number, status: string) => api.patch(`/vendors/me/bookings/${bookingId}/status`, { status }),
  getAvailability: () => api.get("/vendors/me/availability"),
  updateAvailability: (data: any) => api.patch("/vendors/me/availability", data),
  getEarnings: () => api.get("/vendors/me/earnings"),
  submitKyc: (data: any) => api.post("/kyc/vendor", data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getKycStatus: () => api.get("/kyc/vendor/me"),
};

// ==================== VENUE (ME) API ====================
export const venueApi = {
  getMyProfile: () => api.get("/venues/me"),
  updateProfile: (data: any) => api.patch("/venues/me", data),
  getBookings: () => api.get("/venues/me/bookings"),
  updateBookingStatus: (bookingId: number, status: string) => api.patch(`/booking/${bookingId}/status`, { status }),
  getAvailability: () => api.get("/venues/me/availability"),
  updateAvailability: (data: any) => api.patch("/venues/me/availability", data),
  getAnalytics: () => api.get("/venues/me/analytics"),
  submitKyc: (data: any) => api.post("/kyc/venue-owner", data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getKycStatus: () => api.get("/kyc/venue-owner/me"),
  getPayouts: () => api.get("/payouts/venue-owner/me"),
  getPayoutStats: () => api.get("/payouts/venue-owner/stats"),
};

// ==================== ANALYTICS API ====================
export const analyticsApi = {
  getOverview: () => api.get("/analytics/overview"),
  getGMV: () => api.get("/analytics/gmv"),
  getBookings: () => api.get("/analytics/bookings"),
  getRevenue: () => api.get("/analytics/revenue"),
  getUsers: () => api.get("/analytics/users"),
  getTopVenues: () => api.get("/analytics/top-venues"),
  getTopVendors: () => api.get("/analytics/top-vendors"),
};

// ==================== ADMIN SETTINGS API ====================
export const adminSettingsApi = {
  getAll: () => api.get("/admin/settings"),
  update: (data: any) => api.patch("/admin/settings", data),
  getFeatureFlags: () => api.get("/admin/settings/feature-flags"),
  updateFeatureFlags: (data: any) => api.patch("/admin/settings/feature-flags", data),
  getIntegrations: () => api.get("/admin/settings/integrations"),
  updateIntegrations: (data: any) => api.patch("/admin/settings/integrations", data),
  getSecurity: () => api.get("/admin/settings/security"),
  updateSecurity: (data: any) => api.patch("/admin/settings/security", data),
};

// ==================== KYC ADMIN API ====================
export const kycAdminApi = {
  getSubmissions: () => api.get("/kyc/admin/submissions"),
  getPending: () => api.get("/kyc/pending"),
  getById: (id: number) => api.get(`/kyc/admin/${id}`),
  updateStatus: (id: number, status: string, reason?: string) => api.patch(`/kyc/admin/${id}/status`, { status, reason }),
};

// ==================== PROMOTIONS API ====================
export const promotionsApi = {
  getAll: () => api.get("/promotions"),
  getById: (id: number) => api.get(`/promotions/${id}`),
  create: (data: any) => api.post("/promotions", data),
  update: (id: number, data: any) => api.patch(`/promotions/${id}`, data),
  delete: (id: number) => api.delete(`/promotions/${id}`),
  validate: (code: string) => api.get(`/promotions/validate?code=${encodeURIComponent(code)}`),
};

// ==================== BANK ACCOUNT API ====================
export const bankAccountApi = {
  getMyAccounts: () => api.get("/bank-account"),
  getVenueOwnerAccount: () => api.get("/bank-account/venue-owner"),
  getVendorAccount: () => api.get("/bank-account/vendor"),
  create: (data: any) => api.post("/bank-account", data),
  update: (id: number, data: any) => api.patch(`/bank-account/${id}`, data),
  delete: (id: number) => api.delete(`/bank-account/${id}`),
  verify: (id: number) => api.patch(`/bank-account/${id}/verify`),
};
