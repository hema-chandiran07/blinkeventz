"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Store, TrendingUp, DollarSign, Search, Users, Star } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface VendorReport {
  id: number;
  businessName: string;
  serviceType: string;
  city: string;
  area: string;
  totalServices: number;
  totalBookings: number;
  totalRevenue: number;
  verificationStatus: string;
  ownerName: string;
  ownerEmail: string;
}

export default function VendorReportsPage() {
  const [vendors, setVendors] = useState<VendorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadVendorReport();
  }, []);

  const loadVendorReport = async () => {
    try {
      setLoading(true);
      const [vendorsRes, bookingsRes] = await Promise.all([
        api.get("/vendors"),
        api.get("/booking/my").catch(() => ({ data: [] }))
      ]);
      
      const vendorData = vendorsRes.data || [];
      const bookings = bookingsRes.data || [];
      
      // Calculate metrics for each vendor
      const reportData: VendorReport[] = vendorData.map((vendor: any) => {
        // Count bookings for this vendor (through AvailabilitySlot)
        const vendorBookings = bookings.filter((b: any) => 
          b.slot?.entityType === 'VENDOR' && b.slot?.entityId === vendor.id
        );
        
        const totalRevenue = vendorBookings.reduce(
          (sum: number, b: any) => sum + (b.totalAmount || 0), 
          0
        );
        
        return {
          id: vendor.id,
          businessName: vendor.businessName,
          serviceType: vendor.services?.[0]?.serviceType || 'Multiple',
          city: vendor.city,
          area: vendor.area,
          totalServices: vendor.services?.length || 0,
          totalBookings: vendorBookings.length,
          totalRevenue,
          verificationStatus: vendor.verificationStatus,
          ownerName: vendor.user?.name || 'Unknown',
          ownerEmail: vendor.user?.email || ''
        };
      });
      
      setVendors(reportData);
    } catch (error) {
      console.error("Failed to load vendor report:", error);
      toast.error("Failed to load vendor report");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = filterCity === "all" || vendor.city === filterCity;
    const matchesStatus = filterStatus === "all" || vendor.verificationStatus === filterStatus;
    return matchesSearch && matchesCity && matchesStatus;
  });

  const exportReport = () => {
    const csv = [
      ["Business Name", "Service Type", "City", "Area", "Services", "Bookings", "Revenue", "Status", "Owner", "Email"],
      ...filteredVendors.map(v => [
        v.businessName, v.serviceType, v.city, v.area, v.totalServices, v.totalBookings, 
        `₹${v.totalRevenue.toLocaleString()}`, v.verificationStatus, v.ownerName, v.ownerEmail
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const totalRevenue = vendors.reduce((sum, v) => sum + v.totalRevenue, 0);
  const totalBookings = vendors.reduce((sum, v) => sum + v.totalBookings, 0);
  const avgServices = vendors.length > 0 ? Math.round(vendors.reduce((sum, v) => sum + v.totalServices, 0) / vendors.length) : 0;

  const cities = Array.from(new Set(vendors.map(v => v.city)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading vendor reports...</p>
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
          <h1 className="text-3xl font-bold text-black">Vendor Performance Report</h1>
          <p className="text-neutral-600">Analytics and insights for all vendors</p>
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
                <p className="text-sm font-medium text-neutral-600">Total Vendors</p>
                <p className="text-2xl font-bold text-black mt-1">{vendors.length}</p>
              </div>
              <div className="p-3 rounded-full bg-silver-100 text-neutral-700">
                <Store className="h-6 w-6" />
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
                <Users className="h-6 w-6" />
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
                <p className="text-sm font-medium text-neutral-600">Avg Services</p>
                <p className="text-2xl font-bold text-black mt-1">{avgServices}</p>
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
                placeholder="Search by business name, owner, or area..."
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
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Vendor Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <div className="text-center py-12 text-neutral-600">
              <Store className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No vendors found</h3>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-silver-200">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Business</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Service Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Location</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Services</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Bookings</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Revenue</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-silver-100 hover:bg-silver-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-black">{vendor.businessName}</p>
                          <p className="text-xs text-neutral-500">{vendor.ownerName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{vendor.serviceType}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-black">{vendor.area}</p>
                          <p className="text-xs text-neutral-500">{vendor.city}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-black">{vendor.totalServices}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-4 w-4 text-neutral-400" />
                          <span className="text-black">{vendor.totalBookings}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-black">₹{vendor.totalRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          vendor.verificationStatus === "VERIFIED" ? "bg-green-100 text-green-700 border-green-300" :
                          vendor.verificationStatus === "PENDING" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                          "bg-red-100 text-red-700 border-red-300"
                        }>
                          {vendor.verificationStatus}
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
              <Store className="h-6 w-6 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">Vendor Performance Insights</h3>
              <ul className="text-sm text-neutral-700 space-y-1">
                <li>• Total vendors on platform: <strong>{vendors.length}</strong></li>
                <li>• Average services per vendor: <strong>{avgServices}</strong></li>
                <li>• Total revenue generated: <strong>₹{(totalRevenue / 100000).toFixed(2)}L</strong></li>
                <li>• Verified vendors: <strong>{vendors.filter(v => v.verificationStatus === 'VERIFIED').length}</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
