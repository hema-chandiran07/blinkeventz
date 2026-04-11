"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, Calendar, DollarSign, CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PayoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payout, setPayout] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadPayout();
    }
  }, [params.id]);

  const loadPayout = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payouts/${params.id}`);
      setPayout(response.data);
    } catch (error: any) {
      toast.error("Failed to load payout details", {
        description: error?.response?.data?.message || "Please try again"
      });
      router.push("/dashboard/admin/payouts");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this payout?")) return;
    
    try {
      setProcessing(true);
      await api.patch(`/payouts/${params.id}/approve`);
      toast.success("Payout approved successfully");
      loadPayout();
    } catch (error: any) {
      toast.error("Failed to approve payout", {
        description: error?.response?.data?.message || "Please try again"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    
    try {
      setProcessing(true);
      await api.patch(`/payouts/${params.id}/reject`, { reason });
      toast.success("Payout rejected");
      loadPayout();
    } catch (error: any) {
      toast.error("Failed to reject payout", {
        description: error?.response?.data?.message || "Please try again"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!confirm("Are you sure you want to process this payout?")) return;
    
    try {
      setProcessing(true);
      await api.post(`/payouts/${params.id}/process`);
      toast.success("Payout processed successfully");
      loadPayout();
    } catch (error: any) {
      toast.error("Failed to process payout", {
        description: error?.response?.data?.message || "Please try again"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      PENDING: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>,
      APPROVED: <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>,
      REJECTED: <Badge className="bg-red-100 text-red-700 border-red-300">Rejected</Badge>,
      PROCESSING: <Badge className="bg-blue-100 text-blue-700 border-blue-300">Processing</Badge>,
      COMPLETED: <Badge className="bg-green-100 text-green-700 border-green-300">Completed</Badge>,
      FAILED: <Badge className="bg-red-100 text-red-700 border-red-300">Failed</Badge>,
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading payout details...</p>
        </div>
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-black mb-2">Payout not found</h3>
        <Button onClick={() => router.push("/dashboard/admin/payouts")}>
          Back to Payouts
        </Button>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/admin/payouts")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-black">Payout Details</h1>
        </div>
        {getStatusBadge(payout.status)}
      </div>

      {/* Payout Information Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payout Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">Payout ID</p>
              <p className="font-mono text-black text-sm">{payout.id}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Amount</p>
              <p className="text-2xl font-bold text-black mt-1">₹{payout.amount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Platform Fee (5%)</p>
              <p className="text-lg font-semibold text-black mt-1">₹{payout.platformFee?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Net Amount</p>
              <p className="text-lg font-semibold text-black mt-1">₹{payout.netAmount?.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recipient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-silver-200 flex items-center justify-center">
                <Building className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="font-medium text-black">{payout.recipientType === 'VENDOR' ? 'Vendor' : 'Venue Owner'}</p>
                <p className="text-sm text-neutral-600">{payout.recipientName}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-neutral-600">Bank Account</p>
              <p className="text-black text-sm">****{payout.bankAccount?.accountNumber?.slice(-4) || 'N/A'}</p>
              <p className="text-xs text-neutral-500">{payout.bankAccount?.bankName || ''}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600">IFSC Code</p>
              <p className="text-black text-sm">{payout.bankAccount?.ifscCode || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-600">Requested On</p>
              <p className="text-black">
                {new Date(payout.requestedAt).toLocaleString("en-IN")}
              </p>
            </div>
            {payout.approvedAt && (
              <div>
                <p className="text-sm text-neutral-600">Approved On</p>
                <p className="text-black">
                  {new Date(payout.approvedAt).toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {payout.processedAt && (
              <div>
                <p className="text-sm text-neutral-600">Processed On</p>
                <p className="text-black">
                  {new Date(payout.processedAt).toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {payout.rejectedAt && (
              <div>
                <p className="text-sm text-neutral-600">Rejected On</p>
                <p className="text-black">
                  {new Date(payout.rejectedAt).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Reason */}
      {payout.rejectionReason && (
        <Card className="border-red-300 bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <XCircle className="h-5 w-5" />
              Rejection Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{payout.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {payout.status === "PENDING" && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Clock className="h-5 w-5" />
              Payout Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={handleApprove} 
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Payout
                  </>
                )}
              </Button>
              <Button 
                onClick={handleReject} 
                disabled={processing}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Payout
                  </>
                )}
              </Button>
              <Button 
                onClick={handleProcess} 
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payout
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details */}
      {payout.transactionId && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600">Transaction ID</p>
                <p className="font-mono text-black text-sm">{payout.transactionId}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Payment Method</p>
                <p className="text-black">{payout.paymentMethod || "Bank Transfer"}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">UTR/Reference Number</p>
                <p className="text-black">{payout.utrNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600">Processing Fee</p>
                <p className="text-black">₹{payout.processingFee?.toLocaleString() || "0"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
