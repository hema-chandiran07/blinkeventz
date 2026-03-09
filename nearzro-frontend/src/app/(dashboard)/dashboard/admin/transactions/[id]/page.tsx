"use client";

import { useState } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CreditCard, DollarSign, TrendingUp, TrendingDown, Calendar,
  Search, Filter, Download, Eye, ArrowLeft, CheckCircle2,
  Clock, XCircle, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

const MOCK_TRANSACTIONS = [
  { id: 1, type: "Payment", customer: "Rajesh Kumar", event: "Priya & Karthik Wedding", amount: 1500000, status: "Success", date: "2024-03-15", method: "Razorpay" },
  { id: 2, type: "Payment", customer: "Anita Sharma", event: "TechCorp Annual Meet", amount: 750000, status: "Pending", date: "2024-03-14", method: "UPI" },
  { id: 3, type: "Refund", customer: "Mohammed Rizwan", event: "Fatima's Engagement", amount: 50000, status: "Processing", date: "2024-03-13", method: "Bank Transfer" },
  { id: 4, type: "Payment", customer: "Lakshmi Devi", event: "Arjun's Birthday Bash", amount: 150000, status: "Success", date: "2024-03-12", method: "Credit Card" },
  { id: 5, type: "Payment", customer: "Global Solutions Pvt Ltd", event: "Global Solutions Conference", amount: 2500000, status: "Success", date: "2024-03-11", method: "Net Banking" },
  { id: 6, type: "Failed", customer: "John David", event: "Corporate Retreat", amount: 350000, status: "Failed", date: "2024-03-10", method: "Debit Card" },
];

const STATUS_COLORS: Record<string, string> = {
  Success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Processing: "bg-blue-50 text-blue-700 border-blue-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
};

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const unwrappedParams = React.use(params);
  const transaction = MOCK_TRANSACTIONS.find(t => t.id === parseInt(unwrappedParams.id));

  const stats = {
    totalRevenue: MOCK_TRANSACTIONS.filter(t => t.status === "Success").reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: MOCK_TRANSACTIONS.filter(t => t.status === "Pending").reduce((sum, t) => sum + t.amount, 0),
    refundAmount: MOCK_TRANSACTIONS.filter(t => t.type === "Refund").reduce((sum, t) => sum + t.amount, 0),
    successRate: 83.3,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-black">Transaction Details</h1>
          <p className="text-neutral-600">Transaction ID: #{transaction?.id || unwrappedParams.id}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Refunds</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.refundAmount)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-neutral-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Success Rate</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.successRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-900">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details */}
      {transaction && (
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Transaction Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Transaction ID</p>
                  <p className="text-lg font-bold text-black">#{transaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Customer Name</p>
                  <p className="text-lg font-bold text-black">{transaction.customer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Event</p>
                  <p className="text-lg font-bold text-black">{transaction.event}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Amount</p>
                  <p className="text-2xl font-bold text-black">{formatCurrency(transaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Status</p>
                  <Badge className={`${STATUS_COLORS[transaction.status]} border mt-1`}>
                    {transaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Payment Method</p>
                  <p className="text-lg font-bold text-black">{transaction.method}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Calendar className="h-4 w-4" />
                <span>Transaction Date: {new Date(transaction.date).toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="border-black">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
              <Button variant="outline" className="border-black">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              {transaction.status === "Pending" && (
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Payment
                </Button>
              )}
              {transaction.status === "Failed" && (
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Initiate Refund
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Transactions Table */}
      <Card className="border-2 border-black">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-black">All Transactions</CardTitle>
            <Button variant="outline" size="sm" className="border-black">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-neutral-300"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Processing">Processing</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Event</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Method</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {MOCK_TRANSACTIONS.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-black">#{t.id}</td>
                    <td className="py-3 px-4 text-sm text-black">{t.customer}</td>
                    <td className="py-3 px-4 text-sm text-black">{t.event}</td>
                    <td className="py-3 px-4 text-sm font-bold text-black">{formatCurrency(t.amount)}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${STATUS_COLORS[t.status]} border text-xs`}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-black">{t.method}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/transactions/${t.id}`)}
                      >
                        <Eye className="h-4 w-4 text-black" />
                      </Button>
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
