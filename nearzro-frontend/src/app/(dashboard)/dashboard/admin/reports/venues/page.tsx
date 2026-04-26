"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Building, TrendingUp, DollarSign, Search, Users, Calendar } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface VenueReport {
  id: number;
  name: string;
  type: string;
  city: string;
  area: string;
  capacity: number;
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  status: string;
  ownerName: string;
}

export default function VenueReportsPage() {
  const [venues, setVenues] = useState<VenueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadVenueReport();
  }, []);

  const loadVenueReport = async () => {
    try {
      setLoading(true);
      const [venuesRes, bookingsRes] = await Promise.all([
        api.get("/venues"),
        api.get("/booking/my").catch(() => ({ data: [] }))
      ]);
      
      const venueData = venuesRes.data?.data || venuesRes.data || [];
      const bookings = bookingsRes.data || [];
      
      // Calculate metrics for each venue
      const reportData: VenueReport[] = venueData.map((venue: any) => {
        const venueBookings = bookings.filter((b: any) => 
          b.slot?.venueId === venue.id
        );
        
        const totalRevenue = venueBookings.reduce(
          (sum: number, b: any) => sum + (b.totalAmount || 0), 
          0
        );
        
        // Calculate occupancy rate (simplified - bookings / 30 days)
        const occupancyRate = Math.min(100, Math.round((venueBookings.length / 30) * 100));
        
        return {
          id: venue.id,
          name: venue.name,
          type: venue.type,
          city: venue.city,
          area: venue.area,
          capacity: venue.capacityMax || 0,
          totalBookings: venueBookings.length,
          totalRevenue,
          occupancyRate,
          status: venue.status,
          ownerName: venue.owner?.name || 'Unknown'
        };
      });
      
      setVenues(reportData);
    } catch (error) {
      console.error("Failed to load venue report:", error);
      toast.error("Failed to load venue report");
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venue.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = filterCity === "all" || venue.city === filterCity;
    const matchesStatus = filterStatus === "all" || venue.status === filterStatus;
    return matchesSearch && matchesCity && matchesStatus;
  });

  const exportReport = () => {
    const csv = [
      ["Venue Name", "Type", "City", "Area", "Capacity", "Bookings", "Revenue", "Occupancy", "Status", "Owner"],
      ...filteredVenues.map(v => [
        v.name, v.type, v.city, v.area, v.capacity, v.totalBookings, 
        `₹${v.totalRevenue.toLocaleString()}`, `${v.occupancyRate}%`, v.status, v.ownerName
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `venue-performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const totalRevenue = venues.reduce((sum, v) => sum + v.totalRevenue, 0);
  const totalBookings = venues.reduce((sum, v) => sum + v.totalBookings, 0);
  const avgOccupancy = venues.length > 0 ? Math.round(venues.reduce((sum, v) => sum + v.occupancyRate, 0) / venues.length) : 0;

  const cities = Array.from(new Set(venues.map(v => v.city)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading venue reports...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Venue Performance Report</h1>
          <p className="text-neutral-600">Analytics and insights for all venues</p>
        </div>
        <Button onClick={exportReport} variant="outline" className="border-black hover:bg-black hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Venues</p>
                <p className="text-2xl font-bold text-black mt-1">{venues.length}</p>
              </div>
              <div className="p-3 rounded-full bg-silver-100 text-neutral-700">
                <Building className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-2xl font-bold text-black mt-1">{totalBookings}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-black mt-1">₹{(totalRevenue / 100000).toFixed(2)}L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Avg Occupancy</p>
                <p className="text-2xl font-bold text-black mt-1">{avgOccupancy}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by venue name or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {cities.length > 0 && (
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="flex h-10 rounded-md border border-silver-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
              >
                <option value="all">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            )}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-silver-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_APPROVAL">Pending</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Venue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Venue Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVenues.length === 0 ? (
            <div className="text-center py-12 text-neutral-600">
              <Building className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No venues found</h3>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-silver-200">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Venue</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Location</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Capacity</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Bookings</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Occupancy</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.map((venue) => (
                    <tr key={venue.id} className="border-b border-silver-100 hover:bg-silver-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-black">{venue.name}</p>
                          <p className="text-xs text-neutral-500">{venue.ownerName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{venue.type}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-black">{venue.area}</p>
                          <p className="text-xs text-neutral-500">{venue.city}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-black">{venue.capacity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-4 w-4 text-neutral-400" />
                          <span className="text-black">{venue.totalBookings}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-black">₹{venue.totalRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-silver-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                venue.occupancyRate >= 75 ? 'bg-green-600' :
                                venue.occupancyRate >= 50 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${venue.occupancyRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-black">{venue.occupancyRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          venue.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-300" :
                          venue.status === "PENDING_APPROVAL" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                          "bg-red-100 text-red-700 border-red-300"
                        }>
                          {venue.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-silver-50 to-silver-100 border-silver-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-white shadow-sm">
              <Building className="h-6 w-6 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">Venue Performance Insights</h3>
              <ul className="text-sm text-neutral-700 space-y-1">
                <li>• Total venues on platform: <strong>{venues.length}</strong></li>
                <li>• Average occupancy rate: <strong>{avgOccupancy}%</strong></li>
                <li>• Total revenue generated: <strong>₹{(totalRevenue / 100000).toFixed(2)}L</strong></li>
                <li>• Top performing cities: <strong>{cities.slice(0, 3).join(', ') || 'N/A'}</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
