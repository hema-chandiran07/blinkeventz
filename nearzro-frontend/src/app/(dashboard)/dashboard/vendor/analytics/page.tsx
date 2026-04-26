"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Users, Star,
  BarChart3, PieChart, Download, RefreshCw, ArrowUpRight, ArrowDownRight,
  Package, CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { BarChart, StatCard } from "@/components/ui/chart";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface VendorAnalytics {
  totalRevenue: number;
  totalBookings: number;
  totalServices: number;
  averageRating: number;
  conversionRate: number;
  revenueGrowth: number;
  bookingsGrowth: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

interface ServicePerformance {
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
}

export default function VendorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [servicePerformance, setServicePerformance] = useState<ServicePerformance[]>([]);

  const loadAnalytics = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      // Load vendor analytics from real API
      const [analyticsRes, earningsRes, bookingsRes, servicesRes, reviewsRes] = await Promise.all([
        api.get('/vendor-analytics').catch(() => ({ data: null })),
        api.get('/vendors/me/earnings').catch(() => ({ data: null })),
        api.get('/vendors/me/bookings').catch(() => ({ data: [] })),
        api.get('/vendors/me/services').catch(() => ({ data: [] })),
        api.get('/vendors/reviews/me').catch(() => ({ data: [] })),
      ]);

      const analyticsData = analyticsRes.data;
      const earnings = earningsRes.data || { totalEarnings: 0, bookingCount: 0, platformFees: 0, netEarnings: 0 };
      const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const services = Array.isArray(servicesRes.data) ? servicesRes.data : [];
      const reviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];

      // Calculate analytics from real data
      const totalRevenue = earnings.totalEarnings || 0;
      const totalBookings = analyticsData?.totalBookings || bookings.length || 0;
      const totalServices = services.length || 0;

      // Calculate confirmed vs pending bookings
      const confirmedBookings = bookings.filter((b: any) =>
        b.status === 'CONFIRMED' || b.status === 'COMPLETED'
      ).length;
      const pendingBookings = bookings.filter((b: any) => b.status === 'PENDING').length;

      // Calculate conversion rate
      const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;

      // Calculate growth (compare this month vs last month)
      const thisMonthBookings = bookings.filter((b: any) => {
        const bookingDate = new Date(b.createdAt);
        const now = new Date();
        return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
      }).length;

      const lastMonthBookings = bookings.filter((b: any) => {
        const bookingDate = new Date(b.createdAt);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return bookingDate.getMonth() === lastMonth.getMonth() && bookingDate.getFullYear() === lastMonth.getFullYear();
      }).length;

      const bookingsGrowth = lastMonthBookings > 0
        ? Math.round(((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100)
        : 0;

      // Calculate average rating from real reviews
      const averageRating = reviews.length > 0
        ? Math.round((reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
        : 0;

      // Calculate monthly data from real bookings (last 6 months)
      const now = new Date();
      const monthly: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

        // Filter bookings for this month
        const monthBookings = bookings.filter((b: any) => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate.getMonth() === date.getMonth() && bookingDate.getFullYear() === date.getFullYear();
        });

        const monthRevenue = monthBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

        monthly.push({
          month: monthLabel,
          revenue: monthRevenue,
          bookings: monthBookings.length,
        });
      }

      // Calculate service performance from real data
      // Since bookings don't directly link to specific services, we calculate per-service stats
      const servicePerf: ServicePerformance[] = services.map((s: any) => {
        // Get reviews for this specific service using vendorId (since vendorServiceId doesn't exist on Review model)
        const serviceReviews = reviews.filter((r: any) => r.vendorId === s.vendorId);
        const serviceRating = serviceReviews.length > 0
          ? Math.round((serviceReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / serviceReviews.length) * 10) / 10
          : 0;

        // Distribute bookings proportionally (simplified - since bookings link to vendor, not specific services)
        const totalVendorBookings = bookings.filter((b: any) =>
          b.slot?.entityType === 'VENDOR' && b.slot?.entityId === s.vendorId
        ).length;
        const totalVendorRevenue = bookings
          .filter((b: any) => b.slot?.entityType === 'VENDOR' && b.slot?.entityId === s.vendorId)
          .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

        // Simplified: distribute evenly across services (in reality, you'd track service-specific bookings)
        const bookingsPerService = services.length > 0 ? Math.round(totalVendorBookings / services.length) : 0;
        const revenuePerService = services.length > 0 ? Math.round(totalVendorRevenue / services.length) : 0;

        return {
          name: s.name,
          bookings: bookingsPerService,
          revenue: revenuePerService,
          rating: serviceRating,
        };
      }).sort((a: ServicePerformance, b: ServicePerformance) => b.revenue - a.revenue);

      const data = analyticsRes.data;
      const reviewsData = reviewsRes.data;
      const reviewsAnalytics = reviewsData.analytics || { averageRating: 0 };

      setAnalytics({
        totalRevenue: data.totalRevenue || 0,
        totalBookings: data.totalBookings || 0,
        totalServices: data.totalServices || 0,
        averageRating: reviewsAnalytics.averageRating || 0,
        conversionRate: data.conversionRate || 0,
        revenueGrowth: data.revenueGrowth || 0,
        bookingsGrowth: data.bookingsGrowth || 0,
      });

      setMonthlyData(monthly);
      setServicePerformance(servicePerf);

      if (showRefresh) {
        toast.success("Analytics refreshed");
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleRefresh = () => {
    loadAnalytics(true);
  };

  const handleExport = () => {
    try {
      const headers = ['Month', 'Revenue', 'Bookings'];
      const rows = monthlyData.map(m => [m.month, `₹${m.revenue.toLocaleString()}`, m.bookings]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vendor-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success("Analytics exported successfully");
    } catch (error) {
      toast.error("Failed to export analytics");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Analytics & Insights</h1>
          <p className="text-neutral-600 mt-1">Track your performance and growth</p>
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

      {/* Key Metrics */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-3xl font-bold text-black mt-1">₹{(analytics?.totalRevenue || 0).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  {analytics && analytics.revenueGrowth > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn("text-xs", analytics && analytics.revenueGrowth > 0 ? "text-green-600" : "text-red-600")}>
                    {analytics && analytics.revenueGrowth > 0 ? '+' : ''}{analytics?.revenueGrowth || 0}%
                  </span>
                  <span className="text-xs text-neutral-500">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-green-700">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-3xl font-bold text-black mt-1">{analytics?.totalBookings || 0}</p>
                <div className="flex items-center gap-1 mt-2">
                  {analytics && analytics.bookingsGrowth > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn("text-xs", analytics && analytics.bookingsGrowth > 0 ? "text-green-600" : "text-red-600")}>
                    {analytics && analytics.bookingsGrowth > 0 ? '+' : ''}{analytics?.bookingsGrowth || 0}%
                  </span>
                  <span className="text-xs text-neutral-500">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-700">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Services</p>
                <p className="text-3xl font-bold text-black mt-1">{analytics?.totalServices || 0}</p>
                <p className="text-xs text-neutral-500 mt-2">Services listed</p>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Average Rating</p>
                <p className="text-3xl font-bold text-black mt-1">{analytics?.averageRating || 0}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-neutral-500">Customer satisfaction</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue & Bookings Chart */}
      <motion.div
        className="grid gap-6 lg:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-black">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend (Last 6 Months)
            </CardTitle>
            <CardDescription>Monthly revenue performance</CardDescription>
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
                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg hover:from-green-600 hover:to-green-500 transition-colors cursor-pointer relative group"
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          ₹{(item.revenue / 1000).toFixed(1)}K
                        </div>
                      </motion.div>
                      <span className="text-xs font-medium text-neutral-600">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-500">
                <p>No revenue data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-black">
              <PieChart className="h-5 w-5" />
              Service Performance
            </CardTitle>
            <CardDescription>Top performing services</CardDescription>
          </CardHeader>
          <CardContent>
            {servicePerformance.length > 0 ? (
              <div className="space-y-4">
                {servicePerformance.slice(0, 5).map((service, index) => (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }} />
                        <span className="text-sm font-medium text-black">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-neutral-600">{service.bookings} bookings</span>
                        <span className="text-sm font-bold text-black">₹{(service.revenue / 1000).toFixed(1)}K</span>
                      </div>
                    </div>
                    <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(service.revenue / servicePerformance[0].revenue) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full"
                        style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-500">
                <p>No service data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-black">
              <TrendingUp className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>Key metrics and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Conversion Rate</p>
                    <p className="text-xs text-neutral-600">Booking success</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-black">{analytics?.conversionRate || 0}%</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {analytics && analytics.conversionRate >= 50 ? "Excellent conversion rate" :
                    analytics && analytics.conversionRate >= 30 ? "Good conversion rate" : "Room for improvement"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Pending Bookings</p>
                    <p className="text-xs text-neutral-600">Awaiting response</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-black">
                  {(analytics?.totalBookings || 0) - (analytics ? Math.round((analytics.conversionRate / 100) * analytics.totalBookings) : 0)}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Requires attention</p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Service Rating</p>
                    <p className="text-xs text-neutral-600">Customer satisfaction</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-black">{analytics?.averageRating || 0}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {analytics && analytics.averageRating >= 4.5 ? "Excellent rating" :
                    analytics && analytics.averageRating >= 3.5 ? "Good rating" : "Needs improvement"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
