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

/* ================= MOCK DATA ================= */
const mockVendors: Vendor[] = [
  {
    id: "1",
    businessName: "Elite Catering Co.",
    name: "Elite Catering",
    description: "Premium catering services for weddings and corporate events",
    city: "Chennai",
    area: "T Nagar",
    priceRange: "$$$",
    verificationStatus: "verified",
    services: [{ id: "s1", serviceType: "Catering", title: "Wedding Catering", description: "Full service catering", price: 50000 }]
  },
  {
    id: "2",
    businessName: "Capture Moments Photography",
    name: "Capture Moments",
    description: "Professional photography and videography services",
    city: "Chennai",
    area: "Anna Nagar",
    priceRange: "$$",
    verificationStatus: "verified",
    services: [{ id: "s2", serviceType: "Photography", title: "Wedding Photography", description: "Full day coverage", price: 35000 }]
  },
  {
    id: "3",
    businessName: "Dream Decor Studio",
    name: "Dream Decor",
    description: "Beautiful decorations for all occasions",
    city: "Chennai",
    area: "Velachery",
    priceRange: "$$$",
    verificationStatus: "verified",
    services: [{ id: "s3", serviceType: "Decoration", title: "Event Decoration", description: "Complete venue decoration", price: 75000 }]
  },
  {
    id: "4",
    businessName: "DJ Beats Entertainment",
    name: "DJ Beats",
    description: "Live DJ and music entertainment",
    city: "Chennai",
    area: "OMR",
    priceRange: "$$",
    verificationStatus: "pending",
    services: [{ id: "s4", serviceType: "DJ", title: "DJ Services", description: "4 hours DJ performance", price: 25000 }]
  },
  {
    id: "5",
    businessName: "Glam Makeup Studio",
    name: "Glam Makeup",
    description: "Professional makeup artists for bridal and events",
    city: "Chennai",
    area: "Adyar",
    priceRange: "$$",
    verificationStatus: "verified",
    services: [{ id: "s5", serviceType: "Makeup", title: "Bridal Makeup", description: "Complete bridal makeup", price: 15000 }]
  },
  {
    id: "6",
    businessName: "Sweet Treats Bakery",
    name: "Sweet Treats",
    description: "Custom cakes and desserts for events",
    city: "Chennai",
    area: "Tambaram",
    priceRange: "$",
    verificationStatus: "verified",
    services: [{ id: "s6", serviceType: "Bakery", title: "Wedding Cake", description: "Custom designed wedding cake", price: 8000 }]
  }
];

/* ================= PUBLIC ================= */

// Used in /(public)/vendors/page.tsx
export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const res = await api.get("/vendors");
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    console.warn("API unavailable, using mock data");
    return mockVendors;
  }
};

// Used in /(public)/vendors/[id]/page.tsx
export const getVendorById = async (id: string): Promise<Vendor | null> => {
  try {
    const res = await api.get(`/vendors/${id}`);
    return res.data ?? null;
  } catch {
    return mockVendors.find(v => v.id === id) || null;
  }
};

// Used in /(public)/vendors/[id]/page.tsx
export const getVendorServices = async (id: string): Promise<VendorService[]> => {
  try {
    const res = await api.get(`/vendors/${id}/services`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    const vendor = mockVendors.find(v => v.id === id);
    return vendor?.services || [];
  }
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
