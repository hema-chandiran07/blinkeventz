// src/lib/vendors.ts
import api from "@/lib/api";

/* ================= TYPES ================= */

export interface Vendor {
  id: string;
  businessName: string;
  description?: string;
  city?: string;
  priceRange?: string;
}

export interface VendorService {
  id: string;
  title: string;
  description: string;
  price: number;
}

/* ================= PUBLIC ================= */

// Used in /(public)/vendors/page.tsx
export const getVendors = async (): Promise<Vendor[]> => {
  const res = await api.get("/vendors");
  return Array.isArray(res.data) ? res.data : [];
};

/* ================= DASHBOARD ================= */

// Used in dashboard/vendor/page.tsx & profile page
export const getMyVendor = async (): Promise<Vendor | null> => {
  const res = await api.get("/vendors/me");
  return res.data ?? null;
};

// Used in dashboard/vendor/services/page.tsx
export const getMyServices = async (): Promise<VendorService[]> => {
  const res = await api.get("/vendors/me/services");
  return Array.isArray(res.data) ? res.data : [];
};
