"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, ArrowLeft, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Area Tier Helper (Matching backend AREA_TIER_MAP)
const getAreaTier = (area: string = ""): string => {
  const tier1 = ["Anna Nagar", "Nungambakkam", "T. Nagar", "Alwarpet", "Mylapore", "Adyar", "Besant Nagar", "Thiruvanmiyur", "ECR", "Velachery", "Kilpauk", "RA Puram", "Kotturpuram"];
  const tier2 = ["Porur", "Mogappair", "Ambattur", "Medavakkam", "Madipakkam", "Pallikaranai", "Chromepet", "Tambaram", "Pallavaram", "Koyambedu"];
  
  if (tier1.some(a => area && area.includes(a))) return "Tier 1 (Prime)";
  if (tier2.some(a => area && area.includes(a))) return "Tier 2 (Secondary)";
  return "Tier 3/4 (Standard)";
};

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
    area: string;
  };
}

export default function AdminExpressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ExpressRequest[]>([]);

  useEffect(() => {
    loadExpressRequests();
  }, []);

  const loadExpressRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/express");
      const data = response.data || [];
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
      await api.patch(`/express/${id}`, { status: "CANCELLED", rejectionReason: reason });
      toast.success(`Express request #${id} rejected`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error("Failed to reject request");
    }
  };

  const getSLAPercentage = (startedAt: string, expiresAt: string) => {
    const start = new Date(startedAt).getTime();
    const end = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    
    if (now >= end || isNaN(start) || isNaN(end)) return 100;
    const total = end - start;
    const elapsed = now - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getSLAUrgency = (expiresAt: string) => {
    const now = new Date().getTime();
    const end = new Date(expiresAt).getTime();
    if (isNaN(end)) return "normal";
    const diff = end - now;
    
    if (diff < 15 * 60 * 1000) return "critical"; // < 15 mins
    if (diff < 30 * 60 * 1000) return "warning";  // < 30 mins
    return "normal";
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0 || isNaN(expires.getTime())) return "EXPIRED";
    
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
      <div className="space-y-8 p-6 bg-gradient-to-br from-white via-silver-50 to-white min-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.back()} 
                className="hover:bg-white shadow-sm rounded-full transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-extrabold text-black tracking-tight">Express <span className="text-silver-600">50</span></h1>
              <p className="text-neutral-500 font-medium">Loading high-priority requests...</p>
            </div>
          </div>
        </div>
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md">
          <CardContent className="py-24 text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
            <p className="text-neutral-600 font-bold uppercase tracking-widest text-xs">Synchronizing Buffer</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-[#0a0a0b] text-white selection:bg-red-500/30 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Express <span className="text-red-500">50</span> <span className="text-zinc-500 text-2xl font-light ml-2">Monitor</span>
            </h1>
            <p className="text-zinc-500 font-medium">High-velocity priority synchronization dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-neutral-200 hover:bg-white shadow-sm transition-all" 
            onClick={loadExpressRequests}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {requests.length === 0 ? (
        <Card className="border-zinc-800 shadow-2xl bg-zinc-900/20 backdrop-blur-xl border-dashed">
          <CardContent className="py-24 text-center">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit mx-auto mb-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Queue Optimized</h3>
            <p className="text-zinc-500 font-medium">All high-priority protocols successfully synchronized</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map((request, i) => {
            const urgency = getSLAUrgency(request.expiresAt);
            const slaPercent = getSLAPercentage(request.startedAt, request.expiresAt);
            const areaLabel = getAreaTier(request.Event?.area);

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-zinc-800 shadow-2xl bg-zinc-950/50 backdrop-blur-xl overflow-hidden relative group">
                  <div className={cn(
                    "absolute left-0 top-0 w-1.5 h-full transition-all group-hover:w-2",
                    urgency === "critical" ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : urgency === "warning" ? "bg-amber-500" : "bg-blue-600"
                  )} />
                  
                  {/* Progress Bar Header */}
                  <div className="h-1 bg-neutral-100 w-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${slaPercent}%` }}
                      className={cn(
                        "h-full transition-all duration-1000",
                        urgency === "critical" ? "bg-red-600" : "bg-black"
                      )}
                    />
                  </div>

                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-black tracking-tighter uppercase italic">Express 50</span>
                          <h3 className="font-extrabold text-lg text-black">
                            Request #{request.id}
                          </h3>
                          <Badge className={cn(
                            "text-[10px] font-bold py-0.5",
                            request.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-400"
                          )}>
                            {request.status}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="font-black text-white text-xl tracking-tight leading-none">{request.Event?.title || "Operational Node"}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 font-bold uppercase tracking-tighter bg-zinc-900/50">{request.Event?.eventType}</Badge>
                            <span className="text-zinc-800 text-xs">•</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{areaLabel}</span>
                            <span className="text-zinc-800 text-xs">•</span>
                            <span className="text-xs font-black text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">{request.Event?.guestCount} UNITS</span>
                          </div>
                        </div>

                        {request.user && (
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50 max-w-fit font-bold uppercase tracking-tighter">
                            <span className="text-zinc-300">{request.user.name}</span>
                            <span className="text-zinc-800">|</span>
                            <span>{request.user.email}</span>
                            <span className="text-zinc-800">|</span>
                            <span>{request.user.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-8 lg:gap-12">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-black text-neutral-400">Time Remaining</p>
                          <div className={cn(
                            "flex items-center text-3xl font-black font-mono",
                            urgency === "critical" ? "text-red-600 animate-pulse" : urgency === "warning" ? "text-amber-600" : "text-black"
                          )}>
                            <Timer className="h-6 w-6 mr-2" />
                            {formatTimeRemaining(request.expiresAt)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-black text-neutral-400">Processing Fee</p>
                          <p className="text-2xl font-black text-emerald-600">{formatCurrency(request.expressFee || 0)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            className="bg-white hover:bg-zinc-200 text-black font-black h-12 px-6 shadow-xl shadow-white/5 transition-all rounded-xl"
                            onClick={() => handleProcess(request.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Commit & Dispatch
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-neutral-200 text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 h-12 px-4 shadow-sm transition-all"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
