"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Clock, DollarSign, SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  useNearMe: boolean;
  timing: string;
  availability: string;
}

const defaultFilters: FilterState = {
  minBudget: "",
  maxBudget: "",
  location: "",
  useNearMe: false,
  timing: "",
  availability: "any",
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
    { id: "morning", label: "Morning (6 AM - 12 PM)", icon: "🌅" },
    { id: "afternoon", label: "Afternoon (12 PM - 5 PM)", icon: "☀️" },
    { id: "evening", label: "Evening (5 PM - 9 PM)", icon: "🌆" },
    { id: "night", label: "Night (9 PM - 6 AM)", icon: "🌙" },
    { id: "full-day", label: "Full Day", icon: "📅" },
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
                          alert("Unable to get location. Please enter manually.");
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
                  Or Enter Location
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="City, Area, or Pincode"
                    value={filters.useNearMe ? "" : filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value, useNearMe: false })}
                    className="pl-10 rounded-xl"
                    disabled={filters.useNearMe}
                  />
                </div>
              </div>

              {/* Popular Locations */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Popular Locations
                </Label>
                <div className="flex flex-wrap gap-2">
                  {["Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune"].map((city) => (
                    <button
                      key={city}
                      onClick={() => setFilters({ ...filters, location: city, useNearMe: false })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        filters.location === city && !filters.useNearMe
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-purple-50"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === "timing" && (
            <div className="space-y-6">
              {/* Time Slots */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Preferred Time
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {timingOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFilters({ ...filters, timing: option.id })}
                      className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                        filters.timing === option.id
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105"
                          : "bg-gray-50 text-gray-700 hover:bg-purple-50"
                      }`}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-xs font-medium text-center">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Availability
                </Label>
                <div className="space-y-2">
                  {[
                    { id: "any", label: "Any Time" },
                    { id: "weekends", label: "Weekends Only" },
                    { id: "weekdays", label: "Weekdays Only" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFilters({ ...filters, availability: option.id })}
                      className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-all ${
                        filters.availability === option.id
                          ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                          : "bg-gray-50 text-gray-700 hover:bg-purple-50 border-2 border-transparent"
                      }`}
                    >
                      {option.label}
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
