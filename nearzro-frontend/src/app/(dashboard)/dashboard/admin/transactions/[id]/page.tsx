"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CreditCard, User, Calendar, DollarSign, RefreshCcw, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [refundHistory, setRefundHistory] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      loadTransaction();
      loadRefundHistory();
    }
  }, [params.id]);

  const loadTransaction = async () => {
    try {
      const response = await api.get(`/payments/${params.id}`);
      setTransaction(response.data);
    } catch (error: any) {
      toast.error("Failed to load transaction details", {
        description: error?.response?.data?.message || "Please try again"
      });
      router.push("/dashboard/admin/transactions");
    } finally {
      setLoading(false);
    }
  };

  const loadRefundHistory = async () => {
    try {
      const response = await api.get(`/payments/${params.id}/refunds`);
      setRefundHistory(response.data.refunds || []);
    } catch (error) {
      // Refund history might not exist yet
      setRefundHistory([]);
    }
  };

  const handleRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (!transaction) return;

    const amount = parseFloat(refundAmount);
    if (amount > transaction.amount) {
      toast.error("Refund amount cannot exceed transaction amount");
      return;
    }

    try {
      setProcessing(true);
      await api.patch(`/payments/${params.id}/refund`, {
        amount: amount,
        reason: refundReason || "Admin initiated refund"
      });
      
      toast.success("Refund processed successfully", {
        description: amount === transaction.amount ? "Full refund completed" : "Partial refund completed"
      });
      
      setShowRefundDialog(false);
      setRefundAmount("");
      setRefundReason("");
      loadTransaction();
      loadRefundHistory();
    } catch (error: any) {
      toast.error("Failed to process refund", {
        description: error?.response?.data?.message || "Please try again"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-black mb-2">Transaction not found</h3>
        <Button onClick={() => router.push("/dashboard/admin/transactions")}>
          Back to Transactions
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>,
      SUCCESS: <Badge className="bg-green-100 text-green-700 border-green-300">Success</Badge>,
      CAPTURED: <Badge className="bg-green-100 text-green-700 border-green-300">Captured</Badge>,
      FAILED: <Badge className="bg-red-100 text-red-700 border-red-300">Failed</Badge>,
      REFUNDED: <Badge className="bg-blue-100 text-blue-700 border-blue-300">Refunded</Badge>,
      PARTIALLY_REFUNDED: <Badge className="bg-purple-100 text-purple-700 border-purple-300">Partially Refunded</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  const canRefund = transaction.status === "CAPTURED" || transaction.status === "PARTIALLY_REFUNDED";

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin/transactions")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-black">Transaction Details</h1>
      </div>

      {/* Transaction Info Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">Transaction ID</p>
              <p className="font-mono text-black text-sm">{transaction.id}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Status</p>
              <div className="mt-1">{getStatusBadge(transaction.status)}</div>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Amount</p>
              <p className="text-2xl font-bold text-black mt-1">₹{transaction.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Platform Fee (5%)</p>
              <p className="text-lg font-semibold text-black mt-1">₹{transaction.platformFee?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Net Amount</p>
              <p className="text-lg font-semibold text-black mt-1">₹{transaction.netAmount?.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">Payment Method</p>
              <p className="text-black">{transaction.provider || "Razorpay"}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Order ID</p>
              <p className="font-mono text-black text-sm">{transaction.providerOrderId}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Payment ID</p>
              <p className="font-mono text-black text-sm">{transaction.providerPaymentId || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Currency</p>
              <p className="text-black">{transaction.currency || "INR"}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Created</p>
              <p className="text-black">
                {new Date(transaction.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-silver-200 flex items-center justify-center">
                <User className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="font-medium text-black">{transaction.user?.name || "N/A"}</p>
                <p className="text-sm text-neutral-600">{transaction.user?.role || "Customer"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Email</p>
              <p className="text-black text-sm">{transaction.user?.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Phone</p>
              <p className="text-black text-sm">{transaction.user?.phone || "N/A"}</p>
            </div>
            {transaction.event && (
              <div className="pt-4 border-t border-silver-200">
                <p className="text-sm font-medium text-neutral-600 mb-2">Event</p>
                <p className="text-black text-sm">{transaction.event.title}</p>
                <p className="text-xs text-neutral-500">
                  {transaction.event.venue?.name} • {new Date(transaction.event.date).toLocaleDateString("en-IN")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refund Actions */}
      {canRefund && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <RefreshCcw className="h-5 w-5" />
              Refund Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-800 mb-1">
                  {transaction.status === "PARTIALLY_REFUNDED" 
                    ? "Process additional refund" 
                    : "Process full or partial refund"}
                </p>
                <p className="text-xs text-amber-700">
                  Refundable amount: ₹{transaction.amount.toLocaleString()}
                </p>
              </div>
              <Button 
                variant="outline" 
                className="text-amber-700 border-amber-600 hover:bg-amber-200"
                onClick={() => setShowRefundDialog(true)}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Process Refund
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund History */}
      {refundHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Refund History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {refundHistory.map((refund, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-silver-200 bg-silver-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <RefreshCcw className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-black">₹{refund.amount.toLocaleString()}</p>
                      <p className="text-sm text-neutral-600">{refund.reason}</p>
                      <p className="text-xs text-neutral-500">
                        By {refund.initiatedBy} • {new Date(refund.timestamp).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  {refund.isFullRefund && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">Full Refund</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-amber-600" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              {transaction?.status === "PARTIALLY_REFUNDED" 
                ? "Process an additional partial refund" 
                : "Process a full or partial refund for this transaction"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Refund Amount (₹)</label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Max: ${transaction?.amount || 0}`}
                max={transaction?.amount}
                className="border-silver-300"
              />
              {transaction && (
                <p className="text-xs text-neutral-600">
                  Original amount: ₹{transaction.amount.toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Refund Reason</label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund (optional)"
                rows={3}
                className="border-silver-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button 
              onClick={handleRefund} 
              disabled={processing || !refundAmount || parseFloat(refundAmount) <= 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Confirm Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
