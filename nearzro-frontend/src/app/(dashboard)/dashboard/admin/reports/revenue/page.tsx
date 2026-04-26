"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign, TrendingUp, Calendar, Download, CreditCard, Building, ArrowRight,
  BarChart3, PieChart, Activity, RefreshCw, Loader2, AlertCircle, Search, Filter
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface RevenueReportData {
  data: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    user: { name: string; email: string };
    event: { title: string | null };
  }>;
  summary: {
    totalRevenue: number;
    paymentCount: number;
  };
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RevenueStats {
  totalRevenue: number;
  growth: number;
  totalBookings: number;
  avgBookingValue: number;
  successRate: number;
}

// ==================== Main Component ====================
export default function RevenueReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<RevenueReportData | null>(null);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "3months" | "6months" | "1year" | "all">("6months");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Calculate date range
  const getDateRange = useCallback(() => {
    const now = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case "7days": start.setDate(now.getDate() - 7); break;
      case "30days": start.setDate(now.getDate() - 30); break;
      case "3months": start.setMonth(now.getMonth() - 3); break;
      case "6months": start.setMonth(now.getMonth() - 6); break;
      case "1year": start.setFullYear(now.getFullYear() - 1); break;
      case "all": start = new Date(2020, 0, 1); break;
    }
    
    return {
      startDate: startDate || start.toISOString().split('T')[0],
      endDate: endDate || now.toISOString().split('T')[0],
    };
  }, [dateRange, startDate, endDate]);

  // Load revenue report data
  const loadRevenueReport = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { startDate: start, endDate: end } = getDateRange();
      
      const response = await api.get<RevenueReportData>('/reports/revenue', {
        params: { startDate: start, endDate: end, page, limit },
      });

      setReportData(response.data);
      
      // Calculate stats from report data
      const totalRevenue = response.data.summary?.totalRevenue || 0;
      const paymentCount = response.data.summary?.paymentCount || 0;
      const successCount = response.data.data?.filter((p: any) => p.status === "SUCCESS" || p.status === "CAPTURED").length || 0;

      setStats({
        totalRevenue,
        growth: 0,
        totalBookings: paymentCount,
        avgBookingValue: paymentCount > 0 ? totalRevenue / paymentCount : 0,
        successRate: response.data.total > 0
          ? (successCount / response.data.total) * 100
          : 0,
      });
    } catch (error: any) {
      console.error("Failed to load revenue report:", error);
      toast.error(error?.response?.data?.message || "Failed to load revenue report");
      setReportData(null);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange, page]);

  useEffect(() => {
    loadRevenueReport();
  }, [loadRevenueReport]);

  // Handle export
  const handleExport = async () => {
    try {
      const { startDate: start, endDate: end } = getDateRange();
      
      const response = await api.get('/reports/revenue/export', {
        params: { startDate: start, endDate: end },
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue-report-${start}-${end}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Revenue report exported successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to export report");
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadRevenueReport(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      CAPTURED: { className: "bg-green-100 text-green-700 border-green-300", label: "Success" },
      PENDING: { className: "bg-amber-100 text-amber-700 border-amber-300", label: "Pending" },
      FAILED: { className: "bg-red-100 text-red-700 border-red-300", label: "Failed" },
      REFUNDED: { className: "bg-blue-100 text-blue-700 border-blue-300", label: "Refunded" },
    };
    
    const { className, label } = config[status] || { className: "bg-neutral-100 text-neutral-700", label: status };
    return <Badge className={className}>{label}</Badge>;
  };

  // Monthly revenue data (calculated from report data)
  const monthlyRevenue = reportData?.data.reduce((acc, payment) => {
    const month = new Date(payment.createdAt).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + payment.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const maxMonthlyRevenue = Math.max(...Object.values(monthlyRevenue), 1);

  return (
    <div className="space-y-6">
      {/* ==================== Header ==================== */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowRight className="h-5 w-5 rotate-180" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Revenue Report</h1>
            <p className="text-neutral-600">Payment transactions and revenue analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* ==================== Date Range Filter ==================== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Date Range:</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={dateRange === "7days" ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange("7days"); setPage(1); }}
                className={dateRange === "7days" ? "bg-black" : ""}
              >
                7 Days
              </Button>
              <Button
                variant={dateRange === "30days" ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange("30days"); setPage(1); }}
                className={dateRange === "30days" ? "bg-black" : ""}
              >
                30 Days
              </Button>
              <Button
                variant={dateRange === "3months" ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange("3months"); setPage(1); }}
                className={dateRange === "3months" ? "bg-black" : ""}
              >
                3 Months
              </Button>
              <Button
                variant={dateRange === "6months" ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange("6months"); setPage(1); }}
                className={dateRange === "6months" ? "bg-black" : ""}
              >
                6 Months
              </Button>
              <Button
                variant={dateRange === "1year" ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange("1year"); setPage(1); }}
                className={dateRange === "1year" ? "bg-black" : ""}
              >
                1 Year
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm">From:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-sm">To:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-40"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate(""); setDateRange("6months"); }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Stats Overview ==================== */}
      {!loading && stats && (
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
                  <p className="text-sm font-medium text-neutral-600">Total Transactions</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalBookings}</p>
                  <p className="text-xs text-blue-600 mt-2">Successful payments</p>
                </div>
                <div className="p-3 rounded-full bg-blue-600">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Avg Transaction Value</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(stats.avgBookingValue)}</p>
                  <p className="text-xs text-purple-600 mt-2">Per payment</p>
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
                  <p className="text-xs text-neutral-600 mt-2">Payment completion</p>
                </div>
                <div className="p-3 rounded-full bg-neutral-900">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== Monthly Revenue Chart ==================== */}
      {!loading && reportData && Object.keys(monthlyRevenue).length > 0 && (
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {Object.entries(monthlyRevenue).map(([month, revenue], index) => {
                const height = (revenue / maxMonthlyRevenue) * 100;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${height}%`, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg hover:from-emerald-700 hover:to-emerald-500 transition-colors cursor-pointer relative group"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {formatCurrency(revenue)}
                      </div>
                    </motion.div>
                    <span className="text-xs font-medium text-black">{month}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== Transactions Table ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Recent Transactions</CardTitle>
              <p className="text-sm text-neutral-600 mt-1">
                {reportData?.total || 0} total transactions • Page {reportData?.page || 1} of {reportData?.totalPages || 1}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by customer or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-72"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              <p className="text-neutral-600 ml-4">Loading transactions...</p>
            </div>
          ) : !reportData || reportData.data.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No transactions found</h3>
              <p className="text-neutral-600">
                {searchTerm ? "Try adjusting your search" : "No revenue data available for the selected period"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Transaction ID</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Customer</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Event</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {reportData.data
                      .filter(t => 
                        t.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.event.title?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono text-neutral-600">#{transaction.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm font-medium text-black">{transaction.user.name}</p>
                              <p className="text-xs text-neutral-600">{transaction.user.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-black">{transaction.event.title || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-bold text-black">{formatCurrency(transaction.amount)}</span>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(transaction.status)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-neutral-600">{formatDate(transaction.createdAt)}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {reportData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-neutral-600">
                    Showing {(reportData.page - 1) * reportData.limit + 1} to {Math.min(reportData.page * reportData.limit, reportData.total)} of {reportData.total} transactions
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={reportData.page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, reportData.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={reportData.page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={reportData.page === pageNum ? "bg-black" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(reportData.totalPages, p + 1))}
                      disabled={reportData.page === reportData.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
