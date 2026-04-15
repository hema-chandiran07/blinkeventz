"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp, TrendingDown, Search, Download, Eye, CreditCard,
  Clock, CheckCircle2, AlertCircle, RefreshCw, Loader2, Filter,
  DollarSign, Calendar, User, Building
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ==================== Types ====================
interface Transaction {
  id: number;
  type: "Payment" | "Refund";
  customer?: string;
  customerEmail?: string;
  event?: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  method?: string;
  userId?: number;
  eventId?: number;
}

interface TransactionStats {
  totalRevenue: number;
  pendingAmount: number;
  refundAmount: number;
  successRate: number;
  transactionCount: number;
}

// ==================== Constants ====================
const STATUS_CONFIG: Record<string, { className: string; label: string; icon: any }> = {
  SUCCESS: { className: "bg-green-100 text-green-700 border-green-300", label: "Success", icon: CheckCircle2 },
  CAPTURED: { className: "bg-green-100 text-green-700 border-green-300", label: "Captured", icon: CheckCircle2 },
  PENDING: { className: "bg-amber-100 text-amber-700 border-amber-300", label: "Pending", icon: Clock },
  FAILED: { className: "bg-red-100 text-red-700 border-red-300", label: "Failed", icon: AlertCircle },
  REFUNDED: { className: "bg-blue-100 text-blue-700 border-blue-300", label: "Refunded", icon: TrendingDown },
};

// ==================== Main Component ====================
export default function AdminTransactionsPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "7days" | "30days">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Load transactions
  const loadTransactions = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const now = new Date();
      let start: string | undefined;
      
      if (dateRange === "7days") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        start = d.toISOString().split('T')[0];
      } else if (dateRange === "30days") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        start = d.toISOString().split('T')[0];
      }

      const response = await api.get("/payments", {
        params: { page, limit, startDate: start },
      });

      const data = response.data;
      const payments = data?.payments || data?.data || data || [];

      if (!Array.isArray(payments)) {
        console.warn("Payments data is not an array:", payments);
        setTransactions([]);
        return;
      }

      const formattedTransactions: Transaction[] = payments.map((p: any) => ({
        id: p.id,
        type: (p.status === "REFUNDED" || p.refundId) ? "Refund" : "Payment",
        customer: p.user?.name || "Unknown",
        customerEmail: p.user?.email || "",
        event: p.event?.title || p.Event?.title || "N/A",
        amount: p.amount,
        currency: p.currency || "INR",
        status: p.status,
        date: p.createdAt,
        method: p.provider || "Razorpay",
        userId: p.userId,
        eventId: p.eventId,
      }));

      setTransactions(formattedTransactions);
      setTotalPages(data?.totalPages || data?.pagination?.totalPages || 1);

      // Calculate stats
      const totalRevenue = payments
        .filter((p: any) => p.status === "SUCCESS" || p.status === "CAPTURED")
        .reduce((sum: number, p: any) => sum + p.amount, 0);
      
      const pendingAmount = payments
        .filter((p: any) => p.status === "PENDING")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      const refundAmount = payments
        .filter((p: any) => p.status === "REFUNDED" || p.refundId)
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      setStats({
        totalRevenue,
        pendingAmount,
        refundAmount,
        successRate: payments.length > 0
          ? (payments.filter((p: any) => p.status === "SUCCESS" || p.status === "CAPTURED").length / payments.length) * 100
          : 0,
        transactionCount: payments.length,
      });
    } catch (error: any) {
      console.error("Failed to load transactions:", error);
      const errorMessage = error?.response?.data?.message || "Failed to load transactions";
      toast.error(errorMessage);
      setTransactions([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, dateRange]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.event?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { className: "bg-neutral-100 text-neutral-700", label: status, icon: null };
    const Icon = config.icon;
    return (
      <Badge className={cn("text-xs font-medium", config.className)}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await api.get("/payments/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Transactions exported successfully");
    } catch (error: any) {
      toast.error("Failed to export transactions");
    }
  };

  // Handle view transaction
  const handleViewTransaction = (transactionId: number) => {
    router.push(`/dashboard/admin/transactions/${transactionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-white via-silver-50 to-white min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold text-black tracking-tight">
            Financial <span className="text-silver-600">Ledger</span>
          </h1>
          <p className="text-neutral-500 font-medium">Real-time payment tracking and reconciliation</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-neutral-200 hover:bg-white shadow-sm transition-all" 
            onClick={() => loadTransactions(true)} 
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> 
            Refresh
          </Button>
          <Button 
            className="bg-black hover:bg-neutral-800 text-white shadow-lg shadow-black/10 transition-all font-semibold" 
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { label: "Total Revenue", value: stats?.totalRevenue, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", sub: `${stats?.transactionCount} successful` },
          { label: "Pending Buffer", value: stats?.pendingAmount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", sub: "Awaiting confirmation" },
          { label: "Refund Volume", value: stats?.refundAmount, icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50", sub: "Total volume" },
          { label: "Efficiency Rate", value: `${(stats?.successRate || 0).toFixed(1)}%`, icon: CheckCircle2, color: "text-neutral-900", bg: "bg-neutral-100", sub: "Payment integrity" }
        ].map((item, i) => (
          <Card key={item.label} className="border-none shadow-xl shadow-silver-200/50 bg-white/80 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-black opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">{item.label}</p>
                  <p className="text-2xl font-black text-black">
                    {typeof item.value === 'number' ? formatCurrency(item.value) : item.value}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1 font-medium">{item.sub}</p>
                </div>
                <div className={cn("p-3 rounded-2xl shadow-inner", item.bg, item.color)}>
                  <item.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700">Filters:</span>
              </div>
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by customer, email, or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-range" className="text-sm whitespace-nowrap">Date:</Label>
                <select
                  id="date-range"
                  value={dateRange}
                  onChange={(e) => { setDateRange(e.target.value as any); setPage(1); }}
                  className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-status" className="text-sm whitespace-nowrap">Status:</Label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  <option value="all">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="CAPTURED">Captured</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-type" className="text-sm whitespace-nowrap">Type:</Label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  <option value="all">All Types</option>
                  <option value="Payment">Payments</option>
                  <option value="Refund">Refunds</option>
                </select>
              </div>
              {(searchTerm || filterStatus !== "all" || filterType !== "all" || dateRange !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterType("all");
                    setDateRange("all");
                  }}
                  className="text-neutral-600"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions Table */}
      <motion.div 
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black">Recent Transactions</CardTitle>
                <p className="text-sm text-neutral-600 mt-1">
                  {filteredTransactions.length} transactions found
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">No transactions found</h3>
                <p className="text-neutral-600">
                  {searchTerm || filterStatus !== "all" || filterType !== "all" || dateRange !== "all"
                    ? "Try adjusting your filters"
                    : "No transactions available"}
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
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono text-neutral-600">#{t.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{t.customer}</p>
                              <p className="text-xs text-neutral-500">{t.customerEmail}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Link 
                              href={`/dashboard/admin/events/${t.eventId}`}
                              className="text-sm font-bold text-black hover:text-silver-600 transition-colors underline decoration-silver-200 underline-offset-4"
                            >
                              {t.event}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={t.type === "Payment" ? "default" : "outline"} className="text-xs">
                              {t.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-bold text-neutral-900">{formatCurrency(t.amount)}</span>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(t.status)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-neutral-600">{formatDate(t.date)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewTransaction(t.id)}
                              className="text-neutral-600 hover:bg-neutral-100"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-neutral-600">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={page === pageNum ? "bg-neutral-900" : ""}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
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
      </motion.div>
    </div>
  );
}
