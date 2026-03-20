"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, Calendar, DollarSign, CheckCircle2,
  Clock, AlertCircle, Loader2, CreditCard
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface TransactionDetail {
  id: number;
  userId: number;
  cartId: number;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  signature?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
  };
  cart?: {
    items?: any[];
  };
  Event?: {
    id: number;
    title?: string;
    date: string;
    eventType: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  AUTHORIZED: "bg-blue-100 text-blue-700 border-blue-200",
  SUCCESS: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-purple-100 text-purple-700 border-purple-200",
};

const PROVIDER_LABELS: Record<string, string> = {
  RAZORPAY: "Razorpay",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
};

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [params.id]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const response = await api.get("/payments");
      const payments = response.data.payments || response.data || [];
      const found = payments.find((p: any) => p.id === parseInt(params.id as string));
      setTransaction(found || null);
    } catch (error: any) {
      console.error("Failed to load transaction:", error);
      toast.error("Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleDownloadReceipt = () => {
    const receiptData = `
PAYMENT RECEIPT
===============

Transaction ID: #${transaction?.id}
Date: ${transaction ? new Date(transaction.createdAt).toLocaleString() : 'N/A'}
Status: ${transaction?.status}

Customer Details:
- Name: ${transaction?.user?.name || 'N/A'}
- Email: ${transaction?.user?.email || 'N/A'}

Payment Details:
- Amount: ${transaction ? formatCurrency(transaction.amount) : 'N/A'}
- Currency: ${transaction?.currency || 'N/A'}
- Provider: ${transaction ? PROVIDER_LABELS[transaction.provider] || transaction.provider : 'N/A'}
- Order ID: ${transaction?.providerOrderId || 'N/A'}
- Payment ID: ${transaction?.providerPaymentId || 'Pending'}

${transaction?.Event ? `
Event Details:
- Event: ${transaction.Event.title || 'N/A'}
- Date: ${new Date(transaction.Event.date).toLocaleDateString()}
- Type: ${transaction.Event.eventType}
` : ''}

Thank you for your payment!
    `.trim();

    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-receipt-${transaction?.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-neutral-600">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-bold text-black mb-2">Transaction Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/transactions")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Transaction #{transaction.id}</h1>
            <p className="text-neutral-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-black" onClick={handleDownloadReceipt}>
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-black">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Status</p>
                <p className="text-2xl font-bold text-black mt-1">{transaction.status}</p>
              </div>
              <div className="p-3 rounded-full bg-black">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Amount</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(transaction.amount)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Provider</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{PROVIDER_LABELS[transaction.provider] || transaction.provider}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Currency</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{transaction.currency}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Transaction ID</p>
              <p className="font-medium text-black">#{transaction.id}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Order ID</p>
              <p className="font-medium text-black font-mono text-sm">{transaction.providerOrderId}</p>
            </div>
            {transaction.providerPaymentId && (
              <div>
                <p className="text-xs text-neutral-600">Payment ID</p>
                <p className="font-medium text-black font-mono text-sm">{transaction.providerPaymentId}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-600">Amount</p>
              <p className="font-medium text-black text-lg">{formatCurrency(transaction.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Currency</p>
              <p className="font-medium text-black">{transaction.currency}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Payment Gateway</p>
              <p className="font-medium text-black">{PROVIDER_LABELS[transaction.provider] || transaction.provider}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Customer Name</p>
              <p className="font-medium text-black">{transaction.user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Email Address</p>
              <p className="font-medium text-black">{transaction.user?.email || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {transaction.Event && (
          <Card className="border-2 border-black md:col-span-2">
            <CardHeader>
              <CardTitle className="text-black">Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-neutral-600">Event</p>
                  <p className="font-medium text-black">{transaction.Event.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Event Date</p>
                  <p className="font-medium text-black">{new Date(transaction.Event.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Event Type</p>
                  <p className="font-medium text-black">{transaction.Event.eventType}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-black md:col-span-2">
          <CardHeader>
            <CardTitle className="text-black">Transaction Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-black">Transaction Created</p>
                  <p className="text-sm text-neutral-600">{new Date(transaction.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              {transaction.providerPaymentId && (
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-black">Payment Completed</p>
                    <p className="text-sm text-neutral-600">{new Date(transaction.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Badge */}
      <Card className="border-2 border-black">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 mb-2">Payment Status</p>
              <Badge className={STATUS_COLORS[transaction.status]}>
                {transaction.status}
              </Badge>
            </div>
            <div className="text-sm text-neutral-600">
              Last Updated: {new Date(transaction.updatedAt).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
