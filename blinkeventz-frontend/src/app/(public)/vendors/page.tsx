"use client"

import { useState } from "react";
import { MOCK_VENDORS } from "@/services/mock-data";
import { VendorCard } from "@/components/vendors/vendor-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function VendorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const filteredVendors = MOCK_VENDORS.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          vendor.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || vendor.serviceType === typeFilter;
    return matchesSearch && matchesType;
  });

  const serviceTypes = Array.from(new Set(MOCK_VENDORS.map(v => v.serviceType)));

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Top Vendors</h1>
          <p className="mt-1 text-gray-500">Photographers, Caterers, Decorators, and more.</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search vendors..."
              className="pl-9 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
             <select
                className="h-10 w-full sm:w-[180px] rounded-full border border-purple-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
             >
                <option value="all">All Services</option>
                {serviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
             </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
            <p className="text-lg text-gray-500">No vendors found matching your criteria.</p>
            <Button variant="link" onClick={() => {setSearchTerm(''); setTypeFilter('all')}}>Clear filters</Button>
        </div>
      )}
    </div>
  );
}
