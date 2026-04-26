"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building, Calendar, DollarSign, Plus, Search,
  CheckCircle2, Clock, Star, MapPin, BarChart3
} from "lucide-react";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Venue {
  id: number;
  name: string;
  type: string;
  city: string;
  area: string;
  capacity: number;
  basePriceEvening: number;
  status: "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELISTED";
  createdAt: string;
}

interface DashboardStats {
  totalVenues: number;
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

export default function VenueOwnerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "VENUE_OWNER") {
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

      try {
        const venuesResponse = await api.get('/venues/me');
        const data = venuesResponse.data;
        // Handle both array response and wrapped response
        setVenues(Array.isArray(data) ? data : (data?.venues || data?.data || []));
      } catch (error) {
        console.warn("Could not fetch venues");
        setVenues([]);
      }

      try {
        const statsResponse = await api.get('/dashboard/venue/stats');
        setStats(statsResponse.data || {
          totalVenues: 0,
          activeBookings: 0,
          totalEarnings: 0,
          pendingRequests: 0,
        });
      } catch (error) {
        console.warn("Could not fetch stats");
      }
    } catch {
      // Set default stats on error
      setStats({
        totalVenues: 0,
        activeBookings: 0,
        totalEarnings: 0,
        pendingRequests: 0,
      });
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
        {/* Elite Venue Header */}
        <motion.div
          className="flex items-center justify-between border-b border-white/5 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0 text-[10px] font-bold tracking-wider uppercase">
                Asset Management
              </Badge>
              <div className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Real-Time Capacity Node</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
              Venue <span className="text-transparent bg-clip-text bg-gradient-to-r from-silver-100 to-silver-400">Control</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-medium italic">
              Centralized intelligence for property optimization and event logistics.
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => router.push("/dashboard/venue/details?new=true")}
              className="h-14 px-8 bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] font-black uppercase tracking-widest text-xs"
            >
              <Plus className="h-5 w-5 mr-3" />
              Register Property
            </Button>
          </motion.div>
        </motion.div>

        {/* Operational Metrics */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { title: "Property Portfolio", value: stats?.totalVenues || 0, subtext: "Active asset listings", icon: Building, color: "text-blue-400" },
            { title: "Occupancy Logic", value: stats?.activeBookings || 0, subtext: "Scheduled operations", icon: Calendar, color: "text-purple-400" },
            { title: "Gross Yield", value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`, subtext: "Total financial velocity", icon: DollarSign, color: "text-emerald-400" },
            { title: "Protocol Queue", value: stats?.pendingRequests || 0, subtext: "Pending approvals", icon: Clock, color: "text-amber-400" },
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

        {/* Quick Access Modules */}
        <motion.div
          className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          {[
            { title: "Assets", subtitle: "Management", icon: Building, href: "/dashboard/venue/details" },
            { title: "Bookings", subtitle: "Logistics", icon: CheckCircle2, href: "/dashboard/venue/bookings" },
            { title: "Schedule", subtitle: "Timeline", icon: Calendar, href: "/dashboard/venue/calendar" },
            { title: "Analytics", subtitle: "Performance", icon: BarChart3, href: "/dashboard/venue/analytics" },
            { title: "Yields", subtitle: "Payouts", icon: DollarSign, href: "/dashboard/venue/payouts" },
            { title: "Protocol", subtitle: "Compliance", icon: Star, href: "/dashboard/venue/kyc" },
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

        {/* Portfolio Intelligence */}
        <motion.div variants={itemVariants} id="venues">
          <Card className="bg-zinc-900/40 backdrop-blur-2xl border-white/5 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Prime Assets</CardTitle>
                  <CardDescription className="text-zinc-500 font-medium">
                    Property portfolio status monitor
                  </CardDescription>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                  <Input
                    placeholder="SCAN PORTFOLIO..."
                    className="pl-10 w-64 bg-black/40 border-white/5 focus:border-white/20 text-xs font-bold tracking-widest placeholder:text-zinc-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {venues.length === 0 ? (
                <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
                  <Building className="h-16 w-16 text-zinc-800 mx-auto mb-6" />
                  <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Portfolio Empty</h3>
                  <p className="text-zinc-500 text-sm mb-8 font-medium italic">
                    Begin asset tokenization by registering your first physical location.
                  </p>
                  <Button 
                    onClick={() => router.push("/dashboard/venue/details")} 
                    className="bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-xs px-8 h-12"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    Deploy Asset
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {venues.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map((venue) => (
                    <div
                      key={venue.id}
                      className="flex items-center justify-between p-5 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-500 group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-white font-black text-xl shadow-xl border border-white/5 group-hover:scale-105 transition-transform uppercase">
                          {venue.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-black text-white text-lg tracking-tight uppercase">{venue.name}</h3>
                          <div className="flex items-center gap-6 text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1.5">
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {venue.area}, {venue.city}
                            </span>
                            <span className="flex items-center gap-2 text-emerald-500">
                              <DollarSign className="h-3.5 w-3.5" />
                              ₹{venue.basePriceEvening.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                          venue.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          venue.status === "PENDING_APPROVAL" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-zinc-800 text-zinc-500 border-zinc-700"
                        )}>
                          {venue.status.replace("_", " ")}
                        </Badge>
                        <Button
                          variant="ghost"
                          className="text-white hover:bg-white/10 font-bold border border-white/5 rounded-xl px-5 h-10"
                          onClick={() => router.push(`/dashboard/venue/details?id=${venue.id}`)}
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

        {/* Growth Logic */}
        <motion.div variants={itemVariants}>
          <Card className="bg-zinc-900/40 backdrop-blur-2xl border-white/5 shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-black text-white uppercase tracking-widest">Revenue Optimization</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Star, title: "Availability Synchronization", desc: "Real-time calendar precision reduces scheduling collisions and increases algorithm authority." },
                  { icon: Building, title: "Visual Fidelity", desc: "High-resolution property dossiers increase booking probability by 42% on administrative audit." },
                ].map((tip, index) => (
                  <div key={index} className="flex items-start gap-4 p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all duration-500">
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
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
      </motion.div>
    </div>

  );
}
