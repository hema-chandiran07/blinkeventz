"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle,
  CreditCard, Calendar, Building, Users, Mail, Phone, Download,
  Loader2, Info
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

// ==================== Types ====================
interface Customer {
  id: number;
  name: string;
  email: string;
}

interface PayoutItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: string;
}

interface Payout {
  id: number;
  amount: number;
  grossAmount: number;
  platformFee: number;
  platformFeePercentage: number;
  status: "PENDING" | "CREATED" | "AUTHORIZED" | "CAPTURED" | "DISBURSED" | "FAILED" | "REFUNDED" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  completedAt?: string;
  customer?: Customer;
  items: PayoutItem[];
}

// ==================== Constants ====================
const STATUS_CONFIG: Record<string, { label: string; className: string; description: string }> = {
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-300", description: "Payment initiated, awaiting processing" },
  CREATED: { label: "Created", className: "bg-yellow-100 text-yellow-700 border-yellow-300", description: "Payment record created" },
  AUTHORIZED: { label: "Authorized", className: "bg-blue-100 text-blue-700 border-blue-300", description: "Payment authorized by customer" },
  CAPTURED: { label: "Captured", className: "bg-blue-100 text-blue-700 border-blue-300", description: "Payment captured, processing payout" },
  DISBURSED: { label: "Disbursed", className: "bg-green-100 text-green-700 border-green-300", description: "Funds transferred to your account" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700 border-red-300", description: "Payment failed" },
  REFUNDED: { label: "Refunded", className: "bg-neutral-100 text-neutral-700 border-neutral-300", description: "Payment refunded to customer" },
  CANCELLED: { label: "Cancelled", className: "bg-neutral-100 text-neutral-700 border-neutral-300", description: "Payment cancelled" },
  EXPIRED: { label: "Expired", className: "bg-neutral-100 text-neutral-700 border-neutral-300", description: "Payment link expired" },
  PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-700 border-blue-300", description: "Payout is being processed" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border-green-300", description: "Payout completed successfully" },
};

const PLATFORM_FEE_PERCENTAGE = 5;

// ==================== Main Component ====================
export default function PayoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const payoutId = params.id as string;

  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<any>(null);

  useEffect(() => {
    if (payoutId) {
      loadPayout();
      loadBankDetails();
    }
  }, [payoutId]);

  const loadPayout = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/venues/payouts/${payoutId}`);
      setPayout(response.data);
    } catch (error: any) {
      console.error("Failed to load payout:", error);
      toast.error(error?.response?.data?.message || "Failed to load payout details");
    } finally {
      setLoading(false);
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

  const handleExportReceipt = () => {
    if (!payout) return;
    
    const receiptContent = `
PAYOUT RECEIPT
==============

Payout ID: #${payout.id}
Date: ${new Date(payout.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
Status: ${STATUS_CONFIG[payout.status]?.label || payout.status}

AMOUNT DETAILS
--------------
Gross Amount: ₹${payout.grossAmount.toLocaleString("en-IN")}
Platform Fee (${payout.platformFeePercentage || PLATFORM_FEE_PERCENTAGE}%): ₹${payout.platformFee.toLocaleString("en-IN")}
Net Payout: ₹${payout.amount.toLocaleString("en-IN")}

ITEMS
-----
${payout.items.map(item => `${item.name} x${item.quantity} - ₹${item.total.toLocaleString("en-IN")}`).join("\n")}

${payout.customer ? `
CUSTOMER
--------
Name: ${payout.customer.name}
Email: ${payout.customer.email}
` : ""}

Thank you for using NearZro!
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payout-receipt-${payout.id}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success("Receipt downloaded");
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, className: "bg-neutral-100 text-neutral-700", description: "" };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-black mb-2">Payout Not Found</h2>
          <p className="text-neutral-600 mb-4">The payout you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const netPayout = payout.amount;
  const platformFee = payout.platformFee || Math.round(payout.grossAmount * (PLATFORM_FEE_PERCENTAGE / 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Payout Details</h1>
            <p className="text-neutral-600">Payout ID: #{payout.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(payout.status)}
          <Button variant="outline" onClick={handleExportReceipt} className="gap-2">
            <Download className="h-4 w-4" />
            Download Receipt
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Breakdown */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-neutral-600" />
                Amount Breakdown
              </CardTitle>
              <CardDescription>Detailed breakdown of this payout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm font-medium text-green-800">Gross Amount</p>
                    <p className="text-xs text-green-600">Total booking value</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">₹{payout.grossAmount.toLocaleString("en-IN")}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm font-medium text-red-800">Platform Fee</p>
                    <p className="text-xs text-red-600">{payout.platformFeePercentage || PLATFORM_FEE_PERCENTAGE}% of gross amount</p>
                  </div>
                  <p className="text-xl font-semibold text-red-700">- ₹{platformFee.toLocaleString("en-IN")}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                  <div>
                    <p className="text-sm font-medium text-green-900">Net Payout</p>
                    <p className="text-xs text-green-600">Amount you receive</p>
                  </div>
                  <p className="text-3xl font-bold text-green-700">₹{netPayout.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Fee Calculation Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">How Platform Fees Are Calculated</p>
                    <p className="text-xs text-blue-700 mt-1">
                      A {payout.platformFeePercentage || PLATFORM_FEE_PERCENTAGE}% platform fee is deducted from each booking to cover payment processing, 
                      platform maintenance, and customer support.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items / Services */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-neutral-600" />
                Booked Items
              </CardTitle>
              <CardDescription>Items included in this payout</CardDescription>
            </CardHeader>
            <CardContent>
              {payout.items.length === 0 ? (
                <p className="text-neutral-600 text-center py-4">No items found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-silver-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Item</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Quantity</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Unit Price</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payout.items.map((item, index) => (
                        <tr key={index} className="border-b border-silver-100">
                          <td className="py-4 px-4">
                            <p className="font-medium text-black">{item.name}</p>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="text-neutral-600">{item.type}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-black">x{item.quantity}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-neutral-600">₹{item.unitPrice.toLocaleString("en-IN")}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-black">₹{item.total.toLocaleString("en-IN")}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          {payout.customer && (
            <Card className="border-silver-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-neutral-600" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Name</p>
                    <p className="text-black font-medium">{payout.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Email</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-neutral-400" />
                      <p className="text-black">{payout.customer.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle>Payout Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-silver-50 border border-silver-200">
                {getStatusBadge(payout.status)}
                <p className="text-sm text-neutral-600 mt-2">
                  {STATUS_CONFIG[payout.status]?.description || "Status information not available"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Created</span>
                  <span className="text-sm font-medium text-black">
                    {new Date(payout.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {payout.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Completed</span>
                    <span className="text-sm font-medium text-black">
                      {new Date(payout.completedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-neutral-600" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankDetails ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-neutral-600">Account Holder</p>
                    <p className="text-sm font-medium text-black">{bankDetails.accountHolder}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-600">Account Number</p>
                    <p className="text-sm font-medium text-black">{bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-600">IFSC Code</p>
                    <p className="text-sm font-medium text-black">{bankDetails.ifsc}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-600">Bank Name</p>
                    <p className="text-sm font-medium text-black">{bankDetails.bankName}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-900">No Bank Account</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please add your bank account details to receive payouts
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Timeline */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neutral-600" />
                Timeline
              </CardTitle>
              <CardDescription>Payout history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Payout Initiated</p>
                  <p className="text-xs text-neutral-600">
                    {new Date(payout.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {["AUTHORIZED", "CAPTURED"].includes(payout.status) && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Payment Processing</p>
                    <p className="text-xs text-neutral-600">Awaiting bank transfer</p>
                  </div>
                </div>
              )}

              {["DISBURSED", "COMPLETED"].includes(payout.status) && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Funds Disbursed</p>
                      <p className="text-xs text-neutral-600">
                        {payout.completedAt
                          ? new Date(payout.completedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Processing"}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700">
                      Funds have been transferred to your registered bank account. 
                      Please allow 24-48 hours for the amount to reflect.
                    </p>
                  </div>
                </>
              )}

              {payout.status === "FAILED" && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Payout Failed</p>
                    <p className="text-xs text-neutral-600">Please contact support</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600">
                If you have questions about this payout, please contact our support team.
              </p>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = '/dashboard/admin/compose?method=email'}>
                <Mail className="h-4 w-4" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
