"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, DollarSign, Calendar, Users, ShoppingBag,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import api from "@/lib/api";

interface AnalyticsData {
  gmv: {
    total: number;
    growth: number;
    monthly: Array<{ month: string; amount: number }>;
  };
  bookings: {
    total: number;
    growth: number;
    byStatus: { confirmed: number; pending: number; completed: number };
  };
  revenue: {
    total: number;
    growth: number;
    commission: number;
  };
  users: {
    total: number;
    growth: number;
    byRole: { customers: number; vendors: number; venueOwners: number };
  };
  topVenues: Array<{ id: number; name: string; bookings: number; revenue: number }>;
  topVendors: Array<{ id: number; name: string; bookings: number; revenue: number }>;
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await api.get("/analytics/overview");
      setData(response.data);
    } catch (error: any) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Analytics Dashboard</h1>
        <p className="text-neutral-600">Platform performance and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total GMV</p>
                <p className="text-2xl font-bold text-black">
                  {data?.gmv ? formatCurrency(data.gmv.total) : "-"}
                </p>
              </div>
              <div className="p-3 rounded-full bg-black text-white">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {(data?.gmv.growth || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={(data?.gmv.growth || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {(data?.gmv.growth || 0) >= 0 ? "+" : ""}{data?.gmv.growth || 0}%
              </span>
              <span className="text-neutral-600">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-2xl font-bold text-black">{data?.bookings.total || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-black text-white">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {(data?.bookings.growth || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={(data?.bookings.growth || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {(data?.bookings.growth || 0) >= 0 ? "+" : ""}{data?.bookings.growth || 0}%
              </span>
              <span className="text-neutral-600">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-black">
                  {data?.revenue ? formatCurrency(data.revenue.total) : "-"}
                </p>
              </div>
              <div className="p-3 rounded-full bg-black text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {(data?.revenue.growth || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={(data?.revenue.growth || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {(data?.revenue.growth || 0) >= 0 ? "+" : ""}{data?.revenue.growth || 0}%
              </span>
              <span className="text-neutral-600">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Users</p>
                <p className="text-2xl font-bold text-black">{data?.users.total || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-black text-white">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {(data?.users.growth || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={(data?.users.growth || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {(data?.users.growth || 0) >= 0 ? "+" : ""}{data?.users.growth || 0}%
              </span>
              <span className="text-neutral-600">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Bookings by Status */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-black">Confirmed</span>
                </div>
                <span className="text-lg font-bold text-black">{data?.bookings.byStatus.confirmed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-black">Pending</span>
                </div>
                <span className="text-lg font-bold text-black">{data?.bookings.byStatus.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-black">Completed</span>
                </div>
                <span className="text-lg font-bold text-black">{data?.bookings.byStatus.completed || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-black">Customers</span>
                </div>
                <span className="text-lg font-bold text-black">{data?.users.byRole.customers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium text-black">Vendors</span>
                </div>
                <span className="text-lg font-bold text-black">{data?.users.byRole.vendors || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium text-black">Venue Owners</span>
                </div>
                <span className="text-lg font-bold text-black">{data?.users.byRole.venueOwners || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Venues */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.topVenues.slice(0, 5).map((venue, index) => (
                <div key={venue.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center text-sm font-bold text-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-black">{venue.name}</p>
                      <p className="text-xs text-neutral-600">{venue.bookings} bookings</p>
                    </div>
                  </div>
                  <span className="font-bold text-black">{formatCurrency(venue.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.topVendors.slice(0, 5).map((vendor, index) => (
                <div key={vendor.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center text-sm font-bold text-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-black">{vendor.name}</p>
                      <p className="text-xs text-neutral-600">{vendor.bookings} bookings</p>
                    </div>
                  </div>
                  <span className="font-bold text-black">{formatCurrency(vendor.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
