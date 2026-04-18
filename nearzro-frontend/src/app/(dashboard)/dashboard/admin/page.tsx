"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Users, Building, Store, CheckCircle2,
  DollarSign, TrendingUp, TrendingDown, ArrowRight, RefreshCw,
  AlertCircle, MapPin, PieChart as PieChartIcon, CreditCard,
  Settings, Download
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, Pie, PieChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${(amount / 1000).toFixed(2)}K`;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DashboardStats {
  totalUsers: number;
  totalVenues: number;
  totalVendors: number;
  totalEvents: number;
  pendingApprovals: number;
  totalRevenue: number;
  monthlyRevenue: number;
  confirmedEvents: number;
  inProgressEvents: number;
}

interface RevenueAnalytics {
  revenueByMonth: Record<string, number>;
  bookingsByMonth: Record<string, number>;
  eventTypeBreakdown: Array<{ type: string; count: number; revenue: number }>;
  cityBreakdown: Array<{ city: string; count: number; revenue: number }>;
}

interface RecentActivity {
  recentEvents: Array<{ type: string; id: number; title: string; customer: string; status: string; amount: number; createdAt: string }>;
  recentVenues: Array<{ type: string; id: number; title: string; owner: string; city: string; status: string; createdAt: string }>;
  recentVendors: Array<{ type: string; id: number; title: string; owner: string; city: string; status: string; createdAt: string }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);

  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      const [statsRes, analyticsRes, activityRes] = await Promise.all([
        api.get('/dashboard/admin/stats', { signal }),
        api.get('/dashboard/admin/revenue', { signal }),
        api.get('/dashboard/admin/activity', { signal }),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setActivity(activityRes.data);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Operational metrics synchronized");
  };

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="relative h-16 w-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-zinc-500 font-medium tracking-wide">Aggregating real-time metrics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-32 px-6">
        <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl text-center">
          <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connectivity Disruption</h2>
          <p className="text-zinc-500 text-sm mb-6">Encrypted handshakes failed. The neural interface could not synchronize with core services.</p>
          <Button onClick={handleRefresh} className="w-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-bold">Initiate Reconnection</Button>
        </div>
      </div>
    );
  }

  const KPI_DATA = [
    { title: "Gross Merchandise Value", value: formatCurrency(stats.totalRevenue), change: "+14.2%", trend: "up" as const, icon: DollarSign },
    { title: "Confirmed Events", value: stats.confirmedEvents.toString(), change: "+8.4%", trend: "up" as const, icon: CheckCircle2 },
    { title: "Active Bookings", value: stats.inProgressEvents.toString(), change: "+8.2%", trend: "up" as const, icon: CheckCircle2 },
    { title: "Total Users", value: stats.totalUsers.toLocaleString(), change: "+22.1%", trend: "up" as const, icon: Users },
    { title: "Total Venues", value: stats.totalVenues.toString(), change: "+15.3%", trend: "up" as const, icon: Building },
    { title: "Total Vendors", value: stats.totalVendors.toString(), change: "+10.7%", trend: "up" as const, icon: Store },
    { title: "Pending Approvals", value: stats.pendingApprovals.toString(), change: "-5.2%", trend: "down" as const, icon: AlertCircle },
  ];

  const locationData = analytics?.cityBreakdown?.map(c => ({
    name: c.city,
    revenue: c.revenue,
  })) || [];

  const eventTypeData = analytics?.eventTypeBreakdown?.map(e => ({
    name: e.type,
    value: e.count,
  })) || [];

  const revenueData = analytics?.revenueByMonth
    ? Object.entries(analytics.revenueByMonth).map(([month, revenue]) => ({ month, revenue }))
    : [];

  const recentTransactions = activity?.recentEvents?.slice(0, 5).map(tx => ({
    id: tx.id,
    entity: tx.title,
    amount: tx.amount,
    time: tx.createdAt,
    status: tx.status,
  })) || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-700/30">
      {/* Premium Business Gradient Header */}
      <div className="relative overflow-hidden border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl px-8 py-8">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-900/20 via-transparent to-purple-900/20 opacity-50" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-900/30 text-blue-400 border-blue-800/50 px-2 py-0 text-[10px] font-bold tracking-wider uppercase">
                System Administrator
              </Badge>
              <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Live Performance</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-100 flex items-center gap-3">
              Elite <span className="text-zinc-400">Analytics</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-md mt-2 leading-relaxed">
              Industrial-grade intelligence platform monitoring NearZro ecosystem health and financial velocity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all rounded-2xl h-12 px-6"
              onClick={handleRefresh}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing ? "animate-spin" : "")} />
              Synchronize
            </Button>
            <Button
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-all font-bold rounded-2xl h-12 px-6 shadow-lg shadow-zinc-900/50"
              onClick={() => toast.info("Exporting high-fidelity dataset...")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Intelligence
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* KPI Dashboard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_DATA.map((kpi, index) => {
            const Icon = kpi.icon;
            const isUp = kpi.trend === "up";
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-500 cursor-pointer backdrop-blur-sm">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4 text-zinc-500" />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-zinc-800 shadow-lg shadow-black/20`}>
                        <Icon className="h-5 w-5 text-zinc-300" />
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${isUp ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'}`}>
                        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {kpi.change}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{kpi.title}</p>
                      <p className="text-3xl font-black text-zinc-100 tracking-tight">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Advanced Analytics Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue & Growth (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
              <CardHeader className="border-b border-zinc-800 pb-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                      Financial Velocity
                    </CardTitle>
                    <p className="text-sm text-zinc-500 mt-1">Cross-referencing monthly revenue and booking volume</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Revenue
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Bookings
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#71717b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#71717b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#52525b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#52525b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-2xl">
                                <p className="font-bold text-zinc-400 mb-2 text-[10px] uppercase tracking-wider">{label}</p>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-8">
                                    <span className="text-xs text-zinc-500">Revenue:</span>
                                    <span className="text-xs font-bold text-blue-400">₹{payload[0].value?.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-8">
                                    <span className="text-xs text-zinc-500">Bookings:</span>
                                    <span className="text-xs font-bold text-zinc-400">{payload[1]?.value} units</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        animationDuration={2000}
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke="#71717b"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorBookings)"
                        animationDuration={2500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Geographical Distribution */}
            <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-zinc-400" /> Regional Output
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => router.push('/dashboard/admin/reports/venues')}>
                    Details <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#52525b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.2)' }}
                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Columns (1/3 width) */}
          <div className="space-y-6">
            {/* Event Distribution (Donut) */}
            <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-900/30 blur-[60px] rounded-full" />
              <CardHeader className="border-b border-zinc-800 pb-4">
                <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-emerald-400" /> Market Share
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {eventTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {eventTypeData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-zinc-400 font-medium truncate uppercase tracking-tighter">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Ledger activity */}
            <Card className="bg-zinc-950 border-zinc-800 shadow-xl flex-1">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-zinc-100">Platform Log</CardTitle>
                  <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 font-bold px-2 py-0 text-[10px]">LATEST 5</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-800">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 hover:bg-zinc-900/50 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-zinc-100 truncate max-w-[120px]">{tx.entity}</span>
                        </div>
                        <span className="text-xs font-black text-zinc-100">₹{tx.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-medium">{new Date(tx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ID-{tx.id}</span>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-4",
                          tx.status === "COMPLETED" || tx.status === "CONFIRMED" ? "border-emerald-700/50 text-emerald-400 bg-emerald-950/20" : "border-amber-700/50 text-amber-400 bg-amber-950/20"
                        )}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full rounded-none h-12 text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                  onClick={() => router.push('/dashboard/admin/transactions')}
                >
                  EXPLORE FULL LEDGER <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}