"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package, Calendar, DollarSign, Plus, Search,
  CheckCircle2, Clock, Star, Briefcase, RefreshCw, Zap
} from "lucide-react";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VendorService {
  id: number;
  vendorId: number;
  name: string;
  serviceType: string;
  pricingModel: string;
  baseRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalServices: number;
  activeBookings: number;
  totalEarnings: number;
  pendingRequests: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<VendorService[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "VENDOR") {
      router.push("/dashboard");
      return;
    }
    loadDashboardData();
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load vendor stats from correct backend endpoint
      try {
        const statsResponse = await api.get('/dashboard/vendor/stats');
        setStats(statsResponse.data || {
          totalServices: 0,
          activeBookings: 0,
          totalEarnings: 0,
          pendingRequests: 0,
        });
      } catch (error) {
        console.warn("Could not fetch vendor stats");
        toast.error("Failed to load dashboard stats", {
          description: "Please refresh the page to try again"
        });
        setStats({
          totalServices: 0,
          activeBookings: 0,
          totalEarnings: 0,
          pendingRequests: 0,
        });
      }

      // Load vendor services
      try {
        const servicesResponse = await api.get('/vendors/me/services');
        setServices(servicesResponse.data || []);
      } catch (error) {
        console.warn("Could not fetch services");
        setServices([]);
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
      setStats({
        totalServices: 0,
        activeBookings: 0,
        totalEarnings: 0,
        pendingRequests: 0,
      });
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-silver-800 border-t-silver-400 animate-spin mx-auto mb-4" />
          <p className="text-silver-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30 p-8 max-w-[1600px] mx-auto">
      <motion.div 
        className="space-y-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Premium Business Header */}
        <motion.div 
          className="flex items-center justify-between border-b border-white/5 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-2 py-0 text-[10px] font-bold tracking-wider uppercase">
                Merchant Operations
              </Badge>
              <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Active Commercial Node</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
              Vendor <span className="text-transparent bg-clip-text bg-gradient-to-r from-silver-100 to-silver-400">Terminal</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-medium italic">
              Command center for industrial service provision and financial growth.
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => router.push("/dashboard/vendor/services")}
              className="h-14 px-8 bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] font-black uppercase tracking-widest text-xs"
            >
              <Plus className="h-5 w-5 mr-3" />
              Deploy Service
            </Button>
          </motion.div>
        </motion.div>

        {/* Intelligence Metrics */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { title: "Inventory Status", value: stats?.totalServices || 0, subtext: "Active commercial listings", icon: Package, color: "text-blue-400" },
            { title: "Booking Logic", value: stats?.activeBookings || 0, subtext: "Confirmed deployments", icon: Calendar, color: "text-purple-400" },
            { title: "Net Revenue", value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`, subtext: "Total financial velocity", icon: DollarSign, color: "text-emerald-400" },
            { title: "Action Required", value: stats?.pendingRequests || 0, subtext: "Critical pending handshakes", icon: Clock, color: "text-amber-400" },
          ].map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="bg-zinc-900/40 backdrop-blur-2xl border-white/5 hover:border-white/10 transition-all duration-500 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-silver-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-1">{stat.subtext}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Operational Modules */}
        <motion.div
          className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          {[
            { title: "Catalogue", subtitle: "Listings", icon: Package, href: "/dashboard/vendor/services" },
            { title: "Bookings", subtitle: "Logistics", icon: CheckCircle2, href: "/dashboard/vendor/bookings" },
            { title: "Flow", subtitle: "Chronology", icon: Calendar, href: "/dashboard/vendor/calendar" },
            { title: "Ledger", subtitle: "Financials", icon: DollarSign, href: "/dashboard/vendor/earnings" },
            { title: "Proof", subtitle: "Portfolio", icon: Briefcase, href: "/dashboard/vendor/portfolio" },
            { title: "Compliance", subtitle: "Identity", icon: Star, href: "/dashboard/vendor/kyc" },
          ].map((action, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card
                className="bg-zinc-950 border-white/5 hover:border-white/20 transition-all duration-500 cursor-pointer shadow-xl group overflow-hidden"
                onClick={() => router.push(action.href)}
              >
                <CardContent className="pt-6 relative">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                     <action.icon className="h-20 w-20 text-white" />
                  </div>
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest mb-0.5">{action.title}</p>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase">{action.subtitle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div variants={itemVariants}>
              <Card className="bg-zinc-900/40 backdrop-blur-2xl border-white/5 shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Active Services</CardTitle>
                      <CardDescription className="text-zinc-500 font-medium">
                        Deployment inventory audit
                      </CardDescription>
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                      <Input
                        placeholder="FILTER BY NAME..."
                        className="pl-10 w-64 bg-black/40 border-white/5 focus:border-white/20 text-xs font-bold tracking-widest placeholder:text-zinc-700"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {services.length === 0 ? (
                    <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
                      <Package className="h-16 w-16 text-zinc-800 mx-auto mb-6" />
                      <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">No Active Nodes</h3>
                      <p className="text-zinc-500 text-sm mb-8 font-medium italic">
                        Initialize your commercial presence by deploying your first service.
                      </p>
                      <Button 
                        onClick={() => router.push("/dashboard/vendor/services")}
                        className="bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-xs px-8 h-12"
                      >
                        <Plus className="h-5 w-5 mr-3" />
                        Init Database
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-5 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-500 group"
                        >
                          <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-white font-black text-xl shadow-xl border border-white/5 group-hover:scale-105 transition-transform uppercase">
                              {service.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-black text-white text-lg tracking-tight uppercase">{service.name}</h3>
                              <div className="flex items-center gap-6 text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1.5">
                                <span className="flex items-center gap-2">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  {service.serviceType}
                                </span>
                                <span className="flex items-center gap-2 text-emerald-500">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  ₹{service.baseRate.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              service.isActive 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
                            )}>
                              {service.isActive ? "OPERATIONAL" : "OFFLINE"}
                            </Badge>
                            <Button
                              variant="ghost"
                              className="text-white hover:bg-white/10 font-bold border border-white/5 rounded-xl px-5 h-10"
                              onClick={() => router.push(`/dashboard/vendor/services?id=${service.id}`)}
                            >
                              CONFIGURE
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Intelligence Column */}
          <div className="space-y-8">
            <motion.div variants={itemVariants}>
              <Card className="bg-zinc-900/40 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
                </div>
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest">Growth Tactics</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {[
                      { icon: Star, title: "Dossier Completion", desc: "Industrial detail increases conversion metrics. Deploy high-fidelity visual assets." },
                      { icon: Clock, title: "Latency Reduction", desc: "Fast handshake response improves visibility algorithms and user trust indices." },
                    ].map((tip, index) => (
                      <div key={index} className="flex items-start gap-4 p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all duration-500">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:scale-110">
                          <tip.icon className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="font-black text-white text-[11px] uppercase tracking-widest mb-1">{tip.title}</p>
                          <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">{tip.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>

  );
}
