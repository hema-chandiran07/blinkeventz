"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Calendar, Download, CreditCard, Building, ArrowRight,
  BarChart3, PieChart, Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

const REVENUE_DATA = [
  { month: "Jan", revenue: 2800000, bookings: 45, target: 2500000 },
  { month: "Feb", revenue: 3200000, bookings: 52, target: 2800000 },
  { month: "Mar", revenue: 3850000, bookings: 68, target: 3200000 },
  { month: "Apr", revenue: 4200000, bookings: 75, target: 3800000 },
  { month: "May", revenue: 4800000, bookings: 89, target: 4200000 },
  { month: "Jun", revenue: 5100000, bookings: 95, target: 4800000 },
];

const CATEGORY_DATA = [
  { category: "Wedding", revenue: 21750000, bookings: 145, percentage: 32 },
  { category: "Corporate", revenue: 10050000, bookings: 67, percentage: 15 },
  { category: "Engagement", revenue: 6675000, bookings: 89, percentage: 10 },
  { category: "Birthday", revenue: 2250000, bookings: 45, percentage: 3 },
  { category: "Reception", revenue: 3800000, bookings: 38, percentage: 6 },
];

const LOCATION_DATA = [
  { location: "Anna Nagar", revenue: 8900000, bookings: 89, growth: 12.5 },
  { location: "T Nagar", revenue: 7800000, bookings: 78, growth: 8.3 },
  { location: "Adyar", revenue: 6500000, bookings: 65, growth: 15.7 },
  { location: "Velachery", revenue: 5400000, bookings: 54, growth: 6.2 },
  { location: "OMR", revenue: 4800000, bookings: 48, growth: 18.9 },
];

export default function RevenueReportPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState("6months");

  const stats = {
    totalRevenue: 47500000,
    growth: 18.4,
    totalBookings: 534,
    avgBookingValue: 88951,
    successRate: 94.2,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleExport = () => {
    console.log("Exporting revenue report...");
    toast.success("Revenue report exported successfully!");
  };

  const handleViewLocation = (location: string) => {
    console.log(`Viewing analytics for ${location}`);
    toast.info(`Loading ${location} analytics...`);
    router.push(`/dashboard/admin/venues?location=${encodeURIComponent(location)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowRight className="h-5 w-5 rotate-180" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Revenue Report</h1>
            <p className="text-neutral-600">Detailed revenue analytics and trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +{stats.growth}% vs last period
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalBookings}</p>
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12.5% vs last period
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Avg Booking Value</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(stats.avgBookingValue)}</p>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +5.3% vs last period
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-600">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-neutral-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Success Rate</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.successRate}%</p>
                <p className="text-xs text-neutral-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +2.3% vs last period
                </p>
              </div>
              <div className="p-3 rounded-full bg-neutral-900">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Revenue Trend */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-end justify-between gap-2">
              {REVENUE_DATA.map((item, index) => {
                const height = (item.revenue / Math.max(...REVENUE_DATA.map(d => d.revenue))) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${height}%`, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg hover:from-emerald-700 hover:to-emerald-500 transition-colors cursor-pointer relative group"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {formatCurrency(item.revenue)}
                      </div>
                    </motion.div>
                    <span className="text-xs font-medium text-black">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Revenue by Event Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CATEGORY_DATA.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-black">{item.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-600">{item.bookings} bookings</span>
                      <span className="text-sm font-bold text-black">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Performance */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Building className="h-5 w-5" />
            Revenue by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Location</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Bookings</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Revenue</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Growth</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {LOCATION_DATA.map((item, index) => (
                  <tr key={index} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-black">{item.location}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-black">{item.bookings}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-bold text-black">{formatCurrency(item.revenue)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={item.growth > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
                        {item.growth > 0 ? "+" : ""}{item.growth}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="text-black hover:bg-neutral-100" onClick={() => handleViewLocation(item.location)}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
