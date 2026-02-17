"use client"

import { useState } from "react";
import { MOCK_VENUES } from "@/services/mock-data";
import { VenueCard } from "@/components/venues/venue-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterModal, type FilterState } from "@/components/ui/filter-modal";
import { Search, Building, Hotel, Star, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Filter configuration with Chennai areas
const VENUE_FILTER_CONFIG = [
  { id: "all", label: "All", icon: Star },
  { id: "T Nagar", label: "T Nagar", icon: Building },
  { id: "Adyar", label: "Adyar", icon: Hotel },
  { id: "Velachery", label: "Velachery", icon: Building },
  { id: "Anna Nagar", label: "Anna Nagar", icon: Hotel },
  { id: "OMR", label: "OMR", icon: Building },
];

export default function VenuesPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
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
  const urlArea = searchParams.get('area');
  const urlEvent = searchParams.get('event');

  const filteredVenues = MOCK_VENUES.filter(venue => {
    // URL param filtering
    if (urlArea && venue.area !== urlArea) return false;
    if (urlType && !venue.name.toLowerCase().includes(urlType.toLowerCase())) return false;
    if (urlEvent && !venue.description.toLowerCase().includes(urlEvent.toLowerCase())) return false;

    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          venue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          venue.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = cityFilter === "all" || venue.area === cityFilter;

    // Budget filter
    const matchesBudget = (() => {
      if (!advancedFilters.minBudget && !advancedFilters.maxBudget) return true;
      const min = advancedFilters.minBudget ? Number(advancedFilters.minBudget) : 0;
      const max = advancedFilters.maxBudget ? Number(advancedFilters.maxBudget) : Infinity;
      return venue.price >= min && venue.price <= max;
    })();

    // Location filter - support multiple locations
    const matchesLocation = (() => {
      const selectedLocations = advancedFilters.locations || [];
      if (selectedLocations.length === 0 && !advancedFilters.location && !advancedFilters.useNearMe) return true;
      if (advancedFilters.useNearMe) return true;
      
      // Check if venue area matches any selected location
      if (selectedLocations.length > 0) {
        return selectedLocations.some(
          loc => venue.area.toLowerCase().includes(loc.toLowerCase()) ||
                 venue.city.toLowerCase().includes(loc.toLowerCase())
        );
      }
      
      if (advancedFilters.location) {
        return venue.area.toLowerCase().includes(advancedFilters.location.toLowerCase()) ||
               venue.city.toLowerCase().includes(advancedFilters.location.toLowerCase());
      }
      return true;
    })();

    return matchesSearch && matchesArea && matchesBudget && matchesLocation;
  });

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Venue</h1>
          <p className="mt-1 text-gray-500">Browse our curated selection of event spaces.</p>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search venues..."
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
          {VENUE_FILTER_CONFIG.slice(0, 4).map((filter) => {
            const Icon = filter.icon;
            const isActive = cityFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setCityFilter(filter.id)}
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVenues.map((venue) => (
          <VenueCard key={venue.id} venue={venue} />
        ))}
      </div>

      {filteredVenues.length === 0 && (
        <div className="text-center py-12">
            <p className="text-lg text-gray-500">No venues found matching your criteria.</p>
            <Button variant="link" onClick={() => {setSearchTerm(''); setCityFilter('all')}}>Clear filters</Button>
        </div>
      )}

      {/* FILTER MODAL */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setAdvancedFilters}
        currentFilters={advancedFilters}
        type="venues"
      />
    </div>
  );
}
