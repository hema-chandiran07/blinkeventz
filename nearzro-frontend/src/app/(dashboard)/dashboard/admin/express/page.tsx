"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, ArrowLeft, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ExpressRequest {
  id: number;
  userId: number;
  planType: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  expressFee: number;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  Event?: {
    id: number;
    title: string;
    eventType: string;
    date: string;
    guestCount: number;
  };
}

export default function AdminExpressPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ExpressRequest[]>([]);

  useEffect(() => {
    loadExpressRequests();
  }, []);

  const loadExpressRequests = async () => {
    try {
      setLoading(true);
      // Fetch from backend - admin endpoint for all express requests
      const response = await api.get("/express");
      const data = response.data || [];

      // If no real data, show empty state
      setRequests(data);
    } catch (error: any) {
      console.error("Failed to load express requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: number) => {
    try {
      // Update express request status to COMPLETED
      await api.patch(`/express/${id}`, { status: "COMPLETED" });
      toast.success(`Express request #${id} processed successfully!`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      console.error("Process error:", error);
      toast.error("Failed to process request");
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;

    try {
      // Update express request status to CANCELLED with reason
      await api.patch(`/express/${id}`, { status: "CANCELLED", rejectionReason: reason });
      toast.success(`Express request #${id} rejected`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error("Failed to reject request");
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "EXPIRED";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-black">Express 50</h1>
              <p className="text-neutral-600">Manage time-sensitive express requests.</p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">Loading express requests...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
             <Link href="/dashboard/admin">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
             </Link>
            <div>
            <h1 className="text-3xl font-bold text-black">Express 50</h1>
            <p className="text-neutral-600">Manage time-sensitive express requests.</p>
            </div>
        </div>
        <Button variant="outline" className="border-black" onClick={loadExpressRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
            <h3 className="text-lg font-bold text-black mb-2">All Caught Up!</h3>
            <p className="text-neutral-600">No express requests to process</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
             <Card key={request.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-black">
                                  Express Request #{request.id}
                                </h3>
                                <Badge className={
                                  request.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                                  request.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                                  "bg-neutral-100 text-neutral-700"
                                }>
                                  {request.status}
                                </Badge>
                            </div>
                            <p className="text-neutral-700">
                              {request.Event?.title || request.planType} - {request.Event?.eventType || "Event"}
                            </p>
                            {request.user && (
                              <p className="text-sm text-neutral-600">
                                Customer: {request.user.name} ({request.user.email})
                              </p>
                            )}
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="text-right">
                                <div className="text-sm text-neutral-600 mb-1">Express Fee</div>
                                <div className="text-xl font-bold text-black">
                                  {formatCurrency(request.expressFee || 0)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-neutral-600 mb-1">Time Remaining</div>
                                <div className={`flex items-center text-xl font-bold font-mono ${
                                  request.status === "EXPIRED" ? "text-neutral-400" : "text-red-600"
                                }`}>
                                    <Timer className="h-5 w-5 mr-2" />
                                    {formatTimeRemaining(request.expiresAt)}
                                </div>
                            </div>
                            {request.status === "PENDING" && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  className="bg-emerald-600 hover:bg-emerald-700" 
                                  onClick={() => handleProcess(request.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Process
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="border-red-300 text-red-600 hover:bg-red-50" 
                                  onClick={() => handleReject(request.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Reject
                                </Button>
                              </div>
                            )}
                        </div>
                    </div>
                </CardContent>
             </Card>
          ))}
        </div>
      )}
    </div>
  );
}
