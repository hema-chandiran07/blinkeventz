"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle,
  Search, Download, Calendar, CreditCard, ArrowRight
} from "lucide-react";
import { BarChart, StatCard } from "@/components/ui/chart";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

interface Payout {
  id: number;
  eventId: number;
  venueId: number;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  approvedAt?: string;
  rejectedAt?: string;
  processedAt?: string;
  createdAt: string;
  venue: {
    id: number;
    name: string;
    city: string;
  };
  event: {
    id: number;
    title: string | null;
    eventType: string;
    date: string;
    customer: {
      id: number;
      name: string;
      email: string;
    };
  };
}

interface PayoutStats {
  totalPayouts: number;
  pendingPayouts: number;
  upcomingPayouts: number;
  platformFees: number;
  monthlyData: { label: string; value: number }[];
}

export default function VenuePayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPayouts();
    loadStats();
    loadBankDetails();
  }, []);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/payouts/venue-owner/me", {
        params: { limit: 100 },
      });

      // Backend returns { payouts: [...], totalPayouts, pendingPayouts, ... }
      if (response.data && response.data.payouts) {
        setPayouts(response.data.payouts);
      } else if (Array.isArray(response.data)) {
        // Fallback if backend returns array directly
        setPayouts(response.data);
      }
    } catch (error: any) {
      console.error("Failed to load payouts:", error);
      if (error?.response?.status !== 404) {
        toast.error("Failed to load payouts");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get("/payouts/venue-owner/stats");
      if (response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadBankDetails = async () => {
    try {
      const response = await api.get("/bank-account/venue-owner");
      if (response.data) {
        setBankDetails(response.data);
      }
    } catch (error: any) {
      // 404 is expected if no bank account is registered
      if (error?.response?.status !== 404) {
        console.error("Failed to load bank details:", error);
      }
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    const eventName = payout.event.title || payout.event.eventType;
    const customerName = payout.event.customer?.name || "";
    const venueName = payout.venue?.name || "";

    const matchesSearch = eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venueName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || payout.status === filterStatus;
    // Dynamic year and month filtering
    const payoutDate = new Date(payout.createdAt);
    const payoutYear = payoutDate.getFullYear();
    const payoutMonth = payoutDate.getMonth() + 1; // 1-12
    const matchesMonth = filterMonth === "all" || 
                        (payoutMonth === parseInt(filterMonth) && payoutYear === currentYear);
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><CreditCard className="h-3 w-3 mr-1" />Processing</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-red-300"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleExportPayouts = () => {
    try {
      // Check if there's data to export
      if (filteredPayouts.length === 0) {
        toast.warning('No payouts to export');
        return;
      }

      // Helper to escape CSV values
      const csvEscape = (val: string | number | undefined | null) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Generate CSV from filtered payouts
      const headers = [
        'Payout ID',
        'Event',
        'Venue',
        'Customer',
        'Event Date',
        'Gross Amount',
        'Platform Fee (5%)',
        'Payout Amount',
        'Status',
        'Created At',
        'Payout Date',
      ];

      const rows = filteredPayouts.map(payout => {
        const eventName = payout.event?.title || payout.event?.eventType || '-';
        const venueName = payout.venue?.name || '-';
        const customerName = payout.event?.customer?.name || '-';
        const platformFee = Math.round(payout.amount * 0.05);
        const payoutAmount = payout.amount - platformFee;
        const eventDate = payout.event?.date ? new Date(payout.event.date).toLocaleDateString('en-IN') : '-';
        const createdAt = payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-IN') : '-';
        const payoutDateStr = payout.approvedAt || payout.processedAt;
        const payoutDate = payoutDateStr ? new Date(payoutDateStr).toLocaleDateString('en-IN') : '-';

        return [
          payout.id,
          eventName,
          venueName,
          customerName,
          eventDate,
          `₹${payout.amount.toLocaleString('en-IN')}`,
          `₹${platformFee.toLocaleString('en-IN')}`,
          `₹${payoutAmount.toLocaleString('en-IN')}`,
          payout.status,
          createdAt,
          payoutDate,
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(csvEscape).join(',')),
      ].join('\n');

      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `venue-payouts-${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success(`Exported ${filteredPayouts.length} payouts to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export payout report');
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading payouts...</p>
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
          <h1 className="text-3xl font-bold text-black">Payouts</h1>
          <p className="text-neutral-600">Track your earnings and payment history</p>
        </div>
        <Button variant="outline" onClick={handleExportPayouts}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard
          title="Total Payouts Received"
          value={`₹${stats ? (stats.totalPayouts / 100000).toFixed(2) + "L" : "0"}`}
          subtext="All time earnings"
          icon={DollarSign}
          trend="up"
          trendValue="+15% vs last month"
        />
        <StatCard
          title="Pending & Processing"
          value={`₹${stats ? (stats.pendingPayouts / 100000).toFixed(2) + "L" : "0"}`}
          subtext={`${stats?.upcomingPayouts || 0} payouts pending`}
          icon={Clock}
        />
        <StatCard
          title="Platform Fees"
          value={`₹${stats ? (stats.platformFees / 1000).toFixed(0) + "K" : "0"}`}
          subtext="Total fees paid"
          icon={TrendingUp}
        />
        <StatCard
          title="This Month"
          value={`₹${stats && stats.monthlyData.length > 0 ? (stats.monthlyData[stats.monthlyData.length - 1].value / 100000).toFixed(2) + "L" : "0"}`}
          subtext={stats && stats.monthlyData.length > 0 ? stats.monthlyData[stats.monthlyData.length - 1].label + " 2026" : "Current month"}
          icon={Calendar}
          trend="up"
          trendValue="+8% vs January"
        />
      </motion.div>

      {/* Payout Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-silver-200 bg-white">
          <CardHeader>
            <CardTitle className="text-black">Payout Trend (Last 6 Months)</CardTitle>
            <CardDescription className="text-neutral-600">Your monthly payout history</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats?.monthlyData || []}
              height={220}
              color="bg-gradient-to-t from-green-600 to-green-400"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by event, customer, or venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 rounded-md border border-silver-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex h-10 rounded-md border border-silver-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
              >
                <option value="all">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payouts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-silver-200 bg-white">
          <CardHeader>
            <CardTitle className="text-black">Payout History</CardTitle>
            <CardDescription className="text-neutral-600">Detailed breakdown of all your payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayouts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-black mb-2">No payouts found</h3>
                <p className="text-neutral-600">
                  {searchQuery || filterStatus !== "all" ? "Try adjusting your filters" : "Payouts will appear here once you start receiving bookings"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-silver-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Event Details</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Event Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Platform Fee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Payout Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Payout Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((payout) => {
                      const eventName = payout.event.title || payout.event.eventType;
                      const platformFee = Math.round(payout.amount * 0.05);
                      const payoutAmount = payout.amount - platformFee;
                      
                      return (
                        <tr key={payout.id} className="border-b border-silver-100 table-row-hover">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-black">{eventName}</p>
                              <p className="text-sm text-neutral-600">{payout.venue?.name || "-"}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-black">{payout.event.customer?.name || "-"}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-black">
                              {new Date(payout.event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-black">₹{payout.amount.toLocaleString("en-IN")}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-neutral-600">₹{platformFee.toLocaleString("en-IN")}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-green-600">₹{payoutAmount.toLocaleString("en-IN")}</p>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(payout.status)}
                          </td>
                          <td className="py-4 px-4">
                            {payout.approvedAt || payout.processedAt ? (
                              <div>
                                <p className="text-black">
                                  {new Date(payout.approvedAt || payout.processedAt || "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </p>
                              </div>
                            ) : (
                              <p className="text-neutral-400">-</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/dashboard/venue/payouts/${payout.id}`}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Payout Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid gap-4 md:grid-cols-2"
      >
        <Card className="border-silver-200 bg-white">
          <CardHeader>
            <CardTitle className="text-black">How Payouts Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-green-700">1</span>
              </div>
              <div>
                <p className="font-medium text-black">Event Completed</p>
                <p className="text-sm text-neutral-600">Payout is initiated after the event is successfully completed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-700">2</span>
              </div>
              <div>
                <p className="font-medium text-black">Processing Period</p>
                <p className="text-sm text-neutral-600">Payouts are processed within 24-48 hours after event completion</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-700">3</span>
              </div>
              <div>
                <p className="font-medium text-black">Bank Transfer</p>
                <p className="text-sm text-neutral-600">Funds are transferred to your registered bank account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-700">4</span>
              </div>
              <div>
                <p className="font-medium text-black">Platform Fee</p>
                <p className="text-sm text-neutral-600">A 5% platform fee is deducted from each booking</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-silver-200 bg-white">
          <CardHeader>
            <CardTitle className="text-black">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankDetails ? (
              <div className="p-4 bg-silver-50 rounded-lg border border-silver-200">
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="h-5 w-5 text-neutral-600" />
                  <p className="font-medium text-black">Registered Bank Account</p>
                </div>
                <p className="text-sm text-neutral-600 mb-1">Account Holder</p>
                <p className="font-medium text-black">{bankDetails.accountHolder}</p>
                <p className="text-sm text-neutral-600 mt-3 mb-1">Account Number</p>
                <p className="font-medium text-black">{bankDetails.accountNumber}</p>
                <p className="text-sm text-neutral-600 mt-3 mb-1">IFSC Code</p>
                <p className="font-medium text-black">{bankDetails.ifsc}</p>
                <p className="text-sm text-neutral-600 mt-3 mb-1">Bank Name</p>
                <p className="font-medium text-black">{bankDetails.bankName}</p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">No Bank Account Registered</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Please add your bank account details to receive payouts
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/dashboard/venue/kyc"}>
              {bankDetails ? "Update Bank Details" : "Add Bank Details"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
