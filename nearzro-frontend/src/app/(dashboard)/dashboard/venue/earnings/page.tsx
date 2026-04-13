"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle,
  ArrowLeft, Download, Calendar, BarChart3, RefreshCw, IndianRupee,
  ArrowUpRight, ArrowDownRight, Loader2, Building2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface EarningsStats {
  totalRevenue: number;
  completedRevenue: number;
  pendingRevenue: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  platformFees: number;
  netEarnings: number;
  currency: string;
  revenueGrowth: number;
  bookingsGrowth: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

interface VenuePerformance {
  id: number;
  name: string;
  city: string;
  bookings: number;
  revenue: number;
  occupancyRate: number;
  rating: number;
}

interface EventTypeBreakdown {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

// ==================== Constants ====================
const PLATFORM_FEE_PERCENTAGE = 5;

const EVENT_TYPE_COLORS: Record<string, string> = {
  Wedding: 'from-pink-500 to-rose-500',
  Corporate: 'from-blue-500 to-indigo-500',
  Birthday: 'from-amber-500 to-orange-500',
  Conference: 'from-emerald-500 to-teal-500',
  Social: 'from-purple-500 to-violet-500',
  Other: 'from-neutral-500 to-slate-500',
};

// ==================== Main Component ====================
export default function VenueEarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [venuePerformance, setVenuePerformance] = useState<VenuePerformance[]>([]);
  const [eventTypeBreakdown, setEventTypeBreakdown] = useState<EventTypeBreakdown[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const loadEarningsData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      else setLoading(true);

      const [analyticsRes, revenueRes] = await Promise.all([
        api.get('/venues/analytics').catch(() => ({ data: null })),
        api.get('/venues/analytics/revenue').catch(() => ({ data: null })),
      ]);

      const analyticsData = analyticsRes.data || {};
      const revenueData = revenueRes.data || {};

      setStats({
        totalRevenue: analyticsData.totalRevenue || 0,
        completedRevenue: analyticsData.completedRevenue || 0,
        pendingRevenue: 0,
        totalBookings: analyticsData.totalBookings || 0,
        completedBookings: analyticsData.completedBookings || 0,
        pendingBookings: analyticsData.pendingBookings || 0,
        cancelledBookings: analyticsData.cancelledBookings || 0,
        platformFees: Math.round((analyticsData.totalRevenue || 0) * (PLATFORM_FEE_PERCENTAGE / 100)),
        netEarnings: Math.round((analyticsData.totalRevenue || 0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)),
        currency: analyticsData.currency || 'INR',
        revenueGrowth: analyticsData.revenueGrowth || 0,
        bookingsGrowth: analyticsData.bookingsGrowth || 0,
      });

      setMonthlyData(analyticsData.monthlyRevenue || []);
      setVenuePerformance(analyticsData.venuePerformance || []);
      setEventTypeBreakdown(analyticsData.eventTypeBreakdown || []);

      if (showRefreshToast) toast.success("Earnings data refreshed");
    } catch (error) {
      console.error("Failed to load earnings:", error);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  const handleRefresh = async () => {
    await loadEarningsData(true);
  };

  const handleExport = () => {
    try {
      const headers = ['Venue', 'City', 'Bookings', 'Revenue', 'Platform Fee', 'Net Earnings', 'Occupancy Rate', 'Rating'];
      const rows = venuePerformance.map(v => [
        v.name,
        v.city,
        v.bookings,
        `Rs.${v.revenue.toLocaleString()}`,
        `Rs.${Math.round(v.revenue * PLATFORM_FEE_PERCENTAGE / 100).toLocaleString()}`,
        `Rs.${Math.round(v.revenue * (1 - PLATFORM_FEE_PERCENTAGE / 100)).toLocaleString()}`,
        `${v.occupancyRate.toFixed(1)}%`,
        v.rating.toFixed(1),
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `venue-earnings-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success("Earnings report exported");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  const filteredVenues = filterMonth === "all"
    ? venuePerformance
    : venuePerformance.filter(v => {
        const monthlyEntry = monthlyData.find(m => m.month === filterMonth);
        return monthlyEntry ? monthlyEntry.bookings > 0 : true;
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading earnings data...</p>
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
      {/* ==================== Header ==================== */}
      <motion.div
        className="flex items-center justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/venue")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Earnings & Revenue</h1>
            <p className="text-neutral-600">Track your venue revenue and performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* ==================== Stats Cards ==================== */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Total Revenue */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  Rs.{(stats?.totalRevenue || 0).toLocaleString()}
                </p>
                {stats?.revenueGrowth !== undefined && stats.revenueGrowth !== 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {stats.revenueGrowth > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                    <span className={cn(
                      "text-xs",
                      stats.revenueGrowth > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {Math.abs(stats.revenueGrowth)}% vs last month
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-full bg-green-600 text-white">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Earnings */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Net Earnings</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  Rs.{(stats?.netEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  After {PLATFORM_FEE_PERCENTAGE}% platform fee
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Fees */}
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700">Platform Fees</p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">
                  Rs.{(stats?.platformFees || 0).toLocaleString()}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  {PLATFORM_FEE_PERCENTAGE}% of revenue
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Bookings */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">Completed</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {stats?.completedBookings || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  of {stats?.totalBookings || 0} total bookings
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Bookings */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700">Pending</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {stats?.pendingBookings || 0}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {stats?.cancelledBookings || 0} cancelled
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-600 text-white">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ==================== Info Card ==================== */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900">How Venue Earnings Work</p>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p><strong>Booking Confirmed:</strong> Revenue is tracked when a customer books your venue</p>
                <p><strong>Event Completed:</strong> After the event date passes, earnings become eligible for payout</p>
                <p><strong>Platform Fee:</strong> A {PLATFORM_FEE_PERCENTAGE}% fee is deducted from each booking</p>
                <p><strong>Net Earnings:</strong> The remaining amount after platform fees is your net revenue</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Monthly Revenue Chart ==================== */}
      {monthlyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Monthly Revenue Trend</CardTitle>
              <CardDescription>Your venue revenue over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {monthlyData.map((month, index) => (
                  <div key={index} className="text-center p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                    <p className="text-xs font-medium text-neutral-600 mb-1">{month.month}</p>
                    <p className="text-lg font-bold text-black">Rs.{month.revenue > 0 ? `${(month.revenue / 1000).toFixed(1)}K` : '0'}</p>
                    <p className="text-xs text-neutral-500">{month.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ==================== Event Type Breakdown ==================== */}
      {eventTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Revenue by Event Type</CardTitle>
            <CardDescription>Breakdown of your earnings by event category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {eventTypeBreakdown.map((event, index) => (
                <div key={index} className="p-4 rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-black">{event.type}</h4>
                    <Badge variant="outline">{event.percentage.toFixed(0)}%</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-neutral-600">{event.count} events</p>
                    <p className="text-lg font-bold text-black">Rs.{event.revenue.toLocaleString()}</p>
                  </div>
                  <div className="mt-2 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full bg-gradient-to-r", EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.Other)}
                      style={{ width: `${event.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== Venue Performance ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Venue Performance</CardTitle>
              <CardDescription>Revenue and occupancy metrics for each venue</CardDescription>
            </div>
            {venuePerformance.length > 1 && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm text-black"
              >
                <option value="all">All Time</option>
                {monthlyData.map((m, i) => (
                  <option key={i} value={m.month}>{m.month}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredVenues.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No venue data found</h3>
              <p className="text-neutral-600">Venue performance data will appear once you start receiving bookings</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Venue</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">City</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600">Bookings</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600">Net Earnings</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600">Occupancy</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.map((venue) => (
                    <tr key={venue.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-neutral-600" />
                          </div>
                          <span className="font-medium text-black">{venue.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">{venue.city}</td>
                      <td className="py-3 px-4 text-sm text-black text-right">{venue.bookings}</td>
                      <td className="py-3 px-4 text-sm text-black text-right font-medium">Rs.{venue.revenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-green-700 text-right font-medium">
                        Rs.{Math.round(venue.revenue * (1 - PLATFORM_FEE_PERCENTAGE / 100)).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-black text-right">{venue.occupancyRate.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                          {venue.rating.toFixed(1)}
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

      {/* ==================== Quick Links ==================== */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push("/dashboard/venue/payouts")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="font-semibold text-black">View Payouts</p>
                <p className="text-sm text-neutral-600">Track payout history and status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push("/dashboard/venue/analytics")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold text-black">Full Analytics</p>
                <p className="text-sm text-neutral-600">Detailed venue analytics and insights</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push("/dashboard/venue/bookings")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="font-semibold text-black">Manage Bookings</p>
                <p className="text-sm text-neutral-600">View and manage all bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
