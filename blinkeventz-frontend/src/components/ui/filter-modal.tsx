"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Clock, DollarSign, SlidersHorizontal, Search, Calendar as CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
  type: "vendors" | "venues";
}

export interface FilterState {
  minBudget: string;
  maxBudget: string;
  location: string;
  locations: string[];
  useNearMe: boolean;
  timing: string;
  availability: string;
  eventDate: string;
  eventTime: string;
}

const defaultFilters: FilterState = {
  minBudget: "",
  maxBudget: "",
  location: "",
  locations: [],
  useNearMe: false,
  timing: "",
  availability: "any",
  eventDate: "",
  eventTime: "",
};

export function FilterModal({ isOpen, onClose, onApply, currentFilters, type }: FilterModalProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [activeTab, setActiveTab] = useState<"budget" | "location" | "timing">("budget");

  // Sync filters when modal opens or currentFilters changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setFilters(currentFilters || defaultFilters);
      }, 0);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "unset";
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, currentFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters(defaultFilters);
  };

  if (!isOpen) return null;

  const budgetOptions = type === "vendors" 
    ? [
        { label: "Under ₹10,000", min: "0", max: "10000" },
        { label: "₹10,000 - ₹25,000", min: "10000", max: "25000" },
        { label: "₹25,000 - ₹50,000", min: "25000", max: "50000" },
        { label: "₹50,000 - ₹1,00,000", min: "50000", max: "100000" },
        { label: "Above ₹1,00,000", min: "100000", max: "" },
      ]
    : [
        { label: "Under ₹25,000", min: "0", max: "25000" },
        { label: "₹25,000 - ₹50,000", min: "25000", max: "50000" },
        { label: "₹50,000 - ₹1,00,000", min: "50000", max: "100000" },
        { label: "₹1,00,000 - ₹2,50,000", min: "100000", max: "250000" },
        { label: "Above ₹2,50,000", min: "250000", max: "" },
      ];

  const timingOptions = [
    { id: "morning", label: "Morning", timeRange: "6:00 AM - 12:00 PM", color: "from-amber-400 to-orange-500" },
    { id: "afternoon", label: "Afternoon", timeRange: "12:00 PM - 5:00 PM", color: "from-yellow-400 to-amber-500" },
    { id: "evening", label: "Evening", timeRange: "5:00 PM - 9:00 PM", color: "from-purple-400 to-pink-500" },
    { id: "night", label: "Night", timeRange: "9:00 PM - 6:00 AM", color: "from-indigo-500 to-purple-600" },
    { id: "full-day", label: "Full Day", timeRange: "24 Hours", color: "from-blue-400 to-cyan-500" },
  ];

  // Chennai areas - major to minor (no duplicates)
  const chennaiLocations = [
    // Major Areas
    "T Nagar", "Adyar", "Velachery", "Anna Nagar", "OMR", "ECR",
    // Commercial Areas
    "Nungambakkam", "Mylapore", "Triplicane", "Egmore", "Royapettah",
    // IT Corridor
    "Guindy", "Porur", "Thoraipakkam", "Perungudi", "Karapakkam",
    // Residential Areas
    "Besant Nagar", "Alwarpet", "Raja Annamalai Puram", "Kotturpuram", "Kilpauk",
    // Suburban Areas
    "Tambaram", "Chromepet", "Pallavaram", "Medavakkam", "Selaiyur",
    // Emerging Areas
    "Vadapalani", "Ashok Nagar", "Kodambakkam", "Virugambakkam", "Saligramam",
    // North Chennai
    "Ambattur", "Padi", "Korattur", "Madhavaram", "Tondiarpet",
    // South Chennai
    "Pallikaranai", "Perumbakkam", "Siruseri",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600">
              <SlidersHorizontal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Filter {type === "vendors" ? "Vendors" : "Venues"}
              </h2>
              <p className="text-xs text-gray-500">Customize your search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("budget")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "budget"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Budget
          </button>
          <button
            onClick={() => setActiveTab("location")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "location"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MapPin className="h-4 w-4" />
            Location
          </button>
          <button
            onClick={() => setActiveTab("timing")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "timing"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            Timing
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Budget Tab */}
          {activeTab === "budget" && (
            <div className="space-y-6">
              {/* Quick Select */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Quick Select
                </Label>
                <div className="space-y-2">
                  {budgetOptions.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setFilters({ ...filters, minBudget: option.min, maxBudget: option.max })}
                      className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-all ${
                        filters.minBudget === option.min && filters.maxBudget === option.max
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                          : "bg-gray-50 text-gray-700 hover:bg-purple-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Range */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Custom Range
                </Label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minBudget}
                      onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <span className="flex items-center text-gray-400">to</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxBudget}
                      onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === "location" && (
            <div className="space-y-6">
              {/* Near Me */}
              <div>
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        () => {
                          setFilters({
                            ...filters,
                            useNearMe: true,
                            location: "Current Location"
                          });
                        },
                        () => {
                          toast.error("Unable to get location", { description: "Please enter location manually" });
                        }
                      );
                    }
                  }}
                  className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                    filters.useNearMe
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                      : "bg-gray-50 text-gray-700 hover:bg-purple-50"
                  }`}
                >
                  <div className={`p-2 rounded-full ${filters.useNearMe ? "bg-white/20" : "bg-purple-100"}`}>
                    <MapPin className={`h-5 w-5 ${filters.useNearMe ? "text-white" : "text-purple-600"}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Use Current Location</p>
                    <p className={`text-xs ${filters.useNearMe ? "text-white/80" : "text-gray-500"}`}>
                      Find {type} near you
                    </p>
                  </div>
                </button>
              </div>

              {/* Manual Entry */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Search by Location
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search areas in Chennai..."
                    value={filters.useNearMe ? "" : filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value, useNearMe: false })}
                    className="pl-10 rounded-xl"
                    disabled={filters.useNearMe}
                  />
                </div>
              </div>

              {/* Chennai Locations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold text-gray-700">
                    Chennai Areas
                  </Label>
                  <span className="text-xs text-gray-500">
                    {(filters.locations || []).length} selected
                  </span>
                </div>
                
                {/* Selected Areas */}
                {(filters.locations || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-2 bg-purple-50 rounded-lg">
                    {(filters.locations || []).map((area) => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                        onClick={() => {
                          setFilters({ 
                            ...filters, 
                            locations: (filters.locations || []).filter(l => l !== area) 
                          });
                        }}
                      >
                        {area}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                    <button
                      onClick={() => setFilters({ ...filters, locations: [] })}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2">
                  {chennaiLocations.map((area) => (
                    <button
                      key={area}
                      onClick={() => {
                        const currentLocations = filters.locations || [];
                        const isSelected = currentLocations.includes(area);
                        setFilters({ 
                          ...filters, 
                          locations: isSelected
                            ? currentLocations.filter(l => l !== area)
                            : [...currentLocations, area]
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border-2 ${
                        (filters.locations || []).includes(area)
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md border-purple-700"
                          : "bg-gray-100 text-gray-700 hover:bg-purple-50 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{area}</span>
                        {(filters.locations || []).includes(area) && (
                          <Check className="h-3 w-3 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === "timing" && (
            <div className="space-y-6">
              {/* Event Date Picker */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Event Date
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={filters.eventDate}
                    onChange={(e) => setFilters({ ...filters, eventDate: e.target.value })}
                    className="pl-10 rounded-xl"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Select your event date</p>
              </div>

              {/* Event Time Picker */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Event Time
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="time"
                    value={filters.eventTime}
                    onChange={(e) => setFilters({ ...filters, eventTime: e.target.value })}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Select preferred time</p>
              </div>

              {/* Time Slot Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Preferred Time Slot
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {timingOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFilters({ ...filters, timing: option.id })}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 relative ${
                        filters.timing === option.id
                          ? `bg-gradient-to-r ${option.color} text-white shadow-lg scale-[1.02] border-transparent`
                          : "bg-white text-gray-700 hover:bg-purple-50 border-gray-200"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${filters.timing === option.id ? "text-white" : "text-gray-900"}`}>
                          {option.label}
                        </span>
                        <span className={`text-xs ${filters.timing === option.id ? "text-white/90" : "text-gray-500"}`}>
                          {option.timeRange}
                        </span>
                      </div>
                      {filters.timing === option.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Day Preference
                </Label>
                <div className="space-y-2">
                  {[
                    { id: "any", label: "Any Day", description: "No preference" },
                    { id: "weekends", label: "Weekends Only", description: "Saturday & Sunday" },
                    { id: "weekdays", label: "Weekdays Only", description: "Monday - Friday" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFilters({ ...filters, availability: option.id })}
                      className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                        filters.availability === option.id
                          ? "bg-purple-50 text-purple-700 border-purple-300 shadow-md"
                          : "bg-white text-gray-700 hover:bg-purple-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{option.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                        </div>
                        {filters.availability === option.id && (
                          <Check className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1 rounded-xl border-gray-300"
            >
              Clear All
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
