"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { VenueCard, type Venue } from "@/components/venues/venue-card";
import { Search, SlidersHorizontal, X, Building, Building2, Palmtree, Tent, Users, MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";

interface FilterState {
  searchQuery: string;
  city: string;
  area: string;
  minPrice: string;
  maxPrice: string;
}

const VENUE_FILTER_CONFIG = [
  { id: "all", label: "All", icon: Star },
  { id: "BANQUET_HALL", label: "Banquet Hall", icon: Building },
  { id: "MARRIAGE_HALL", label: "Marriage Hall", icon: Building2 },
  { id: "BEACH_VENUE", label: "Beach Venue", icon: Palmtree },
  { id: "RESORT", label: "Resort", icon: Tent },
  { id: "HOTEL", label: "Hotel", icon: Building },
  { id: "LAWN", label: "Open Lawn", icon: MapPin },
  { id: "COMMUNITY_HALL", label: "Community Hall", icon: Users },
];

const TN_CITIES = ["Chennai", "Coimbatore", "Madurai", "Salem", "Trichy"];
const CHENNAI_AREAS = [
  "Adyar", "Alwarpet", "Ambattur", "Ambattur OT", "Anna Nagar", "Annanur",
  "Athipattu", "Avadi", "Besant Nagar", "Chengalpattu", "Chromepet", "ECR",
  "Ennore", "Guduvanchery", "Gummidipoondi", "Iyyapanthangal", "Karapakkam",
  "Kelambakkam", "Kilpauk", "Kolathur", "Kotturpuram", "Koyambedu", "Madipakkam",
  "Manali", "Manivakkam", "Maraimalai Nagar", "Medavakkam", "Minjur", "Mogappair",
  "Mylapore", "Navalur", "Nettukupam", "Nungambakkam", "Oragadam", "Pallavaram",
  "Pallikaranai", "Perambur", "Perungalathur", "Perungudi", "Poonamallee", "Porur",
  "RA Puram", "Red Hills", "Semmancheri", "Sholinganallur", "Sriperumbudur",
  "T. Nagar", "Tambaram", "Thirumazhisai", "Thirumullaivoyal", "Thiruvanmiyur",
  "Thoraipakkam", "Tiruvallur", "Urapakkam", "Vanagaram", "Vandalur", "Velachery",
  "Villivakkam"
];

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    city: "",
    area: "",
    minPrice: "",
    maxPrice: "",
  });

  const fetchVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        status: "ACTIVE",
        limit: 50,
        ...(filters.searchQuery && { q: filters.searchQuery }),
        ...(filters.city && { city: filters.city }),
        ...(filters.area && { area: filters.area }),
        ...(filters.minPrice && { minPrice: Number(filters.minPrice) }),
        ...(filters.maxPrice && { maxPrice: Number(filters.maxPrice) }),
        ...(typeFilter !== 'all' && { venueType: typeFilter }),
      };

      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
      );

      const response = await api.get("/venues", { params: cleanParams });
      
      // Safe Data Extraction: Extract from NestJS wrapper { success: true, data: [...] }
      const rawData = response.data?.data || response.data;
      setVenues(Array.isArray(rawData) ? rawData : []);
    } catch (error: any) {
      console.error("API Error:", error);
      setVenues([]); // Reset to empty array on 401/400 to prevent .map() crash
      setError(error?.response?.status === 401 ? "Please log in to view venues" : error?.message || "Failed to load venues");
      if (error?.response?.status !== 401) {
        // Only show toast for non-401 errors
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, typeFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchVenues();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchVenues]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    if (field === "city" && value !== "Chennai") {
      setFilters((prev) => ({ ...prev, city: value, area: "" }));
    } else {
      setFilters((prev) => ({ ...prev, [field]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      city: "",
      area: "",
      minPrice: "",
      maxPrice: "",
    });
  };

  const hasActiveFilters = filters.city || filters.area || filters.minPrice || filters.maxPrice;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-chrome-gradient mb-8">
          Find Your Perfect Venue
        </h1>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-96">
            <div className="glass-dark-subtle border-silver-subtle border rounded-xl flex items-center px-3">
              <Search className="h-5 w-5 text-silver-400" />
              <input
                type="text"
                placeholder="Search venues..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                className="w-full bg-transparent border-none outline-none px-3 py-3 text-white placeholder:text-silver-500"
              />
              {filters.searchQuery && (
                <button onClick={() => handleFilterChange("searchQuery", "")}>
                  <X className="h-4 w-4 text-silver-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 glass-dark-subtle border border-silver-subtle text-silver-300 rounded-xl hover:bg-white/10 transition-all"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Advanced Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-white text-black text-xs px-1.5 py-0.5 rounded-full">
                {[filters.city, filters.area, filters.minPrice, filters.maxPrice].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <motion.div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">
          {VENUE_FILTER_CONFIG.map((filter) => {
            const Icon = filter.icon;
            return (
              <motion.button key={filter.id} onClick={() => setTypeFilter(filter.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border ${typeFilter === filter.id ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "glass-dark-subtle text-silver-300 border-silver-800 hover:bg-white/10 hover:text-white"}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Icon className="h-4 w-4" /> {filter.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Render Guard: Layer 4 - The Render Guard */}
        {isLoading ? (
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
        ) : (venues ?? []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(venues ?? []).map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : (
          <div className="border-silver-subtle border-dashed p-12 glass-dark-subtle text-center">
            <p className="text-silver-400 text-lg mb-4">
              {error ? "Failed to load venues" : "No venues found"}
            </p>
            <button
              onClick={error ? fetchVenues : clearFilters}
              className="text-white underline underline-offset-4 hover:text-silver-300 transition-colors"
            >
              {error ? "Try again" : "Clear filters"}
            </button>
          </div>
        )}
      </div>

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFilterModalOpen(false)}
          />
          <div className="relative glass-dark border border-silver-subtle rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Advanced Filters</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-silver-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-silver-400 text-sm mb-2">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                  className="w-full glass-dark-subtle border border-silver-subtle rounded-xl px-4 py-2.5 text-white outline-none focus:border-silver-400"
                >
                  <option value="">All Cities</option>
                  {TN_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {filters.city && filters.city !== "Chennai" && (
                  <p className="text-warning text-xs mt-1">
                    Currently, venues are only available in Chennai. We are expanding soon!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-silver-400 text-sm mb-2">Area</label>
                {filters.city === "Chennai" ? (
                  <select
                    value={filters.area}
                    onChange={(e) => handleFilterChange("area", e.target.value)}
                    className="w-full glass-dark-subtle border border-silver-subtle rounded-xl px-4 py-2.5 text-white outline-none focus:border-silver-400"
                  >
                    <option value="">All Areas</option>
                    {CHENNAI_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    disabled
                    className="w-full glass-dark-subtle border border-silver-subtle rounded-xl px-4 py-2.5 text-silver-500 outline-none opacity-50 cursor-not-allowed"
                  >
                    <option value="">Select Chennai first</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-silver-400 text-sm mb-2">Price Range (₹)</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                    className="flex-1 glass-dark-subtle border border-silver-subtle rounded-xl px-4 py-2.5 text-white placeholder:text-silver-500 outline-none focus:border-silver-400"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                    className="flex-1 glass-dark-subtle border border-silver-subtle rounded-xl px-4 py-2.5 text-white placeholder:text-silver-500 outline-none focus:border-silver-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={clearFilters}
                className="flex-1 py-2.5 text-silver-400 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-silver-200 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}