"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { VendorCard } from "@/components/vendors/vendor-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterModal, type FilterState } from "@/components/ui/filter-modal";
import { Search, Utensils, Camera, Sparkles, Music, Scissors, Cake, Star, SlidersHorizontal, X, Loader2, Mic2, Car, User, MoreHorizontal, Video, PartyPopper, MapPin, DollarSign, Calendar } from "lucide-react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Vendor } from "@/types";
import { motion } from "framer-motion";

// Filter configuration matching Prisma ServiceType enum
const FILTER_CONFIG: { id: string | 'all'; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: Star },
  { id: "CATERING", label: "Catering", icon: Utensils },
  { id: "DECOR", label: "Decor", icon: Sparkles },
  { id: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { id: "MAKEUP", label: "Makeup", icon: Scissors },
  { id: "DJ", label: "DJ", icon: Mic2 },
  { id: "MUSIC", label: "Music", icon: Music },
  { id: "CAR_RENTAL", label: "Car Rental", icon: Car },
  { id: "PRIEST", label: "Priest", icon: User },
  { id: "VIDEOGRAPHY", label: "Videography", icon: Video },
  { id: "ENTERTAINMENT", label: "Entertainment", icon: PartyPopper },
  { id: "OTHER", label: "Other", icon: MoreHorizontal },
];

export default function VendorsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-silver-400" />
        <p className="text-silver-400">Loading vendors...</p>
      </div>
    }>
      <VendorsContent />
    </Suspense>
  );
}

function VendorsContent() {
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | 'all'>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    minBudget: "",
    maxBudget: "",
    location: "",
    locations: [],
    useNearMe: false,
    timing: "",
    availability: "any",
    eventDate: "",
    eventTime: "",
  });

  // Get filter params from URL
  const urlType = searchParams.get('type');

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: 50,
        ...(searchTerm && { q: searchTerm }),
        ...(typeFilter !== 'all' && { serviceType: typeFilter }),
        ...(advancedFilters.location && { city: advancedFilters.location }),
        ...(advancedFilters.minBudget && { minPrice: Number(advancedFilters.minBudget) }),
        ...(advancedFilters.maxBudget && { maxPrice: Number(advancedFilters.maxBudget) }),
      };

      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
      );

      const response = await api.get("/vendors", { params: cleanParams });
      
      const rawData = response.data?.data || response.data;
      const allVendors = Array.isArray(rawData) ? rawData : [];
      // Filter only verified vendors
      const verifiedVendors = allVendors.filter((v: Vendor) => v.verificationStatus === 'VERIFIED');
      setVendors(verifiedVendors);
    } catch (error: any) {
      console.error("API Error:", error);
      setVendors([]);
      setError(error?.response?.status === 401 ? "Please log in to view vendors" : error?.message || "Failed to load vendors");
      if (error?.response?.status !== 401) {
        toast.error(error?.response?.data?.message || "Failed to load vendors");
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, advancedFilters]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchVendors();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchVendors]);

  // Apply URL filters on mount
  useEffect(() => {
    if (urlType) {
      setTypeFilter(urlType);
    }
  }, [urlType]);

  const handleFilterApply = (filters: FilterState) => {
    setAdvancedFilters(filters);
  };

  const clearFilters = () => {
    setAdvancedFilters({
      minBudget: "",
      maxBudget: "",
      location: "",
      locations: [],
      useNearMe: false,
      timing: "",
      availability: "any",
      eventDate: "",
      eventTime: "",
    });
    setTypeFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters = typeFilter !== "all" || searchTerm || advancedFilters.minBudget || advancedFilters.maxBudget || advancedFilters.location;

  // Local frontend filtering — guarantees UI reacts instantly regardless of backend query param support
  const displayedVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      vendor.services?.some((s: any) => s.serviceType === typeFilter) ||
      vendor.businessType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <motion.div
      className="min-h-screen bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-chrome-gradient mb-8">Find Expert Vendors</h1>
        
        <motion.div
          className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="glass-dark-subtle border-silver-subtle border rounded-xl flex items-center px-3 w-full md:w-96 focus-within:border-silver-400 focus-within:ring-1 focus-within:ring-silver-400 transition-all">
            <Search className="h-5 w-5 text-silver-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-3 py-3 text-white placeholder:text-silver-500 shadow-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-silver-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setShowFilterModal(true)} 
              className="flex items-center gap-2 px-4 py-2.5 glass-dark-subtle border border-silver-subtle text-silver-300 rounded-xl hover:bg-white/10 transition-all"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-silver-400 hover:text-white transition-colors text-sm px-2"
              >
                Clear all
              </button>
            )}
          </div>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {FILTER_CONFIG.map((filter) => {
            const Icon = filter.icon;
            return (
              <motion.button
                key={filter.id}
                onClick={() => setTypeFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                  typeFilter === filter.id
                    ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "glass-dark-subtle text-silver-300 border-silver-800 hover:bg-white/10 hover:text-white"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Results Count */}
        <motion.div 
          className="mb-6 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-silver-400">
            <span className="text-white font-semibold">{displayedVendors.length}</span> vendors found
          </p>
        </motion.div>

        {/* Loading State matching VenuesPage */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-dark-subtle rounded-xl overflow-hidden animate-pulse">
                <div className="h-56 bg-silver-900/30" />
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-silver-900/30 rounded w-3/4" />
                  <div className="h-4 bg-silver-900/30 rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-silver-900/30 rounded w-16" />
                    <div className="h-6 bg-silver-900/30 rounded w-16" />
                  </div>
                  <div className="h-4 bg-silver-900/30 rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedVendors.length > 0 ? (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {displayedVendors.map((vendor, index) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <VendorCard vendor={vendor} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="border-silver-subtle border-dashed p-12 glass-dark-subtle text-center">
            <p className="text-silver-400 text-lg mb-4">
              {error ? "Failed to load vendors" : "No vendors found"}
            </p>
            <button
              onClick={error ? fetchVendors : clearFilters}
              className="text-white underline underline-offset-4 hover:text-silver-300 transition-colors"
            >
              {error ? "Try again" : "Clear filters"}
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        type="vendors"
        currentFilters={advancedFilters}
      />
    </motion.div>
  );
}
