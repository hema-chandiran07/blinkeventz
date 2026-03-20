"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Download, Search, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface Payout {
  id: number;
  vendor?: { name: string };
  venue?: { name: string };
  amount: number;
  status: string;
  createdAt: string;
  eventId?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

export default function PayoutsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      const response = await api.get("/payouts");
      setPayouts(response.data || []);
    } catch (error: any) {
      console.error("Failed to load payouts:", error);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = payouts.filter(p => {
    const name = p.vendor?.name || p.venue?.name || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalPending: payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
    totalProcessed: payouts.filter(p => ['APPROVED', 'COMPLETED'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0),
    totalFailed: payouts.filter(p => ['REJECTED', 'FAILED'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0),
    successRate: payouts.length > 0 
      ? (payouts.filter(p => ['APPROVED', 'COMPLETED'].includes(p.status)).length / payouts.length) * 100 
      : 0,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleExport = async () => {
    try {
      const response = await api.get("/payouts/export/csv");
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Payouts exported successfully!");
    } catch (error: any) {
      toast.error("Failed to export payouts");
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this payout?")) return;
    
    try {
      await api.patch(`/payouts/${id}/approve`);
      toast.success("Payout approved successfully!");
      loadPayouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve payout");
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;
    
    try {
      await api.patch(`/payouts/${id}/reject`, { reason });
      toast.success("Payout rejected");
      loadPayouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject payout");
    }
  };

  const handleProcess = async (id: number) => {
    if (!confirm("Mark this payout as processed?")) return;
    
    try {
      await api.post(`/payouts/${id}/process`);
      toast.success("Payout marked as processed!");
      loadPayouts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to process payout");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Loading payouts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Payouts</h1>
          <p className="text-neutral-600">Manage vendor and venue payouts</p>
        </div>
        <Button variant="outline" className="border-black" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Processed</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalProcessed)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Failed/Rejected</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalFailed)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-600">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-black">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by vendor/venue name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">All Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12 text-neutral-600">
              No payouts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Vendor/Venue</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 text-sm font-medium text-black">#{payout.id}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-black">
                            {payout.vendor?.name || payout.venue?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-neutral-600">
                            {payout.vendor ? 'Vendor' : 'Venue Owner'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-black">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={STATUS_COLORS[payout.status]}>
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {payout.status === 'PENDING' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(payout.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleReject(payout.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {payout.status === 'APPROVED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-black"
                              onClick={() => handleProcess(payout.id)}
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/admin/payouts/${payout.id}`)}
                          >
                            View
                          </Button>
                        </div>
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
