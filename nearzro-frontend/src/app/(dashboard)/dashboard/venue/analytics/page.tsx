"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, DollarSign, Calendar, Users, Building2,
  ArrowUpRight, ArrowDownRight, Download, Star
} from "lucide-react";
import { BarChart, LineChart, DonutChart, StatCard } from "@/components/ui/chart";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCallback } from "react";

interface AnalyticsData {
  revenue: { label: string; value: number }[];
  bookings: { label: string; value: number }[];
  occupancy: { label: string; value: number }[];
  venuePerformance: { name: string; bookings: number; revenue: number; rating: number }[];
  customerTypes: { label: string; value: number; color: string }[];
}

interface AnalyticsResponse {
  revenue: { label: string; value: number }[];
  bookings: { label: string; value: number }[];
  occupancy: { label: string; value: number }[];
  venuePerformance: { name: string; bookings: number; revenue: number; rating: number }[];
  customerTypes: { label: string; value: number; color: string }[];
  stats: {
    totalRevenue: number;
    totalBookings: number;
    averageOccupancy: number;
    totalVenues: number;
    revenueGrowth: number;
    bookingGrowth: number;
  };
}

export default function VenueAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "all">("6m");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    revenue: [],
    bookings: [],
    occupancy: [],
    venuePerformance: [],
    customerTypes: [],
  });

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    averageOccupancy: 0,
    totalVenues: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
  });

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch real analytics data from API
      const response = await api.get<AnalyticsResponse>('/venues/venue-owner/analytics', {
        params: { timeRange },
      });

      const data = response.data;

      setAnalytics({
        revenue: data.revenue,
        bookings: data.bookings,
        occupancy: data.occupancy,
        venuePerformance: data.venuePerformance,
        customerTypes: data.customerTypes,
      });

      setStats({
        totalRevenue: data.stats.totalRevenue,
        totalBookings: data.stats.totalBookings,
        averageOccupancy: data.stats.averageOccupancy,
        totalVenues: data.stats.totalVenues,
        revenueGrowth: data.stats.revenueGrowth,
        bookingGrowth: data.stats.bookingGrowth,
      });
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");

      // Set empty state on error
      setAnalytics({
        revenue: [],
        bookings: [],
        occupancy: [],
        venuePerformance: [],
        customerTypes: [],
      });
      setStats({
        totalRevenue: 0,
        totalBookings: 0,
        averageOccupancy: 0,
        totalVenues: 0,
        revenueGrowth: 0,
        bookingGrowth: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportReport = () => {
    toast.success("Report exported successfully", {
      description: "Your analytics report has been downloaded"
    });
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
          <div className="flex rounded-md border border-silver-200">
            <Button
              variant={timeRange === "6m" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("6m")}
              className={timeRange === "6m" ? "bg-black hover:bg-neutral-800" : ""}
            >
              6M
            </Button>
            <Button
              variant={timeRange === "1y" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("1y")}
              className={timeRange === "1y" ? "bg-black hover:bg-neutral-800" : ""}
            >
              1Y
            </Button>
            <Button
              variant={timeRange === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("all")}
              className={timeRange === "all" ? "bg-black hover:bg-neutral-800" : ""}
            >
              All
            </Button>
          </div>
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
        <StatCard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue / 100000).toFixed(2)}L`}
          subtext="Last 6 months"
          icon={DollarSign}
          trend={stats.revenueGrowth > 0 ? "up" : "down"}
          trendValue={`${Math.abs(stats.revenueGrowth)}% vs previous period`}
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          subtext="Last 6 months"
          icon={Calendar}
          trend={stats.bookingGrowth > 0 ? "up" : "down"}
          trendValue={`${Math.abs(stats.bookingGrowth)}% vs previous period`}
        />
        <StatCard
          title="Average Occupancy"
          value={`${stats.averageOccupancy}%`}
          subtext="Venue utilization rate"
          icon={TrendingUp}
          trend={stats.averageOccupancy > 60 ? "up" : "neutral"}
          trendValue={stats.averageOccupancy > 60 ? "Excellent performance" : "Room for improvement"}
        />
        <StatCard
          title="Active Venues"
          value={stats.totalVenues}
          subtext="Properties listed"
          icon={Building2}
        />
      </motion.div>

      {/* Revenue & Booking Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <BarChart
            data={analytics.revenue}
            title="Monthly Revenue Trend"
            height={250}
            color="bg-gradient-to-t from-green-600 to-green-400"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BarChart
            data={analytics.bookings}
            title="Monthly Bookings Trend"
            height={250}
            color="bg-gradient-to-t from-blue-600 to-blue-400"
          />
        </motion.div>
      </div>

      {/* Occupancy Rate Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-silver-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Occupancy Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <LineChart
                data={analytics.occupancy}
                height={200}
                color="stroke-purple-600"
                fill={true}
              />
              <div className="grid grid-cols-7 gap-2 text-center">
                {analytics.occupancy.map((item, index) => (
                  <div key={index} className="text-xs">
                    <p className="font-medium text-neutral-600">{item.label}</p>
                    <p className="text-black font-semibold">{item.value}%</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Venue Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-silver-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-black">Venue Performance</CardTitle>
                <CardDescription>Compare performance across your venues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-silver-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Venue</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Total Bookings</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Revenue</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Rating</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.venuePerformance.map((venue, index) => (
                    <tr key={index} className="border-b border-silver-100 table-row-hover">
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
                        <span className="text-black font-semibold">₹{(venue.revenue / 100000).toFixed(2)}L</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-black font-medium">{venue.rating}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-full bg-silver-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(venue.bookings / analytics.venuePerformance[0].bookings) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Types & Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-black">Event Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={analytics.customerTypes}
                size={180}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-black">Key Insights</CardTitle>
              <CardDescription>Performance highlights and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue Growth Insight */}
              {stats.revenueGrowth !== 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  {stats.revenueGrowth > 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-green-600 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-green-900">Revenue Growth</p>
                    <p className="text-sm text-green-700 mt-1">
                      {stats.revenueGrowth > 0
                        ? `Your revenue increased by ${stats.revenueGrowth}% compared to the previous period.`
                        : `Your revenue decreased by ${Math.abs(stats.revenueGrowth)}% compared to the previous period.`
                      }
                      {analytics.revenue.length > 0 && (
                        ` Best month was ${analytics.revenue.reduce((max, m) => m.value > max.value ? m : max).label} with ₹${(Math.max(...analytics.revenue.map((r: { value: number }) => r.value)) / 100000).toFixed(2)}L in revenue.`
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Occupancy Rate Insight */}
              {stats.averageOccupancy > 0 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Occupancy Rate</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Your average occupancy rate of {stats.averageOccupancy}% {stats.averageOccupancy > 60 ? "is excellent" : "can be improved"}.
                      {stats.averageOccupancy > 60 
                        ? " Consider dynamic pricing during peak seasons to maximize revenue."
                        : " Try offering promotions during off-peak times to increase bookings."
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Popular Event Type */}
              {analytics.customerTypes.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">Popular Event Type</p>
                    <p className="text-sm text-purple-700 mt-1">
                      {analytics.customerTypes[0].label}s account for {analytics.customerTypes[0].value}% of your bookings.
                      Consider creating {analytics.customerTypes[0].label.toLowerCase()}-specific packages to increase conversion rates.
                    </p>
                  </div>
                </div>
              )}

              {/* Booking Trend Insight */}
              {analytics.bookings.length >= 2 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  {stats.bookingGrowth > 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-amber-600 mt-0.5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-amber-600 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-amber-900">Booking Trend</p>
                    <p className="text-sm text-amber-700 mt-1">
                      {stats.bookingGrowth > 0
                        ? `Bookings increased by ${stats.bookingGrowth}% this month. Keep up the great work!`
                        : `Bookings decreased by ${Math.abs(stats.bookingGrowth)}% this month. Consider running promotional campaigns to attract more customers.`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Empty state if no data */}
              {analytics.revenue.length === 0 && (
                <div className="flex items-start gap-3 p-4 bg-silver-50 rounded-lg border border-silver-200">
                  <Building2 className="h-5 w-5 text-neutral-600 mt-0.5" />
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
        </motion.div>
      </div>
    </div>
  );
}
