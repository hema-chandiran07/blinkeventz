"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Download,
  Search, CheckCircle2, Clock, XCircle, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PAYOUT_DATA = [
  { id: 1, vendor: "Elite Photography", amount: 45000, date: "2024-03-15", status: "Pending", method: "Bank Transfer" },
  { id: 2, vendor: "Divine Caterers", amount: 125000, date: "2024-03-14", status: "Processing", method: "UPI" },
  { id: 3, vendor: "Grand Ballroom ITC", amount: 200000, date: "2024-03-13", status: "Completed", method: "Bank Transfer" },
  { id: 4, vendor: "DJ Sounds Pro", amount: 35000, date: "2024-03-12", status: "Failed", method: "Bank Transfer" },
  { id: 5, vendor: "Taj Coromandel Hall", amount: 180000, date: "2024-03-11", status: "Completed", method: "Bank Transfer" },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Processing: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
};

export default function PayoutsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const stats = {
    totalPending: 405000,
    totalProcessed: 380000,
    totalFailed: 35000,
    successRate: 91.6,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleExport = async () => {
    try {
      console.log("Exporting payouts report...");
      // Generate CSV from mock data
      const csvContent = PAYOUT_DATA.map(t => 
        `${t.id},${t.vendor},${t.amount},${t.status},${t.date}`
      ).join('\n');
      const blob = new Blob([`ID,Vendor,Amount,Status,Date\n${csvContent}`], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Payouts report exported successfully!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const handleApprove = async (id: number) => {
    if (confirm("Are you sure you want to approve this payout?")) {
      try {
        console.log(`Approving payout ${id}`);
        toast.success(`Payout ${id} approved successfully!`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.reload();
      } catch (error: any) {
        console.error("Approve error:", error);
        toast.error(error?.message || "Failed to approve payout");
      }
    }
  };

  const handleReject = async (id: number) => {
    if (confirm("Are you sure you want to reject this payout?")) {
      const reason = prompt("Please enter rejection reason:");
      if (!reason) return;
      
      try {
        console.log(`Rejecting payout ${id}`);
        toast.success(`Payout ${id} rejected`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.reload();
      } catch (error: any) {
        console.error("Reject error:", error);
        toast.error(error?.message || "Failed to reject payout");
      }
    }
  };

  const handleViewPayout = (id: number) => {
    console.log(`Viewing payout ${id}`);
    router.push(`/dashboard/admin/payouts/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Payouts & Finance</h1>
          <p className="text-neutral-600">Manage vendor and venue payouts</p>
        </div>
        <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Report
        </Button>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending Amount</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{formatCurrency(stats.totalPending)}</p>
                <p className="text-xs text-amber-600 mt-2">Awaiting approval</p>
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
                <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalProcessed)}</p>
                <p className="text-xs text-emerald-600 mt-2">This month</p>
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
                <p className="text-sm font-medium text-neutral-600">Failed</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalFailed)}</p>
                <p className="text-xs text-red-600 mt-2">Requires attention</p>
              </div>
              <div className="p-3 rounded-full bg-red-600">
                <XCircle className="h-6 w-6 text-white" />
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
                <p className="text-xs text-neutral-600 mt-2">Last 30 days</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-900">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card className="border-2 border-black">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-black">Recent Payouts</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-neutral-300 w-64" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Vendor/Venue</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Method</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {PAYOUT_DATA.map((payout) => (
                  <tr key={payout.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-black">#{payout.id}</td>
                    <td className="py-3 px-4 text-sm text-black">{payout.vendor}</td>
                    <td className="py-3 px-4 text-sm font-bold text-black">{formatCurrency(payout.amount)}</td>
                    <td className="py-3 px-4 text-sm text-black">{new Date(payout.date).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 px-4 text-sm text-black">{payout.method}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${STATUS_COLORS[payout.status]} border text-xs`}>{payout.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {payout.status === "Pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50" onClick={() => handleApprove(payout.id)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(payout.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="text-black hover:bg-neutral-100" onClick={() => handleViewPayout(payout.id)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
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
