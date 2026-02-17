"use client";

import { useEffect, useState } from "react";
import { VendorCard } from "@/components/vendors/vendor-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterModal, type FilterState } from "@/components/ui/filter-modal";
import { Search, Utensils, Camera, Sparkles, Music, Scissors, Cake, Star, SlidersHorizontal, X } from "lucide-react";
import { getVendors, type Vendor } from "@/lib/vendors";
import { useSearchParams } from "next/navigation";

// Filter configuration with icons
const FILTER_CONFIG = [
  { id: "all", label: "All", icon: Star },
  { id: "Catering", label: "Catering", icon: Utensils },
  { id: "Photography", label: "Photography", icon: Camera },
  { id: "Decoration", label: "Decoration", icon: Sparkles },
  { id: "DJ", label: "DJ & Music", icon: Music },
  { id: "Makeup", label: "Makeup", icon: Scissors },
  { id: "Bakery", label: "Bakery", icon: Cake },
];

export default function VendorsPage() {
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
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
  const currentTypeFilter = urlType || typeFilter;

  // 🔹 FETCH VENDORS FROM BACKEND
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await getVendors();
        setVendors(data);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // 🔹 FILTER LOGIC (PRISMA‑ALIGNED)
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.businessName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      vendor.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      vendor.serviceType
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      vendor.area
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesType =
      currentTypeFilter === "all" ||
      vendor.services?.some(
        (service) => service.serviceType?.toLowerCase() === currentTypeFilter.toLowerCase()
      ) ||
      vendor.serviceType?.toLowerCase().includes(currentTypeFilter.toLowerCase());

    // Budget filter
    const matchesBudget = (() => {
      if (!advancedFilters.minBudget && !advancedFilters.maxBudget) return true;
      const vendorPrice = vendor.basePrice || vendor.services?.[0]?.price || 0;
      const min = advancedFilters.minBudget ? Number(advancedFilters.minBudget) : 0;
      const max = advancedFilters.maxBudget ? Number(advancedFilters.maxBudget) : Infinity;
      return vendorPrice >= min && vendorPrice <= max;
    })();

    // Location filter - support multiple locations
    const matchesLocation = (() => {
      const selectedLocations = advancedFilters.locations || [];
      if (selectedLocations.length === 0 && !advancedFilters.location && !advancedFilters.useNearMe) return true;
      if (advancedFilters.useNearMe) return true;
      
      // Check if vendor area matches any selected location
      if (selectedLocations.length > 0) {
        return selectedLocations.some(
          loc => vendor.area?.toLowerCase().includes(loc.toLowerCase()) ||
                 vendor.city?.toLowerCase().includes(loc.toLowerCase())
        );
      }
      
      if (advancedFilters.location) {
        return vendor.area?.toLowerCase().includes(advancedFilters.location.toLowerCase()) ||
               vendor.city?.toLowerCase().includes(advancedFilters.location.toLowerCase());
      }
      return true;
    })();

    return matchesSearch && matchesType && matchesBudget && matchesLocation;
  });

  // 🔹 SERVICE TYPES FROM VendorService.serviceType (kept for compatibility)
  // const serviceTypes = Array.from(...)

  // 🔹 LOADING STATE
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading vendors...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Find Top Vendors
          </h1>
          <p className="mt-1 text-gray-500">
            Photographers, Caterers, Decorators, and more.
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search vendors..."
            className="pl-10 pr-12 py-2 w-full sm:w-[280px] rounded-full border-gray-200 focus:border-purple-400 focus:ring-purple-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 flex-1">
          {FILTER_CONFIG.slice(0, 5).map((filter) => {
            const Icon = filter.icon;
            const isActive = typeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setTypeFilter(filter.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-200 scale-105"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filter Button */}
        <Button
          onClick={() => setShowFilterModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {(advancedFilters.minBudget || advancedFilters.maxBudget || advancedFilters.location || advancedFilters.timing) && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </Button>
      </div>

      {/* Active Filters Summary */}
      {(advancedFilters.minBudget || advancedFilters.maxBudget || advancedFilters.location || advancedFilters.timing) && (
        <div className="mb-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-purple-900">Active filters:</span>
            {advancedFilters.minBudget || advancedFilters.maxBudget ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-purple-700 text-xs font-medium border border-purple-200">
                <span>₹{advancedFilters.minBudget || "0"} - ₹{advancedFilters.maxBudget || "∞"}</span>
              </span>
            ) : null}
            {advancedFilters.location ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-purple-700 text-xs font-medium border border-purple-200">
                <span>📍 {advancedFilters.location}</span>
              </span>
            ) : null}
            {advancedFilters.timing ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-purple-700 text-xs font-medium border border-purple-200 capitalize">
                <span>🕐 {advancedFilters.timing}</span>
              </span>
            ) : null}
            <button
              onClick={() => setAdvancedFilters({
                minBudget: "",
                maxBudget: "",
                location: "",
                useNearMe: false,
                timing: "",
                availability: "any",
              })}
              className="ml-auto text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* VENDORS GRID */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">
            No vendors found matching your criteria.
          </p>
          <Button
            variant="link"
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* FILTER MODAL */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setAdvancedFilters}
        currentFilters={advancedFilters}
        type="vendors"
      />
    </div>
  );
}
