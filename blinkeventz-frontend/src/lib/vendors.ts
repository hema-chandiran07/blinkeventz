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

/* ================= IMAGE HELPERS ================= */
// Fallback images for vendors without images
export const getVendorImage = (vendor: Vendor): string => {
  const imageMap: Record<string, string> = {
    "1": "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80", // Catering - Annapurna
    "2": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80", // Photography - LensCraft
    "3": "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=800&q=80", // Decoration - Floral Dreams
    "4": "https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=800&q=80", // DJ - Akhil
    "5": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80", // Makeup - Glam Squad
    "6": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80", // Bakery - Sweet Bites
    "7": "https://images.unsplash.com/photo-1596230672094-9c8a5b6a7b6e?w=800&q=80", // Mehendi - Zainab
    "8": "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&q=80", // Live Band - Sangeetha
    "9": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80", // Event Planner - Eventz
    "10": "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80", // Catering - Traditional Touch
    "11": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80", // Photography - Picture Perfect
    "12": "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=800&q=80", // Decoration - Royal
    "13": "https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=800&q=80", // DJ - BollyWood Beats
    "14": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80", // Makeup - Bridal Glow
    "15": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80", // Bakery - Cake Couture
    "16": "https://images.unsplash.com/photo-1596230672094-9c8a5b6a7b6e?w=800&q=80", // Mehendi - Rangoli
    "17": "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&q=80", // Live Band - Fusion
    "18": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80", // Event Planner - Dream Weddings
    "19": "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80", // Catering - Spice Garden
    "20": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80", // Photography - Candid Moments
  };
  return imageMap[vendor.id] || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80";
};

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
