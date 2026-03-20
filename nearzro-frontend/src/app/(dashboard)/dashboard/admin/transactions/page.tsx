"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Search, Download, Eye,
  Clock, CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Transaction {
  id: number;
  type: string;
  customer?: string;
  event?: string;
  amount: number;
  status: string;
  date: string;
  method?: string;
}

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/payments");
      const payments = response.data?.payments || response.data || [];

      if (!Array.isArray(payments)) {
        console.warn("Payments data is not an array:", payments);
        setTransactions([]);
        return;
      }

      const formattedTransactions: Transaction[] = payments.map((p: any) => ({
        id: p.id,
        type: p.refundId ? "Refund" : "Payment",
        customer: p.user?.name || "Unknown",
        event: p.Event?.title || "N/A",
        amount: p.amount,
        status: p.status,
        date: p.createdAt,
        method: p.provider || "Razorpay",
      }));

      setTransactions(formattedTransactions);
    } catch (error: any) {
      console.error("Failed to load transactions:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to load transactions";
      setError(errorMessage);
      toast.error("Failed to load transactions: " + errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.event?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRevenue: transactions.filter(t => t.status === "SUCCESS").reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: transactions.filter(t => t.status === "PENDING").reduce((sum, t) => sum + t.amount, 0),
    refundAmount: transactions.filter(t => t.type === "Refund").reduce((sum, t) => sum + t.amount, 0),
    successRate: transactions.length > 0
      ? (transactions.filter(t => t.status === "SUCCESS").length / transactions.length) * 100
      : 0,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleExport = async () => {
    try {
      const response = await api.get("/payments/export");
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Transactions exported successfully");
    } catch (error: any) {
      toast.error("Failed to export transactions");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Transactions</h1>
            <p className="text-sm text-neutral-600 mt-1">Payment and transaction history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-black" onClick={loadTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" className="border-black" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-2 border-red-200 mx-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
              <div>
                <p className="font-semibold text-red-600">Failed to Load Transactions</p>
                <p className="text-sm text-neutral-600">{error}</p>
                <p className="text-xs text-neutral-500 mt-1">Note: The backend /api/payments endpoint may need to be rebuilt with latest code</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border-2 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Refunds</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.refundAmount)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by customer or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-2 border-neutral-200 mx-6">
        <CardHeader>
          <CardTitle className="text-neutral-900">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!error && filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
              <p className="text-lg font-semibold text-neutral-700">No Transactions Found</p>
              <p className="text-sm text-neutral-500 mt-2">
                {transactions.length === 0 
                  ? "No payment records exist in the database yet. Transactions will appear here once customers make payments."
                  : "No transactions match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-neutral-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Customer/Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          t.type === "Payment" ? "bg-emerald-100 text-emerald-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {t.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{t.customer}</p>
                          <p className="text-xs text-neutral-600">{t.event}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        {new Date(t.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        {t.method || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-neutral-900">{formatCurrency(t.amount)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          t.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" :
                          t.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          t.status === "FAILED" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/admin/transactions/${t.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
