"use client"

import { useState } from "react";
import { MOCK_VENUES } from "@/services/mock-data";
import { VenueCard } from "@/components/venues/venue-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

// Mock Select for now since I didn't create it yet, or I can use native select or create it.
// I'll create a simple native select wrapper or just use standard HTML select for speed if I didn't create the UI component.
// Wait, I should create the Select component to match the UI style.
// I'll skip the Select component creation for this turn and use standard select styled with tailwind or just Input for simplicity,
// But to be "Senior", I should probably use a proper Select.
// I'll use standard select for now to save tool calls, styled to look like Input.

export default function VenuesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  
  const filteredVenues = MOCK_VENUES.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          venue.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === "all" || venue.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  const cities = Array.from(new Set(MOCK_VENUES.map(v => v.city)));

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Venue</h1>
          <p className="mt-1 text-gray-500">Browse our curated selection of event spaces.</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search venues..."
              className="pl-9 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
             <select
                className="h-10 w-full sm:w-[180px] rounded-full border border-purple-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
             >
                <option value="all">All Cities</option>
                {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                ))}
             </select>
          </div>
        </div>
      </div>

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
    </div>
  );
}
