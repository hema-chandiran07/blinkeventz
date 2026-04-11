"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle,
  Calendar, Users, Download, Loader2, Info, IndianRupee,
  Percent, Banknote
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface VendorEarning {
  id: number;
  bookingId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventName: string;
  eventType: string;
  date: string;
  timeSlot: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  platformFee: number;
  platformFeePercentage: number;
  netEarnings: number;
  payoutStatus: "PENDING" | "PROCESSING" | "APPROVED" | "COMPLETED" | "REJECTED";
  createdAt: string;
  completedAt?: string;
  payoutDate?: string;
  user: User;
}

// ==================== Constants ====================
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Morning (6:00 AM - 12:00 PM)",
  evening: "Evening (4:00 PM - 10:00 PM)",
  full_day: "Full Day (6:00 AM - 12:00 AM)",
  night: "Night (8:00 PM - 2:00 AM)",
};

const STATUS_BADGE_CONFIG: Record<string, { className: string; label: string; icon: any; description: string }> = {
  COMPLETED: { 
    className: "bg-green-900/50 text-green-300 border-green-700", 
    label: "Completed", 
    icon: CheckCircle2,
    description: "Service completed, earnings finalized"
  },
  CONFIRMED: { 
    className: "bg-blue-900/50 text-blue-300 border-blue-700", 
    label: "Confirmed", 
    icon: CheckCircle2,
    description: "Booking confirmed, awaiting service"
  },
  PENDING: { 
    className: "bg-amber-900/50 text-amber-300 border-amber-700", 
    label: "Pending", 
    icon: Clock,
    description: "Awaiting confirmation"
  },
  CANCELLED: { 
    className: "bg-red-900/50 text-red-300 border-red-700", 
    label: "Cancelled", 
    icon: AlertCircle,
    description: "Booking cancelled"
  },
};

const PAYOUT_STATUS_BADGE_CONFIG: Record<string, { className: string; label: string; icon?: any; description: string }> = {
  COMPLETED: { 
    className: "bg-green-900/50 text-green-300 border-green-700", 
    label: "Paid Out", 
    icon: CheckCircle2,
    description: "Funds transferred to your bank account"
  },
  APPROVED: { 
    className: "bg-emerald-900/50 text-emerald-300 border-emerald-700", 
    label: "Ready for Payout", 
    icon: CheckCircle2,
    description: "Approved and ready for transfer"
  },
  PROCESSING: { 
    className: "bg-indigo-900/50 text-indigo-300 border-indigo-700", 
    label: "Processing", 
    icon: Clock,
    description: "Payout is being processed (1-3 business days)"
  },
  PENDING: { 
    className: "bg-amber-900/50 text-amber-300 border-amber-700", 
    label: "Pending", 
    icon: Clock,
    description: "Awaiting payout approval"
  },
  REJECTED: { 
    className: "bg-rose-900/50 text-rose-300 border-rose-700", 
    label: "Rejected", 
    icon: AlertCircle,
    description: "Payout rejected - please contact support"
  },
};

const PLATFORM_FEE_PERCENTAGE = 5; // 5% platform fee for vendors

// ==================== Main Component ====================
export default function VendorEarningDetailPage() {
  const params = useParams();
  const router = useRouter();
  const earningId = params.id as string;

  const [earning, setEarning] = useState<VendorEarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<any>(null);

  useEffect(() => {
    if (earningId) {
      loadEarning();
      loadBankDetails();
    }
  }, [earningId]);

  const loadEarning = async () => {
    try {
      setLoading(true);
      // Fetch the specific booking directly by ID
      const response = await api.get(`/booking/${earningId}`);
      const foundBooking = response.data;

      if (!foundBooking) {
        toast.error("Earning record not found");
        router.push("/dashboard/vendor/earnings");
        return;
      }

      // Transform to earning format
      const totalAmount = foundBooking.totalAmount || 0;
      const platformFeePercentage = foundBooking.platformFeePercentage || 5;
      const platformFee = foundBooking.platformFee || Math.round(totalAmount * (platformFeePercentage / 100));
      const netEarnings = foundBooking.netEarnings || (totalAmount - platformFee);

      const payoutStatus = determinePayoutStatus(foundBooking.status, foundBooking.completedAt);

      const transformedEarning: VendorEarning = {
        id: foundBooking.id,
        bookingId: foundBooking.id,
        customerName: foundBooking.user?.name || 'Unknown Customer',
        customerEmail: foundBooking.user?.email || '',
        customerPhone: foundBooking.user?.phone || '',
        eventName: foundBooking.slot?.eventTitle || foundBooking.slot?.name || 'Service Booking',
        eventType: 'VENDOR_SERVICE',
        date: foundBooking.slot?.date || '',
        timeSlot: foundBooking.slot?.timeSlot || 'full_day',
        status: (foundBooking.status || 'PENDING').toUpperCase() as any,
        totalAmount,
        platformFee,
        platformFeePercentage,
        netEarnings,
        payoutStatus,
        createdAt: foundBooking.createdAt,
        completedAt: foundBooking.completedAt,
        user: foundBooking.user,
      };

      setEarning(transformedEarning);
    } catch (error: any) {
      console.error("Failed to load earning:", error);
      toast.error(error?.response?.data?.message || "Failed to load earning details");
    } finally {
      setLoading(false);
    }
  };

  const loadBankDetails = async () => {
    try {
      const response = await api.get("/bank-account/vendor");
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

  const determinePayoutStatus = (bookingStatus: string, completedAt?: string): VendorEarning['payoutStatus'] => {
    const status = (bookingStatus || 'PENDING').toUpperCase();

    if (status === 'COMPLETED' && completedAt) {
      const completedDate = new Date(completedAt);
      const now = new Date();
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceCompletion >= 3) {
        return 'APPROVED';
      }
      return 'PROCESSING';
    }

    if (status === 'CANCELLED') return 'REJECTED';
    if (status === 'CONFIRMED') return 'PENDING';
    return 'PENDING';
  };

  const handleExportReceipt = () => {
    if (!earning) return;

    const receiptContent = `
EARNING RECEIPT
===============

Booking ID: #${earning.id}
Event: ${earning.eventName}
Date: ${new Date(earning.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
Status: ${STATUS_BADGE_CONFIG[earning.status]?.label || earning.status}
Payout Status: ${PAYOUT_STATUS_BADGE_CONFIG[earning.payoutStatus]?.label || earning.payoutStatus}

AMOUNT BREAKDOWN
----------------
Gross Amount: ₹${earning.totalAmount.toLocaleString("en-IN")}
Platform Fee (${earning.platformFeePercentage}%): ₹${earning.platformFee.toLocaleString("en-IN")}
Net Earnings: ₹${earning.netEarnings.toLocaleString("en-IN")}

CUSTOMER
--------
Name: ${earning.customerName}
Email: ${earning.customerEmail}
Phone: ${earning.customerPhone || 'N/A'}

Thank you for using NearZro!
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `earning-receipt-${earning.id}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success("Receipt downloaded");
  };

  const getStatusBadge = (status: string, type: 'booking' | 'payout' = 'booking') => {
    const config = type === 'booking' ? STATUS_BADGE_CONFIG[status] : PAYOUT_STATUS_BADGE_CONFIG[status];
    if (!config) return <Badge variant="outline">{status}</Badge>;

    const Icon = config.icon || Clock;
    return (
      <Badge className={cn("flex items-center gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-silver-400" />
          <p className="text-silver-400">Loading earning details...</p>
        </div>
      </div>
    );
  }

  if (!earning) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-silver-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Earning Not Found</h2>
          <p className="text-silver-400 mb-4">The earning record you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/dashboard/vendor/earnings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Earnings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/vendor/earnings")} className="gap-2 text-white hover:bg-silver-800">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Earning Details</h1>
            <p className="text-silver-400">Booking ID: #{earning.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(earning.status, 'booking')}
          {getStatusBadge(earning.payoutStatus, 'payout')}
          <Button variant="outline" onClick={handleExportReceipt} className="gap-2 border-silver-700 text-white hover:bg-silver-800">
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
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <IndianRupee className="h-5 w-5 text-silver-400" />
                Amount Breakdown
              </CardTitle>
              <CardDescription className="text-silver-400">Detailed breakdown of this earning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-silver-900/50 rounded-lg border border-silver-700">
                  <div>
                    <p className="text-sm font-medium text-silver-300">Gross Amount</p>
                    <p className="text-xs text-silver-400">Total booking value</p>
                  </div>
                  <p className="text-2xl font-bold text-white">₹{earning.totalAmount.toLocaleString("en-IN")}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-900/30 rounded-lg border border-red-900">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-red-300">Platform Fee</p>
                      <Badge variant="outline" className="text-xs border-red-700 text-red-400">
                        <Percent className="h-3 w-3 mr-1" />
                        {earning.platformFeePercentage}%
                      </Badge>
                    </div>
                    <p className="text-xs text-red-400">Platform service charge</p>
                  </div>
                  <p className="text-xl font-semibold text-red-400">- ₹{earning.platformFee.toLocaleString("en-IN")}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-lg border-2 border-green-700">
                  <div>
                    <p className="text-sm font-medium text-green-300">Net Earnings</p>
                    <p className="text-xs text-green-400">Amount you receive</p>
                  </div>
                  <p className="text-3xl font-bold text-green-400">₹{earning.netEarnings.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Fee Calculation Info */}
              <div className="p-4 bg-silver-900/30 rounded-lg border border-silver-700">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-silver-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-silver-300">How Platform Fees Are Calculated</p>
                    <p className="text-xs text-silver-400 mt-1">
                      A {earning.platformFeePercentage}% platform fee is deducted from each booking to cover payment processing,
                      platform maintenance, customer support, and marketing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-silver-400" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-silver-400">Event Name</p>
                  <p className="text-white font-medium">{earning.eventName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-silver-400">Event Type</p>
                  <p className="text-white font-medium">{earning.eventType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-silver-400">Date</p>
                  <p className="text-white font-medium">
                    {new Date(earning.date).toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-silver-400">Time Slot</p>
                  <p className="text-white font-medium">{TIME_SLOT_LABELS[earning.timeSlot] || earning.timeSlot}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-silver-400" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-silver-400">Name</p>
                  <p className="text-white font-medium">{earning.customerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-silver-400">Email</p>
                  <p className="text-white font-medium">{earning.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-silver-400">Phone</p>
                  <p className="text-white font-medium">{earning.customerPhone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-silver-400">Customer ID</p>
                  <p className="text-white font-medium">#{earning.user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-silver-400" />
                Earning Timeline
              </CardTitle>
              <CardDescription className="text-silver-400">History of this earning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-silver-800 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-silver-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Booking Created</p>
                  <p className="text-xs text-silver-400">
                    {new Date(earning.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {earning.completedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-900/50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Service Completed</p>
                    <p className="text-xs text-silver-400">
                      {new Date(earning.completedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {earning.payoutStatus === 'APPROVED' && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Payout Approved</p>
                    <p className="text-xs text-silver-400">Ready for bank transfer</p>
                  </div>
                </div>
              )}
              {earning.payoutStatus === 'COMPLETED' && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-900/50 flex items-center justify-center flex-shrink-0">
                    <Banknote className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Payout Completed</p>
                    <p className="text-xs text-silver-400">Funds transferred to your bank account</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="text-white">Payout Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-silver-900/50 border border-silver-700">
                {getStatusBadge(earning.payoutStatus, 'payout')}
                <p className="text-sm text-silver-400 mt-3">
                  {PAYOUT_STATUS_BADGE_CONFIG[earning.payoutStatus]?.description || "Status information not available"}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-silver-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-silver-400">Booked On</span>
                  <span className="text-sm font-medium text-white">
                    {new Date(earning.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {earning.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-silver-400">Completed</span>
                    <span className="text-sm font-medium text-white">
                      {new Date(earning.completedAt).toLocaleDateString("en-IN", {
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
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Banknote className="h-5 w-5 text-silver-400" />
                Bank Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankDetails ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-silver-400">Account Holder</p>
                    <p className="text-white font-medium">{bankDetails.accountHolder}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-silver-400">Account Number</p>
                    <p className="text-white font-medium">{bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-silver-400">IFSC Code</p>
                    <p className="text-white font-medium">{bankDetails.ifsc}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-silver-400">Bank Name</p>
                    <p className="text-white font-medium">{bankDetails.bankName}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-300">No Bank Account</p>
                      <p className="text-sm text-amber-400 mt-1">
                        Please add your bank account details to receive payouts
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Info */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="text-white">Payout Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-silver-900/50 border border-silver-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-silver-400" />
                  <p className="text-sm font-medium text-silver-300">Processing Time</p>
                </div>
                <p className="text-xs text-silver-400">
                  Payouts are processed within 3 business days after service completion
                </p>
              </div>
              <div className="p-3 rounded-lg bg-silver-900/50 border border-silver-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-silver-400" />
                  <p className="text-sm font-medium text-silver-300">Holding Period</p>
                </div>
                <p className="text-xs text-silver-400">
                  3-day holding period ensures customer satisfaction before payout
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="text-white">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-silver-400">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-sm">Gross Amount</span>
                </div>
                <span className="text-white font-semibold">₹{earning.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-silver-400">
                  <Percent className="h-4 w-4" />
                  <span className="text-sm">Platform Fee</span>
                </div>
                <span className="text-red-400 font-semibold">₹{earning.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-silver-700">
                <div className="flex items-center gap-2 text-green-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Net Earnings</span>
                </div>
                <span className="text-green-400 font-bold">₹{earning.netEarnings.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
