// src/lib/vendor.ts
import api from "@/lib/api";

/* =========================
   Vendor Dashboard APIs
   ========================= */

export const getMyVendor = async () => {
  const res = await api.get("/vendors/me");
  return res.data;
};

export const getMyServices = async () => {
  // If backend doesn't have this yet, return empty array safely
  try {
    const res = await api.get("/vendor-services/vendor/me");
    return res.data;
  } catch {
    return [];
  }
};

export const getMyBookings = async () => {
  // Placeholder until backend exists
  return [];
};
