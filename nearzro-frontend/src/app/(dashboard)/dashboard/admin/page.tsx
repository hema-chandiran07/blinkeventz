"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building, Store, CheckCircle2,
  DollarSign, TrendingUp, TrendingDown, ArrowRight, RefreshCw,
  AlertCircle, MapPin, PieChart as PieChartIcon, CreditCard,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, Pie, PieChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const COLORS = ["#059669", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${(amount / 1000).toFixed(2)}K`;
};

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

  const fetchDashboardData = async () => {
    try {
      const [statsRes, analyticsRes, activityRes] = await Promise.all([
        api.get('/dashboard/admin/stats'),
        api.get('/dashboard/admin/revenue'),
        api.get('/dashboard/admin/activity'),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setActivity(activityRes.data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
    fetchDashboardData();
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
      toast.success("Dashboard data updated");
    } finally {
      setRefreshing(false);
    }
  };

  // Transform revenue data for chart
  const revenueData = analytics ? Object.entries(analytics.revenueByMonth).map(([month, revenue]) => ({
    month,
    revenue,
    bookings: analytics.bookingsByMonth[month] || 0,
  })) : [];

  // Transform event type data for pie chart
  const eventTypeData = analytics?.eventTypeBreakdown.map(item => ({
    name: item.type,
    value: item.count,
    revenue: item.revenue,
  })) || [];

  // Transform city data for bar chart
  const locationData = analytics?.cityBreakdown.map(item => ({
    name: item.city,
    events: item.count,
    revenue: item.revenue,
    growth: 0,
  })) || [];

  // Transform recent activity for transactions
  const recentTransactions = activity?.recentEvents.slice(0, 5).map((event, idx) => ({
    id: idx + 1,
    type: "Payment",
    entity: event.title,
    amount: event.amount,
    status: event.status,
    time: new Date(event.createdAt).toLocaleString(),
  })) || [];

  // KPI data from API
  const KPI_DATA = stats ? [
    { title: "Total Revenue", value: formatCurrency(stats.totalRevenue), change: "+18.4%", trend: "up" as const, icon: DollarSign, color: "bg-emerald-600" },
    { title: "Monthly Revenue", value: formatCurrency(stats.monthlyRevenue), change: "+15.3%", trend: "up" as const, icon: CreditCard, color: "bg-blue-600" },
    { title: "Total Events", value: stats.totalEvents.toString(), change: "+12.5%", trend: "up" as const, icon: Calendar, color: "bg-indigo-600" },
    { title: "Active Bookings", value: stats.inProgressEvents.toString(), change: "+8.2%", trend: "up" as const, icon: CheckCircle2, color: "bg-green-600" },
    { title: "Total Users", value: stats.totalUsers.toLocaleString(), change: "+22.1%", trend: "up" as const, icon: Users, color: "bg-purple-600" },
    { title: "Total Venues", value: stats.totalVenues.toString(), change: "+15.3%", trend: "up" as const, icon: Building, color: "bg-orange-600" },
    { title: "Total Vendors", value: stats.totalVendors.toString(), change: "+10.7%", trend: "up" as const, icon: Store, color: "bg-pink-600" },
    { title: "Pending Approvals", value: stats.pendingApprovals.toString(), change: "-5.2%", trend: "down" as const, icon: AlertCircle, color: "bg-amber-600" },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30">
      {/* Premium Business Gradient Header */}
      <div className="relative overflow-hidden border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl px-8 py-8">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/10 opacity-50" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-2 py-0 text-[10px] font-bold tracking-wider uppercase">
                System Administrator
              </Badge>
              <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live Performance</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Analytics</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-md mt-2 leading-relaxed">
              Industrial-grade intelligence platform monitoring NearZro ecosystem health and financial velocity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/admin/system-settings")}
              className="bg-white text-black hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 font-bold"
            >
              <Settings className="h-4 w-4 mr-2" />
              Core Setup
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="relative h-16 w-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-zinc-500 font-medium tracking-wide">Aggregating real-time metrics...</p>
          </div>
        </div>
      ) : !stats ? (
        <div className="flex items-center justify-center py-32 px-6">
          <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl text-center">
            <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Connectivity Disruption</h2>
            <p className="text-zinc-500 text-sm mb-6">Encrypted handshakes failed. The neural interface could not synchronize with core services.</p>
            <Button onClick={handleRefresh} className="w-full bg-white text-black hover:bg-zinc-200 font-bold">Initiate Reconnection</Button>
          </div>
        </div>
      ) : (
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
                  <Card className="group relative overflow-hidden bg-zinc-900/50 border-zinc-800/50 hover:border-blue-500/30 transition-all duration-500 cursor-pointer backdrop-blur-sm">
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4 text-zinc-500" />
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${kpi.color} shadow-lg shadow-black/20`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${isUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {kpi.change}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{kpi.title}</p>
                        <p className="text-3xl font-black text-white tracking-tight">{kpi.value}</p>
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
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
                <CardHeader className="border-b border-zinc-900 pb-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                         Financial Velocity
                      </CardTitle>
                      <p className="text-sm text-zinc-500 mt-1">Cross-referencing monthly revenue and booking volume</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Revenue
                       </div>
                       <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Bookings
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
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#4b5563" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                          dy={10}
                        />
                        <YAxis
                          stroke="#4b5563"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `₹${(value/100000).toFixed(0)}L`}
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
                                      <span className="text-xs font-bold text-indigo-400">{payload[1]?.value} units</span>
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
                          stroke="#2563eb"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                          animationDuration={2000}
                        />
                        <Area
                          type="monotone"
                          dataKey="bookings"
                          stroke="#7c3aed"
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
                 <CardHeader className="border-b border-zinc-900">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-indigo-500" /> Regional Output
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs text-zinc-500" onClick={() => router.push('/dashboard/admin/reports/venues')}>
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
                            stroke="#9ca3af" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            width={100}
                          />
                          <Tooltip 
                             cursor={{fill: 'rgba(255,255,255,0.05)'}}
                             contentStyle={{backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a'}}
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
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 blur-[60px] rounded-full" />
                 <CardHeader className="border-b border-zinc-900 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-emerald-500" /> Market Share
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
                            contentStyle={{backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a'}}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                       {eventTypeData.slice(0, 4).map((item, i) => (
                         <div key={i} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                            <span className="text-[10px] text-zinc-400 font-medium truncate uppercase tracking-tighter">{item.name}</span>
                         </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>

              {/* Recent Ledger activity */}
              <Card className="bg-zinc-950 border-zinc-800 shadow-xl flex-1">
                <CardHeader className="border-b border-zinc-900">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">Platform Log</CardTitle>
                    <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 font-bold px-2 py-0 text-[10px]">LATEST 5</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y divide-zinc-900">
                     {recentTransactions.map((tx) => (
                       <div key={tx.id} className="p-4 hover:bg-zinc-900/50 transition-colors group">
                          <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                                   <CreditCard className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate max-w-[120px]">{tx.entity}</span>
                             </div>
                             <span className="text-xs font-black text-white">₹{tx.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] text-zinc-500 font-medium">{new Date(tx.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ID-{tx.id}</span>
                             <Badge variant="outline" className={cn(
                               "text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-4",
                               tx.status === "COMPLETED" || tx.status === "CONFIRMED" ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/5" : "border-amber-500/50 text-amber-400 bg-amber-500/5"
                             )}>
                               {tx.status}
                             </Badge>
                          </div>
                       </div>
                     ))}
                   </div>
                   <Button 
                    variant="ghost" 
                    className="w-full rounded-none h-12 text-xs font-bold text-zinc-500 hover:text-white hover:bg-zinc-900"
                    onClick={() => router.push('/dashboard/admin/transactions')}
                   >
                      EXPLORE FULL LEDGER <ArrowRight className="h-3 w-3 ml-2" />
                   </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
