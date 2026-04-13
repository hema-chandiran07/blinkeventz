"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, DollarSign, Calendar, Users, Building2,
  ArrowUpRight, ArrowDownRight, Download, Star, RefreshCw,
  Loader2, AlertCircle, BarChart3, PieChart
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface VenueAnalytics {
  totalVenues: number;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  totalRevenue: number;
  currency: string;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
  occupancy: number;
}

interface VenuePerformance {
  id: number;
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
  occupancyRate: number;
}

interface EventTypeDef {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

// ==================== Constants ====================
const COLORS = ["#059669", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#ec4899", "#8b5cf6"];

// ==================== Main Component ====================
export default function VenueAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "all">("6m");
  const [analytics, setAnalytics] = useState<VenueAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [venuePerformance, setVenuePerformance] = useState<VenuePerformance[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDef[]>([]);

  // Load analytics data
  const loadAnalytics = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load venue analytics from API
      const analyticsResponse = await api.get('/venues/me/analytics');
      const analyticsData = analyticsResponse.data || {
        totalVenues: 0,
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        currency: 'INR',
      };
      
      setAnalytics(analyticsData);

      // Load bookings for monthly data calculation
      try {
        const bookingsResponse = await api.get('/venues/me/bookings');
        const bookings = bookingsResponse.data || [];
        
        // Calculate monthly data from bookings
        const monthlyMap = new Map<string, { revenue: number; bookings: number }>();
        
        // Initialize last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
          monthlyMap.set(key, { revenue: 0, bookings: 0 });
        }
        
        // Aggregate bookings by month
        bookings.forEach((booking: any) => {
          const date = new Date(booking.slot?.date || booking.createdAt);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const existing = monthlyMap.get(key) || { revenue: 0, bookings: 0 };
          monthlyMap.set(key, {
            revenue: existing.revenue + (booking.totalAmount || 0),
            bookings: existing.bookings + 1,
          });
        });
        
        const monthly: MonthlyData[] = Array.from(monthlyMap.entries()).map(([key, data]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return {
            month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            revenue: data.revenue,
            bookings: data.bookings,
            occupancy: Math.min(100, Math.round((data.bookings / 30) * 100)), // Simplified occupancy calc
          };
        });
        
        setMonthlyData(monthly);
        
        // Calculate event type distribution
        const typeMap = new Map<string, { count: number; revenue: number }>();
        bookings.forEach((booking: any) => {
          const type = booking.slot?.entityType || 'VENUE';
          const existing = typeMap.get(type) || { count: 0, revenue: 0 };
          typeMap.set(type, {
            count: existing.count + 1,
            revenue: existing.revenue + (booking.totalAmount || 0),
          });
        });
        
        const totalBookings = bookings.length;
        const types: EventTypeDef[] = Array.from(typeMap.entries()).map(([type, data]) => ({
          type: type === 'VENUE' ? 'Venue Booking' : 'Service Booking',
          count: data.count,
          revenue: data.revenue,
          percentage: totalBookings > 0 ? Math.round((data.count / totalBookings) * 100) : 0,
        })).sort((a, b) => b.count - a.count);
        
        setEventTypes(types);
        
        // Load venues for performance data
        try {
          const venuesResponse = await api.get('/venues/my');
          const venues = venuesResponse.data || [];
          
          const performance: VenuePerformance[] = venues.map((venue: any, index: number) => {
            const venueBookings = bookings.filter((b: any) => b.slot?.entityId === venue.id);
            const venueRevenue = venueBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

            // Calculate rating from venue data if available, otherwise show N/A
            const venueRating = venue.rating ?? venue.averageRating ?? null;

            return {
              id: venue.id,
              name: venue.name,
              bookings: venueBookings.length,
              revenue: venueRevenue,
              rating: venueRating || 0,
              occupancyRate: Math.min(100, Math.round((venueBookings.length / 30) * 100)),
            };
          }).sort((a: VenuePerformance, b: VenuePerformance) => b.revenue - a.revenue);
          setVenuePerformance(performance);
        } catch (error) {
          console.warn("Could not load venue performance");
        }
      } catch (error) {
        console.warn("Could not load bookings for analytics");
      }
    } catch (error: any) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");
      setAnalytics(null);
      setMonthlyData([]);
      setVenuePerformance([]);
      setEventTypes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle refresh
  const handleRefresh = async () => {
    await loadAnalytics(true);
    toast.success("Analytics refreshed");
  };

  // Handle export
  const handleExportReport = () => {
    try {
      // Create CSV content
      const headers = ['Month', 'Revenue', 'Bookings', 'Occupancy Rate'];
      const rows = monthlyData.map(m => [
        m.month,
        `₹${m.revenue.toLocaleString()}`,
        m.bookings,
        `${m.occupancy}%`,
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `venue-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  // Calculate growth
  const calculateGrowth = () => {
    if (monthlyData.length < 2) return 0;
    const lastMonth = monthlyData[monthlyData.length - 1];
    const secondLastMonth = monthlyData[monthlyData.length - 2];
    if (secondLastMonth.revenue === 0) return lastMonth.revenue > 0 ? 100 : 0;
    return Math.round(((lastMonth.revenue - secondLastMonth.revenue) / secondLastMonth.revenue) * 100);
  };

  const revenueGrowth = calculateGrowth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Analytics & Reports</h1>
          <p className="text-neutral-600">Track your venue performance and revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-neutral-200">
            <Button
              variant={timeRange === "6m" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("6m")}
              className={cn("h-8", timeRange === "6m" && "bg-black hover:bg-neutral-800")}
            >
              6M
            </Button>
            <Button
              variant={timeRange === "1y" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("1y")}
              className={cn("h-8", timeRange === "1y" && "bg-black hover:bg-neutral-800")}
            >
              1Y
            </Button>
            <Button
              variant={timeRange === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("all")}
              className={cn("h-8", timeRange === "all" && "bg-black hover:bg-neutral-800")}
            >
              All
            </Button>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={cn("border-2", revenueGrowth >= 0 ? "border-emerald-200" : "border-red-200")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-black mt-1">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                <div className={cn("flex items-center gap-1 text-xs mt-2", revenueGrowth >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>{revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}% vs previous period</span>
                </div>
              </div>
              <div className={cn("p-3 rounded-full", revenueGrowth >= 0 ? "bg-emerald-600" : "bg-red-600")}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-2xl font-bold text-black mt-1">{analytics?.totalBookings || 0}</p>
                <p className="text-xs text-neutral-600 mt-2">
                  {analytics?.confirmedBookings || 0} confirmed • {analytics?.completedBookings || 0} completed
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Venues</p>
                <p className="text-2xl font-bold text-black mt-1">{analytics?.totalVenues || 0}</p>
                <p className="text-xs text-neutral-600 mt-2">Properties listed</p>
              </div>
              <div className="p-3 rounded-full bg-purple-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Avg. Occupancy</p>
                <p className="text-2xl font-bold text-black mt-1">
                  {monthlyData.length > 0 ? Math.round(monthlyData.reduce((sum, m) => sum + m.occupancy, 0) / monthlyData.length) : 0}%
                </p>
                <p className="text-xs text-neutral-600 mt-2">Last 6 months average</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue & Booking Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black">
                <BarChart3 className="h-5 w-5" />
                Monthly Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <div className="h-64 flex items-end justify-between gap-2">
                  {monthlyData.map((item, index) => {
                    const maxRevenue = Math.max(...monthlyData.map(m => m.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: `${height}%`, opacity: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg hover:from-emerald-700 hover:to-emerald-500 transition-colors cursor-pointer relative group"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {formatCurrency(item.revenue)}
                          </div>
                        </motion.div>
                        <span className="text-xs font-medium text-black">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-neutral-400">
                  <p>No revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black">
                <PieChart className="h-5 w-5" />
                Booking Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventTypes.length > 0 ? (
                <div className="space-y-4">
                  {eventTypes.map((item, index) => (
                    <div key={item.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-medium text-black">{item.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-neutral-600">{item.count} bookings</span>
                          <span className="text-sm font-bold text-black">{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="h-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-neutral-400">
                  <p>No booking data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Venue Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black">
                  <Building2 className="h-5 w-5" />
                  Venue Performance
                </CardTitle>
                <CardDescription>Compare performance across your venues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {venuePerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Venue</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Total Bookings</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Revenue</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Rating</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Occupancy</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {venuePerformance.map((venue, index) => (
                      <tr key={venue.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-neutral-100 to-silver-200 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-neutral-600" />
                            </div>
                            <div>
                              <p className="font-medium text-black">{venue.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-black font-medium">{venue.bookings}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-black font-semibold">{formatCurrency(venue.revenue)}</span>
                        </td>
                        <td className="py-4 px-4">
                          {venue.rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                              <span className="text-black font-medium">{venue.rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={venue.occupancyRate >= 70 ? "default" : "outline"} className="text-xs">
                            {venue.occupancyRate}%
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="w-full bg-neutral-200 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(venue.bookings / (venuePerformance[0]?.bookings || 1)) * 100}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-black mb-2">No venues found</h3>
                <p className="text-neutral-600">Add venues to see performance metrics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">
              <TrendingUp className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueGrowth > 0 ? (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <ArrowUpRight className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-900">Revenue Growth</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Your revenue increased by {revenueGrowth}% compared to the previous period.
                    {monthlyData.length > 0 && (
                      ` Best month was ${monthlyData.reduce((max, m) => m.revenue > max.revenue ? m : max).month} with ${formatCurrency(Math.max(...monthlyData.map(m => m.revenue)))} in revenue.`
                    )}
                  </p>
                </div>
              </div>
            ) : revenueGrowth < 0 ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <ArrowDownRight className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Revenue Decline</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Your revenue decreased by {Math.abs(revenueGrowth)}% compared to the previous period.
                    Consider running promotional campaigns to attract more bookings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <BarChart3 className="h-5 w-5 text-neutral-600 mt-0.5" />
                <div>
                  <p className="font-medium text-neutral-900">Stable Revenue</p>
                  <p className="text-sm text-neutral-700 mt-1">
                    Your revenue is stable compared to the previous period. Keep up the good work!
                  </p>
                </div>
              </div>
            )}

            {analytics && analytics.totalBookings > 0 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Booking Summary</p>
                  <p className="text-sm text-blue-700 mt-1">
                    You have {analytics.confirmedBookings} confirmed bookings and {analytics.completedBookings} completed bookings.
                    {analytics.totalBookings > analytics.confirmedBookings && (
                      ` ${analytics.totalBookings - analytics.confirmedBookings} bookings are pending confirmation.`
                    )}
                  </p>
                </div>
              </div>
            )}

            {venuePerformance.length > 0 && venuePerformance[0].occupancyRate >= 70 && (
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <Star className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Top Performer</p>
                  <p className="text-sm text-purple-700 mt-1">
                    {venuePerformance[0].name} is your best performing venue with {venuePerformance[0].bookings} bookings and {formatCurrency(venuePerformance[0].revenue)} in revenue.
                  </p>
                </div>
              </div>
            )}

            {(!analytics || analytics.totalBookings === 0) && (
              <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <AlertCircle className="h-5 w-5 text-neutral-600 mt-0.5" />
                <div>
                  <p className="font-medium text-neutral-900">No Data Yet</p>
                  <p className="text-sm text-neutral-700 mt-1">
                    Start by creating venues and accepting bookings. Your analytics will appear here once you have data.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <div className="space-y-3">
                {monthlyData.map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-black">{month.month}</p>
                        <p className="text-xs text-neutral-600">{month.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-black">{formatCurrency(month.revenue)}</p>
                      <p className="text-xs text-neutral-600">{month.occupancy}% occupancy</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <p>No monthly data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
