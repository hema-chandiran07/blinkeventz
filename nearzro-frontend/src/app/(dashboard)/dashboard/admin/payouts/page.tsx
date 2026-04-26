"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign, TrendingUp, Download, Search, CheckCircle2, Clock, XCircle,
  ArrowRight, RefreshCw, Loader2, AlertCircle, CreditCard
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface Payout {
  id: number;
  vendor?: { 
    id: number;
    businessName: string;
    user?: { name: string; email: string };
  };
  venue?: {
    id: number;
    name: string;
    owner?: { name: string; email: string };
    city: string;
  };
  event?: {
    id: number;
    title: string | null;
    eventType: string;
    date: string;
  };
  amount: number;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "COMPLETED" | "REJECTED" | "FAILED";
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  processedAt?: string | null;
}

interface PayoutStats {
  totalPending: number;
  totalProcessed: number;
  totalFailed: number;
  successRate: number;
  payoutCount: number;
}

// ==================== Constants ====================
const STATUS_CONFIG: Record<string, { className: string; label: string; icon: any; actions: string[] }> = {
  PENDING: { className: "bg-amber-950/30 text-amber-400 border-amber-700", label: "Pending", icon: Clock, actions: ["approve", "reject"] },
  PROCESSING: { className: "bg-blue-950/30 text-blue-400 border-blue-700", label: "Processing", icon: RefreshCw, actions: [] },
  APPROVED: { className: "bg-emerald-950/30 text-emerald-400 border-emerald-700", label: "Approved", icon: CheckCircle2, actions: ["process"] },
  COMPLETED: { className: "bg-emerald-950/30 text-emerald-400 border-emerald-700", label: "Completed", icon: CheckCircle2, actions: [] },
  REJECTED: { className: "bg-red-950/30 text-red-400 border-red-700", label: "Rejected", icon: XCircle, actions: [] },
  FAILED: { className: "bg-red-100 text-red-700 border-red-300", label: "Failed", icon: AlertCircle, actions: [] },
};

// ==================== Main Component ====================
export default function AdminPayoutsPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const limit = 15;

  // Load payouts
  const loadPayouts = useCallback(async (showRefresh = false, signal?: AbortSignal) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get("/payouts", {
        params: { page, limit },
        signal,
      });

      const data = response.data;
      const payoutList = data?.data || data?.payouts || data || [];

      if (!Array.isArray(payoutList)) {
        console.warn("Payouts data is not an array:", payoutList);
        setPayouts([]);
        return;
      }

      setPayouts(payoutList);
      setTotalPages(data?.totalPages || data?.pagination?.totalPages || 1);

      // Calculate stats
      const totalPending = payoutList
        .filter((p: Payout) => p.status === "PENDING")
        .reduce((sum: number, p: Payout) => sum + p.amount, 0);

      const totalProcessed = payoutList
        .filter((p: Payout) => ["APPROVED", "COMPLETED"].includes(p.status))
        .reduce((sum: number, p: Payout) => sum + p.amount, 0);

      const totalFailed = payoutList
        .filter((p: Payout) => ["REJECTED", "FAILED"].includes(p.status))
        .reduce((sum: number, p: Payout) => sum + p.amount, 0);

      setStats({
        totalPending,
        totalProcessed,
        totalFailed,
        successRate: payoutList.length > 0
          ? (payoutList.filter((p: Payout) => ["APPROVED", "COMPLETED"].includes(p.status)).length / payoutList.length) * 100
          : 0,
        payoutCount: payoutList.length,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error("Failed to load payouts:", error);
      toast.error(error?.response?.data?.message || "Failed to load payouts");
      setPayouts([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    loadPayouts(false, controller.signal);
    return () => controller.abort();
  }, [loadPayouts]);

  // Filter payouts
  const filteredPayouts = payouts.filter(p => {
    const name = p.vendor?.businessName || p.vendor?.user?.name || p.venue?.name || p.venue?.owner?.name || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesType = filterType === "all" || (p.vendor ? "vendor" : p.venue ? "venue" : "") === filterType;
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
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { className: "bg-zinc-800 text-zinc-400", label: status, icon: null };
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
      const response = await api.get("/payouts/export/csv", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Payouts exported successfully");
    } catch (error: any) {
      toast.error("Failed to export payouts");
    }
  };

  // Handle approve
  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this payout?")) return;

    setActionLoading(id);
    try {
      await api.patch(`/payouts/${id}/approve`);
      toast.success("Payout approved successfully");
      loadPayouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve payout");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject
  const handleReject = async (id: number) => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;

    setActionLoading(id);
    try {
      await api.patch(`/payouts/${id}/reject`, { reason });
      toast.success("Payout rejected");
      loadPayouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject payout");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle process
  const handleProcess = async (id: number) => {
    if (!confirm("Mark this payout as processed?")) return;

    setActionLoading(id);
    try {
      await api.post(`/payouts/${id}/process`);
      toast.success("Payout marked as processed");
      loadPayouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to process payout");
    } finally {
      setActionLoading(null);
    }
  };

  // Get recipient name
  const getRecipientName = (payout: Payout) => {
    return payout.vendor?.businessName || payout.vendor?.user?.name || payout.venue?.name || payout.venue?.owner?.name || "Unknown";
  };

  // Get recipient type
  const getRecipientType = (payout: Payout) => {
    return payout.vendor ? "Vendor" : payout.venue ? "Venue Owner" : "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-400">Loading payouts...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 bg-zinc-950 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border-b border-zinc-800 px-6 py-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Payouts Management</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage vendor and venue owner payouts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => loadPayouts(true)} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> 
              Refresh
            </Button>
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> 
              Export CSV
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid gap-4 md:grid-cols-4 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-amber-800 bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-400">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(stats?.totalPending || 0)}</p>
                <p className="text-xs text-amber-500 mt-1">Awaiting review</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-400">Processed</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats?.totalProcessed || 0)}</p>
                <p className="text-xs text-emerald-500 mt-1">Completed payouts</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-800 bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">Failed/Rejected</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(stats?.totalFailed || 0)}</p>
                <p className="text-xs text-red-500 mt-1">Requires attention</p>
              </div>
              <div className="p-3 rounded-full bg-red-600">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-700 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-300">Success Rate</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{(stats?.successRate || 0).toFixed(1)}%</p>
                <p className="text-xs text-zinc-400 mt-1">{stats?.payoutCount || 0} total payouts</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Filters:</span>
              </div>
              <div className="flex-1 relative max-w-md">
                <Input
                  placeholder="Search by vendor/venue name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-status" className="text-sm whitespace-nowrap text-zinc-300">Status:</Label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex h-10 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-100 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-type" className="text-sm whitespace-nowrap text-zinc-300">Type:</Label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex h-10 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-100 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
                >
                  <option value="all">All Types</option>
                  <option value="vendor">Vendors</option>
                  <option value="venue">Venue Owners</option>
                </select>
              </div>
              {(searchTerm || filterStatus !== "all" || filterType !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterType("all");
                  }}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payouts Table */}
      <motion.div 
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-zinc-100">Payout Requests</CardTitle>
                <p className="text-sm text-zinc-400 mt-1">
                  {filteredPayouts.length} payouts found • Page {page} of {totalPages}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayouts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">No payouts found</h3>
                <p className="text-zinc-400">
                  {searchTerm || filterStatus !== "all" || filterType !== "all"
                    ? "Try adjusting your filters"
                    : "No payout requests available"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50 border-b border-zinc-700">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Payout ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Recipient</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Event</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Created</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredPayouts.map((payout) => {
                        const config = STATUS_CONFIG[payout.status] || { actions: [] };
                        return (
                          <tr key={payout.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <span className="text-xs font-mono text-zinc-400">#{payout.id}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium text-zinc-100">{getRecipientName(payout)}</p>
                                <p className="text-xs text-zinc-500">{getRecipientType(payout)}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={payout.vendor ? "default" : "outline"} className="text-xs">
                                {payout.vendor ? "Vendor" : "Venue"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm text-zinc-300">{payout.event?.title || payout.event?.eventType || "-"}</p>
                                {payout.event?.date && (
                                  <p className="text-xs text-zinc-500">{formatDate(payout.event.date)}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-bold text-zinc-100">{formatCurrency(payout.amount)}</span>
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(payout.status)}
                              {payout.rejectionReason && (
                                <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={payout.rejectionReason}>
                                  {payout.rejectionReason}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-zinc-400">{formatDate(payout.createdAt)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {config.actions.includes("approve") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(payout.id)}
                                    disabled={actionLoading === payout.id}
                                    className="text-emerald-400 hover:bg-emerald-950/30 border-emerald-700"
                                  >
                                    {actionLoading === payout.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {config.actions.includes("reject") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(payout.id)}
                                    disabled={actionLoading === payout.id}
                                    className="text-red-400 hover:bg-red-950/30 border-red-700"
                                  >
                                    {actionLoading === payout.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {config.actions.includes("process") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleProcess(payout.id)}
                                    disabled={actionLoading === payout.id}
                                    className="text-blue-400 hover:bg-blue-950/30 border-blue-700"
                                  >
                                    {actionLoading === payout.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CreditCard className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/admin/payouts/${payout.id}`)}
                                  className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-zinc-400">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredPayouts.length)} of {filteredPayouts.length} payouts
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
                              className={page === pageNum ? "bg-zinc-700" : "border-zinc-700 text-zinc-300"}
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
    </motion.div>
  );
}
