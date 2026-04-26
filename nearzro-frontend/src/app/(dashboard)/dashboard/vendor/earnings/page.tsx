"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle,
  ArrowLeft, Download, Calendar, Filter, Loader2, Eye,
  RefreshCw, IndianRupee, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface VendorEarningsStats {
  totalEarnings: number;
  pendingEarnings: number;
  currency: string;
  bookingCount: number;
  completedBookings: number;
  pendingBookings: number;
}

interface VendorBooking {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventName: string;
  eventType: string;
  date: string;
  timeSlot: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  platformFee: number;
  netEarnings: number;
  payoutStatus: "PENDING" | "PROCESSING" | "APPROVED" | "COMPLETED" | "REJECTED";
  createdAt: string;
  completedAt?: string;
}

interface MonthlyEarnings {
  month: string;
  earnings: number;
  bookings: number;
}

// ==================== Constants ====================
const STATUS_BADGE_CONFIG: Record<string, { className: string; label: string; icon: any }> = {
  COMPLETED: { className: "bg-green-100 text-green-700 border-green-300", label: "Completed", icon: CheckCircle2 },
  CONFIRMED: { className: "bg-blue-100 text-blue-700 border-blue-300", label: "Confirmed", icon: CheckCircle2 },
  PENDING: { className: "bg-amber-100 text-amber-700 border-amber-300", label: "Pending", icon: Clock },
  CANCELLED: { className: "bg-red-100 text-red-700 border-red-300", label: "Cancelled", icon: AlertCircle },
  PROCESSING: { className: "bg-indigo-100 text-indigo-700 border-indigo-300", label: "Processing", icon: RefreshCw },
  APPROVED: { className: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Approved", icon: CheckCircle2 },
  REJECTED: { className: "bg-rose-100 text-rose-700 border-rose-300", label: "Rejected", icon: AlertCircle },
};

const PAYOUT_STATUS_BADGE_CONFIG: Record<string, { className: string; label: string; icon?: any }> = {
  COMPLETED: { className: "bg-green-100 text-green-700", label: "Paid Out", icon: CheckCircle2 },
  APPROVED: { className: "bg-emerald-100 text-emerald-700", label: "Ready for Payout", icon: CheckCircle2 },
  PROCESSING: { className: "bg-indigo-100 text-indigo-700", label: "Processing", icon: RefreshCw },
  PENDING: { className: "bg-amber-100 text-amber-700", label: "Pending", icon: Clock },
  REJECTED: { className: "bg-rose-100 text-rose-700", label: "Rejected", icon: AlertCircle },
};

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Morning (6:00 AM - 12:00 PM)",
  evening: "Evening (4:00 PM - 10:00 PM)",
  full_day: "Full Day (6:00 AM - 12:00 AM)",
  night: "Night (8:00 PM - 2:00 AM)",
};

const PLATFORM_FEE_PERCENTAGE = 5; // 5% platform fee for vendors

// ==================== Main Component ====================
export default function VendorEarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [stats, setStats] = useState<VendorEarningsStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyEarnings[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayoutStatus, setFilterPayoutStatus] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<VendorBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load earnings data
  const loadEarningsData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Parallel API calls for better performance
      const [earningsResponse, bookingsResponse] = await Promise.all([
        api.get('/vendors/me/earnings').catch(() => ({ data: null })),
        api.get('/vendors/me/bookings').catch(() => ({ data: null })),
      ]);

      // Process earnings stats
      const earningsData = earningsResponse?.data || {
        totalEarnings: 0,
        pendingEarnings: 0,
        currency: 'INR',
        bookingCount: 0,
        completedBookings: 0,
        pendingBookings: 0,
      };

      setStats({
        totalEarnings: earningsData?.totalEarnings || 0,
        pendingEarnings: earningsData?.pendingEarnings || 0,
        currency: earningsData?.currency || 'INR',
        bookingCount: earningsData?.bookingCount || 0,
        completedBookings: earningsData?.completedBookings || 0,
        pendingBookings: earningsData?.pendingBookings || 0,
      });

      // Process bookings
      const allBookings = Array.isArray(bookingsResponse?.data) ? bookingsResponse.data : [];
      const transformedBookings: VendorBooking[] = allBookings.map((booking: any) => {
        if (!booking) return null;
        const totalAmount = booking?.totalAmount || 0;
        const platformFee = Math.round(totalAmount * (PLATFORM_FEE_PERCENTAGE / 100));
        const netEarnings = totalAmount - platformFee;

        return {
          id: booking?.id,
          customerName: booking?.user?.name || 'Unknown Customer',
          customerEmail: booking?.user?.email || '',
          customerPhone: booking?.user?.phone || '',
          eventName: booking?.slot?.eventTitle || booking?.slot?.name || 'Service Booking',
          eventType: 'VENDOR_SERVICE',
          date: booking?.slot?.date || '',
          timeSlot: booking?.slot?.timeSlot || 'full_day',
          status: (booking?.status || 'PENDING').toUpperCase() as any,
          totalAmount,
          platformFee,
          netEarnings,
          payoutStatus: determinePayoutStatus(booking?.status, booking?.completedAt),
          createdAt: booking?.createdAt,
          completedAt: booking?.completedAt,
        };
      }).filter(Boolean) as VendorBooking[];

      setBookings(transformedBookings);

      // Calculate monthly earnings data
      const monthly = calculateMonthlyEarnings(transformedBookings);
      setMonthlyData(monthly);

      if (showRefreshToast) {
        toast.success("Earnings data refreshed");
      }
    } catch (error: any) {
      console.error("Failed to load earnings:", error);
      toast.error("Failed to load earnings data");
      setStats({
        totalEarnings: 0,
        pendingEarnings: 0,
        currency: 'INR',
        bookingCount: 0,
        completedBookings: 0,
        pendingBookings: 0,
      });
      setBookings([]);
      setMonthlyData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  // Helper: Determine payout status based on booking status
  const determinePayoutStatus = (bookingStatus: string, completedAt?: string): VendorBooking['payoutStatus'] => {
    const status = (bookingStatus || 'PENDING').toUpperCase();
    
    if (status === 'COMPLETED' && completedAt) {
      // Completed bookings are eligible for payout after 3 days
      const completedDate = new Date(completedAt);
      const now = new Date();
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCompletion >= 3) {
        return 'APPROVED'; // Ready for payout
      }
      return 'PROCESSING'; // Within 3-day holding period
    }
    
    if (status === 'CANCELLED') return 'REJECTED';
    if (status === 'CONFIRMED') return 'PENDING';
    return 'PENDING';
  };

  // Helper: Calculate monthly earnings for the last 6 months
  const calculateMonthlyEarnings = (bookings: VendorBooking[]): MonthlyEarnings[] => {
    const now = new Date();
    const monthlyMap = new Map<string, { earnings: number; bookings: number }>();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyMap.set(key, { earnings: 0, bookings: 0 });
    }

    // Aggregate completed bookings by month
    bookings
      .filter(b => b.status === 'COMPLETED')
      .forEach(booking => {
        const date = new Date(booking.completedAt || booking.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyMap.get(key) || { earnings: 0, bookings: 0 };
        monthlyMap.set(key, {
          earnings: existing.earnings + booking.netEarnings,
          bookings: existing.bookings + 1,
        });
      });

    return Array.from(monthlyMap.entries()).map(([key, data]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return {
        month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        earnings: data.earnings,
        bookings: data.bookings,
      };
    });
  };

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    const matchesPayout = filterPayoutStatus === "all" || booking.payoutStatus === filterPayoutStatus;
    return matchesStatus && matchesPayout;
  });

  // Calculate filtered stats
  const filteredStats = {
    totalEarnings: filteredBookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.netEarnings, 0),
    pendingEarnings: filteredBookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
      .reduce((sum, b) => sum + b.netEarnings, 0),
    readyForPayout: filteredBookings
      .filter(b => b.payoutStatus === 'APPROVED')
      .reduce((sum, b) => sum + b.netEarnings, 0),
    count: filteredBookings.length,
  };

  // Handle refresh
  const handleRefresh = async () => {
    await loadEarningsData(true);
  };

  // Handle export
  const handleExportEarnings = () => {
    try {
      // Helper to escape CSV values (wrap in quotes if contains comma)
      const csvEscape = (val: string | number | undefined) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Create CSV content
      const headers = ['Booking ID', 'Customer', 'Event', 'Date', 'Status', 'Amount', 'Platform Fee', 'Net Earnings', 'Payout Status'];
      const rows = filteredBookings.map(b => [
        b.id,
        b.customerName,
        b.eventName,
        new Date(b.date).toLocaleDateString('en-IN'),
        b.status,
        `₹${b.totalAmount.toLocaleString('en-IN')}`,
        `₹${b.platformFee.toLocaleString('en-IN')}`,
        `₹${b.netEarnings.toLocaleString('en-IN')}`,
        b.payoutStatus,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(csvEscape).join(',')),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vendor-earnings-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success("Earnings report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export earnings report");
    }
  };

  // Get status badge component
  const getStatusBadge = (status: string, type: 'booking' | 'payout' = 'booking') => {
    const config = type === 'booking' ? STATUS_BADGE_CONFIG[status] : PAYOUT_STATUS_BADGE_CONFIG[status];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    
    const Icon = config.icon || null;
    return (
      <Badge className={cn("text-xs font-medium", config.className)}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading your earnings...</p>
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
          <Button variant="ghost" onClick={() => router.push("/dashboard/vendor")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Earnings & Payouts</h1>
            <p className="text-neutral-600">Track your service earnings and payout status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportEarnings} className="gap-2">
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
        {/* Total Earnings */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700">Total Earnings</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  ₹{(stats?.totalEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stats?.completedBookings || 0} completed bookings
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-600 text-white">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Earnings */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700">Pending Earnings</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  ₹{(stats?.pendingEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {stats?.pendingBookings || 0} pending bookings
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-600 text-white">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ready for Payout */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Ready for Payout</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  ₹{filteredStats.readyForPayout.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {filteredBookings.filter(b => b.payoutStatus === 'APPROVED').length} bookings
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
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
                  ₹{Math.round((stats?.totalEarnings || 0) * 0.05).toLocaleString()}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  {PLATFORM_FEE_PERCENTAGE}% of earnings
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Bookings */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {stats?.bookingCount || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  All time bookings
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-600 text-white">
                <Calendar className="h-5 w-5" />
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
              <p className="font-semibold text-blue-900">How Vendor Earnings & Payouts Work</p>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• <strong>Booking Confirmed:</strong> Earnings are tracked once the customer confirms the booking</p>
                <p>• <strong>Service Completed:</strong> After marking the booking as completed, earnings become eligible for payout</p>
                <p>• <strong>3-Day Holding Period:</strong> Payouts are processed within 3 business days after completion</p>
                <p>• <strong>Platform Fee:</strong> A {PLATFORM_FEE_PERCENTAGE}% fee is deducted from each booking</p>
                <p>• <strong>Bank Transfer:</strong> Approved payouts are transferred to your registered bank account</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Monthly Earnings Chart ==================== */}
      {monthlyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Monthly Earnings Trend</CardTitle>
              <CardDescription>Your earnings over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {monthlyData.map((month, index) => (
                  <div key={index} className="text-center p-3 rounded-lg bg-neutral-50">
                    <p className="text-xs font-medium text-neutral-600 mb-1">{month.month}</p>
                    <p className="text-lg font-bold text-black">₹{(month.earnings / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-neutral-500">{month.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ==================== Filters ==================== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Filters:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={filterPayoutStatus}
              onChange={(e) => setFilterPayoutStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all">All Payout Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Paid Out</option>
              <option value="REJECTED">Rejected</option>
            </select>
            {(filterStatus !== 'all' || filterPayoutStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterPayoutStatus('all');
                }}
                className="text-neutral-600"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== Earnings List ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Earnings History</CardTitle>
              <CardDescription>All your booking earnings with payout status</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredBookings.length} bookings
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <IndianRupee className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No earnings found</h3>
              <p className="text-neutral-600">
                {filterStatus !== 'all' || filterPayoutStatus !== 'all'
                  ? "Try adjusting your filters"
                  : "Earnings will appear here once you start receiving bookings"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:shadow-md hover:border-neutral-300 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setIsDetailOpen(true);
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-black">
                          ₹{booking.netEarnings.toLocaleString()}
                        </span>
                        {getStatusBadge(booking.status, 'booking')}
                        {getStatusBadge(booking.payoutStatus, 'payout')}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-neutral-600 flex-wrap">
                        <span className="font-medium">{booking.eventName}</span>
                        <span>•</span>
                        <span>{booking.customerName}</span>
                        <span>•</span>
                        <span>{new Date(booking.date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">Gross: ₹{booking.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">Fee: ₹{booking.platformFee.toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== Booking Detail Dialog ==================== */}
      {selectedBooking && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Booking Details</DialogTitle>
              <DialogDescription>Complete breakdown of earnings and payout</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Amount Summary */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Net Earnings</span>
                  <span className="text-3xl font-bold text-green-900">₹{selectedBooking.netEarnings.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-green-200">
                  <div>
                    <span className="text-xs text-green-600">Gross Amount</span>
                    <p className="text-sm font-semibold text-green-900">₹{selectedBooking.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-green-600">Platform Fee ({PLATFORM_FEE_PERCENTAGE}%)</span>
                    <p className="text-sm font-semibold text-green-900">₹{selectedBooking.platformFee.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-neutral-50">
                  <p className="text-xs font-medium text-neutral-600 mb-1">Booking Status</p>
                  <div>{getStatusBadge(selectedBooking.status, 'booking')}</div>
                </div>
                <div className="p-3 rounded-lg border bg-neutral-50">
                  <p className="text-xs font-medium text-neutral-600 mb-1">Payout Status</p>
                  <div>{getStatusBadge(selectedBooking.payoutStatus, 'payout')}</div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h4 className="font-semibold text-black mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-neutral-600">Name</p>
                    <p className="text-sm font-medium text-black">{selectedBooking.customerName}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-neutral-600">Email</p>
                    <p className="text-sm font-medium text-black truncate">{selectedBooking.customerEmail}</p>
                  </div>
                  <div className="p-3 rounded-lg border col-span-2">
                    <p className="text-xs text-neutral-600">Phone</p>
                    <p className="text-sm font-medium text-black">{selectedBooking.customerPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h4 className="font-semibold text-black mb-3">Booking Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-neutral-600">Event</p>
                    <p className="text-sm font-medium text-black">{selectedBooking.eventName}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-neutral-600">Date</p>
                    <p className="text-sm font-medium text-black">
                      {selectedBooking.date ? new Date(selectedBooking.date).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-neutral-600">Time Slot</p>
                    <p className="text-sm font-medium text-black">
                      {TIME_SLOT_LABELS[selectedBooking.timeSlot] || selectedBooking.timeSlot}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-neutral-600">Booked On</p>
                    <p className="text-sm font-medium text-black">
                      {new Date(selectedBooking.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Timeline */}
              {selectedBooking.completedAt && (
                <div>
                  <h4 className="font-semibold text-black mb-3">Payout Timeline</h4>
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Completed on {new Date(selectedBooking.completedAt).toLocaleDateString('en-IN')}</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Payout will be processed within 3 business days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
