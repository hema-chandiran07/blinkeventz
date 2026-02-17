// src/lib/vendors.ts
import api from "@/lib/api";

/* ================= TYPES ================= */

export interface Vendor {
  id: string;
  businessName: string;
  name?: string;
  description?: string;
  city?: string;
  area?: string;
  priceRange?: string;
  verificationStatus?: string;
  services?: VendorService[];
}

export interface VendorService {
  id: string;
  title: string;
  description: string;
  price: number;
  name?: string;
  serviceType?: string;
  baseRate?: number;
}

/* ================= PUBLIC ================= */

// Used in /(public)/vendors/page.tsx
export const getVendors = async (): Promise<Vendor[]> => {
  const res = await api.get("/vendors");
  return Array.isArray(res.data) ? res.data : [];
};

// Used in /(public)/vendors/[id]/page.tsx
export const getVendorById = async (id: string): Promise<Vendor | null> => {
  const res = await api.get(`/vendors/${id}`);
  return res.data ?? null;
};

// Used in /(public)/vendors/[id]/page.tsx
export const getVendorServices = async (id: string): Promise<VendorService[]> => {
  const res = await api.get(`/vendors/${id}/services`);
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
