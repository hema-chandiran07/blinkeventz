"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle,
  ArrowLeft, Download, Calendar, BarChart3, RefreshCw, IndianRupee,
  ArrowUpRight, ArrowDownRight, Loader2, Building2, Activity, PieChart as PieChartIcon
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, LineChart, Line
} from 'recharts';

// ==================== Types ====================
interface EarningsStats {
  totalRevenue: number;
  completedRevenue: number;
  pendingRevenue: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  platformFees: number;
  netEarnings: number;
  currency: string;
  revenueGrowth: number;
  bookingsGrowth: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

interface VenuePerformance {
  id: number;
  name: string;
  city: string;
  bookings: number;
  revenue: number;
  occupancyRate: number;
  rating: number;
}

interface EventTypeBreakdown {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

// ==================== Constants ====================
const PLATFORM_FEE_PERCENTAGE = 5;

const EVENT_TYPE_COLORS: Record<string, string> = {
  Wedding: 'from-pink-500 to-rose-500',
  Corporate: 'from-blue-500 to-indigo-500',
  Birthday: 'from-amber-500 to-orange-500',
  Conference: 'from-emerald-500 to-teal-500',
  Social: 'from-purple-500 to-violet-500',
  Other: 'from-neutral-500 to-slate-500',
};

// ==================== Main Component ====================
export default function VenueEarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [venuePerformance, setVenuePerformance] = useState<VenuePerformance[]>([]);
  const [eventTypeBreakdown, setEventTypeBreakdown] = useState<EventTypeBreakdown[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const loadEarningsData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      else setLoading(true);

      const [analyticsRes, revenueRes] = await Promise.all([
        api.get('/venues/analytics').catch(() => ({ data: null })),
        api.get('/venues/analytics/revenue').catch(() => ({ data: null })),
      ]);

      const analyticsData = analyticsRes?.data || {};
      const revenueData = revenueRes?.data || {};

      setStats({
        totalRevenue: analyticsData?.totalRevenue || 0,
        completedRevenue: analyticsData?.completedRevenue || 0,
        pendingRevenue: analyticsData?.pendingRevenue || 0,
        totalBookings: analyticsData?.totalBookings || 0,
        completedBookings: analyticsData?.completedBookings || 0,
        pendingBookings: analyticsData?.pendingBookings || 0,
        cancelledBookings: analyticsData?.cancelledBookings || 0,
        platformFees: Math.round((analyticsData?.totalRevenue || 0) * (PLATFORM_FEE_PERCENTAGE / 100)),
        netEarnings: Math.round((analyticsData?.totalRevenue || 0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)),
        currency: analyticsData?.currency || 'INR',
        revenueGrowth: analyticsData?.revenueGrowth || 0,
        bookingsGrowth: analyticsData?.bookingsGrowth || 0,
      });

      setMonthlyData(Array.isArray(analyticsData?.monthlyRevenue) ? analyticsData.monthlyRevenue : []);
      setVenuePerformance(Array.isArray(analyticsData?.venuePerformance) ? analyticsData.venuePerformance : []);
      setEventTypeBreakdown(Array.isArray(analyticsData?.eventTypeBreakdown) ? analyticsData.eventTypeBreakdown : []);

      if (showRefreshToast) toast.success("Earnings data refreshed");
    } catch (error) {
      console.error("Failed to load earnings:", error);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  const handleRefresh = async () => {
    await loadEarningsData(true);
  };

  const handleExport = () => {
    try {
      const headers = ['Venue', 'City', 'Bookings', 'Revenue', 'Platform Fee', 'Net Earnings', 'Occupancy Rate', 'Rating'];
      const rows = venuePerformance.map(v => [
        v.name,
        v.city,
        v.bookings,
        `Rs.${(v.revenue || 0).toLocaleString()}`,
        `Rs.${Math.round((v.revenue || 0) * PLATFORM_FEE_PERCENTAGE / 100).toLocaleString()}`,
        `Rs.${Math.round((v.revenue || 0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)).toLocaleString()}`,
        `${(v.occupancyRate || 0).toFixed(1)}%`,
        (v.rating || 0).toFixed(1),
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `venue-earnings-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success("Earnings report exported");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  const filteredVenues = filterMonth === "all"
    ? venuePerformance
    : venuePerformance.filter(v => {
        const monthlyEntry = monthlyData.find(m => m.month === filterMonth);
        return monthlyEntry ? monthlyEntry.bookings > 0 : true;
      });

  if (loading) {
    return (
      <div className="space-y-8 p-6 bg-[#0a0a0b] min-h-screen">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-zinc-900 animate-pulse">
                <Building2 className="h-8 w-8 text-zinc-700" />
              </div>
              <div>
                <div className="h-8 w-48 bg-zinc-900 animate-pulse rounded-lg" />
                <div className="h-4 w-64 bg-zinc-900 animate-pulse rounded-lg mt-2" />
              </div>
           </div>
        </div>
        <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardContent className="py-24 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Synchronizing Financial Ledger</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-6 bg-[#0a0a0b] text-white selection:bg-emerald-500/30 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ==================== Header ==================== */}
      <motion.div
        className="flex items-center justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-2xl border border-zinc-700/50">
            <DollarSign className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Revenue <span className="text-emerald-500">Analytics</span>
            </h1>
            <p className="text-zinc-500 font-medium font-mono text-xs uppercase tracking-widest">Financial Performance Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={refreshing} 
            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all rounded-full"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Sync Ledger
          </Button>
          <Button 
            onClick={handleExport} 
            className="bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5 transition-all font-bold rounded-full h-11 px-8"
          >
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
        </div>
      </motion.div>

      {/* ==================== Stats Overlays ==================== */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { label: "Gross Yield", value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, growth: stats?.revenueGrowth, icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Net Earnings", value: `₹${(stats?.netEarnings || 0).toLocaleString()}`, subtext: "Post Gateway Fee", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Platform Fee", value: `₹${(stats?.platformFees || 0).toLocaleString()}`, subtext: "Service Charge", icon: BarChart3, color: "text-zinc-400", bg: "bg-zinc-500/10" },
          { label: "Bookings", value: stats?.completedBookings || 0, subtext: "Completed Units", icon: CheckCircle2, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Pipeline", value: stats?.pendingBookings || 0, subtext: "Awaiting Clearance", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" }
        ].map((item, i) => (
          <Card key={i} className="bg-zinc-900/50 border-zinc-800 shadow-xl backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-20" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-1">{item.label}</p>
                  <p className="text-2xl font-black text-white">{item.value}</p>
                  {item.growth !== undefined && item.growth !== 0 ? (
                    <p className={cn("text-[10px] mt-2 flex items-center gap-1 font-bold", item.growth > 0 ? "text-emerald-400" : "text-red-400")}>
                      {item.growth > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(item.growth)}% Growth
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-tighter">{item.subtext}</p>
                  )}
                </div>
                <div className={cn("p-2.5 rounded-xl border border-white/5 shadow-2xl", item.bg, item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ==================== Info Card ==================== */}
      <Card className="bg-blue-900/20 border-blue-500/30 shadow-xl backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-blue-100 tracking-tight">Financial Protocol Overview</p>
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Booking Lifecycle</p>
                  <p className="text-xs text-zinc-300">Revenue is indexed upon confirmation and finalized after event completion.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Platform Commissions</p>
                  <p className="text-xs text-zinc-300">A fixed {PLATFORM_FEE_PERCENTAGE}% infrastructure fee is applied to all processed yields.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Trend Analysis ==================== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-zinc-900 shadow-2xl border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Revenue Projection
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Temporal Fiscal Velocity</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}K`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                <BarChart3 className="h-12 w-12 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Transaction Data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 shadow-2xl border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Sector Performance
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Event Type Distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            {eventTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="type"
                  >
                    {eventTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                <PieChartIcon className="h-12 w-12 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Indexing Categories</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==================== Event Type Breakdown ==================== */}
      {eventTypeBreakdown.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-zinc-400" />
              Segmentation Matrix
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Yield distribution by event category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {eventTypeBreakdown.map((event, index) => (
                <div key={index} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-zinc-100">{event.type}</h4>
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                      {((event.percentage || 0)).toFixed(0)}% Allocation
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{event.count || 0} Transactions</p>
                    <p className="text-xl font-black text-white">₹{(event.revenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${event.percentage}%` }}
                      className={cn("h-full bg-gradient-to-r shadow-[0_0_10px_rgba(0,0,0,0.5)]", EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.Other)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== Venue Performance ==================== */}
      <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-zinc-400" />
                Infrastructure Analytics
              </CardTitle>
              <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Occupancy and yield efficiency per unit</CardDescription>
            </div>
            {venuePerformance.length > 1 && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-bold text-zinc-400 outline-none focus:ring-1 focus:ring-zinc-700"
              >
                <option value="all">Full Timeline</option>
                {monthlyData.map((m, i) => (
                  <option key={i} value={m.month}>{m.month}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredVenues.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-zinc-800 rounded-3xl">
              <Building2 className="h-16 w-16 text-zinc-800 mx-auto mb-4" />
              <h3 className="text-lg font-black text-zinc-600 mb-2 uppercase tracking-widest">No Active Units</h3>
              <p className="text-zinc-500 text-xs">Infrastructure yields will populate upon validated transaction finalization.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-zinc-800 shadow-sm">
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Venue Entity</th>
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Registry</th>
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Volume</th>
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Gross</th>
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Net Cleared</th>
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Load %</th>
                    <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredVenues.map((venue) => (
                    <tr key={venue.id} className="hover:bg-zinc-800/30 transition-all group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg">
                            <Building2 className="h-5 w-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                          </div>
                          <span className="font-bold text-zinc-200 group-hover:text-white transition-colors">{venue.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-zinc-500">{venue.city}</td>
                      <td className="py-4 px-4 text-xs font-mono text-zinc-300 text-right">{venue.bookings || 0}</td>
                      <td className="py-4 px-4 text-xs font-bold text-white text-right">₹{(venue.revenue || 0).toLocaleString()}</td>
                      <td className="py-4 px-4 text-xs font-black text-emerald-400 text-right">
                        ₹{Math.round((venue.revenue || 0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-zinc-400 text-right">{(venue.occupancyRate || 0).toFixed(1)}%</td>
                      <td className="py-4 px-4 text-right">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-black text-[10px]">
                          { (venue.rating || 0).toFixed(1) }
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== Quick Links ==================== */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Internal Payouts", desc: "Track fiscal clearance cycles", path: "/dashboard/venue/payouts", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Deep Analytics", desc: "Granular infrastructure insights", path: "/dashboard/venue/analytics", icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Unit Manifest", desc: "Global reservation ledger", path: "/dashboard/venue/bookings", icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" }
        ].map((link, i) => (
          <Card
            key={i}
            className="cursor-pointer bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all shadow-xl backdrop-blur-md group"
            onClick={() => router.push(link.path)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl transition-all group-hover:scale-110", link.bg, link.color)}>
                  <link.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-white tracking-tight">{link.label}</p>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{link.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
