"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle,
  ArrowLeft, Download, Calendar, Filter, Loader2, Eye
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Payout {
  id: number;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "FAILED";
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  processedAt?: string | null;
  createdAt: string;
  event?: {
    id: number;
    title: string | null;
    eventType: string;
    date: string;
  } | null;
}

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  rejectedPayouts: number;
  upcomingPayouts: number;
}

export default function VendorEarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      // Load payouts
      const payoutsResponse = await api.get('/payouts/vendor');
      const allPayouts = payoutsResponse.data || [];
      setPayouts(allPayouts);

      // Calculate stats
      const totalEarnings = allPayouts.reduce((sum: number, p: Payout) => 
        sum + (p.status === "COMPLETED" || p.status === "APPROVED" ? p.amount : 0), 0);
      
      const pendingPayouts = allPayouts.filter((p: Payout) => p.status === "PENDING" || p.status === "PROCESSING").length;
      const completedPayouts = allPayouts.filter((p: Payout) => p.status === "COMPLETED").length;
      const rejectedPayouts = allPayouts.filter((p: Payout) => p.status === "REJECTED" || p.status === "FAILED").length;
      const upcomingPayouts = allPayouts.filter((p: Payout) => p.status === "APPROVED").length;

      setStats({
        totalEarnings,
        pendingPayouts,
        completedPayouts,
        rejectedPayouts,
        upcomingPayouts,
      });
    } catch (error: any) {
      console.error("Failed to load earnings:", error);
      toast.error("Failed to load earnings data");
      setStats({
        totalEarnings: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        rejectedPayouts: 0,
        upcomingPayouts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    return filterStatus === "all" || payout.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleExportEarnings = () => {
    toast.info("Export feature coming soon");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading earnings...</p>
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
      {/* Header */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" onClick={() => router.push("/dashboard/vendor")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black">Earnings & Payouts</h1>
          <p className="text-neutral-600">Track your earnings and payout status</p>
        </div>
        <Button variant="outline" onClick={handleExportEarnings} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600">Total Earnings</p>
                <p className="text-2xl font-bold text-black mt-1">₹{(stats?.totalEarnings || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.pendingPayouts || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.upcomingPayouts || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats?.completedPayouts || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats?.rejectedPayouts || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-red-50 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-neutral-600 mt-0.5" />
            <div>
              <p className="font-medium text-black">How Payouts Work</p>
              <p className="text-sm text-neutral-600">
                After completing a booking, payouts are processed within 3-5 business days. 
                Once approved by admin, the amount is transferred to your registered bank account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Filter:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all">All Payouts</option>
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

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>All your payout transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No payouts found</h3>
              <p className="text-neutral-600">
                {filterStatus !== "all" 
                  ? "Try adjusting your filter"
                  : "Payouts will appear here after completing bookings"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 rounded-xl border hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-neutral-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-black">
                          ₹{payout.amount.toLocaleString()}
                        </span>
                        {getStatusBadge(payout.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        <span>{payout.event?.eventType || 'Event'}</span>
                        <span>•</span>
                        <span>{new Date(payout.createdAt).toLocaleDateString()}</span>
                        {payout.event?.title && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{payout.event.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPayout(payout);
                        setIsDetailOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Detail Dialog */}
      {selectedPayout && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <span className="text-neutral-600">Amount</span>
                <span className="text-2xl font-bold text-black">₹{selectedPayout.amount.toLocaleString()}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Status</span>
                  {getStatusBadge(selectedPayout.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Created</span>
                  <span className="text-black">{new Date(selectedPayout.createdAt).toLocaleDateString()}</span>
                </div>
                
                {selectedPayout.approvedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Approved</span>
                    <span className="text-black">{new Date(selectedPayout.approvedAt).toLocaleDateString()}</span>
                  </div>
                )}
                
                {selectedPayout.processedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Processed</span>
                    <span className="text-black">{new Date(selectedPayout.processedAt).toLocaleDateString()}</span>
                  </div>
                )}
                
                {selectedPayout.rejectedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Rejected</span>
                    <span className="text-black">{new Date(selectedPayout.rejectedAt).toLocaleDateString()}</span>
                  </div>
                )}
                
                {selectedPayout.rejectionReason && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-700">{selectedPayout.rejectionReason}</p>
                  </div>
                )}
                
                {selectedPayout.event && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-neutral-600 mb-2">Event Details</p>
                    <div className="space-y-1">
                      <p className="text-black">{selectedPayout.event.title || selectedPayout.event.eventType}</p>
                      <p className="text-sm text-neutral-600">
                        {new Date(selectedPayout.event.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
