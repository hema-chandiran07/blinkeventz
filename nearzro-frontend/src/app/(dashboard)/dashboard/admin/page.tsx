"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building, Store, CheckCircle2,
  DollarSign, TrendingUp, TrendingDown, ArrowRight, RefreshCw,
  AlertCircle, MapPin, PieChart, CreditCard,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
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
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Professional Header */}
      <div className="flex items-center justify-between bg-white border-b border-neutral-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard Overview</h1>
          <p className="text-sm text-neutral-600 mt-1">Real-time platform performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="border-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/admin/settings")}
            className="border-neutral-300"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-400" />
            <p className="text-neutral-600">Loading dashboard data...</p>
          </div>
        </div>
      ) : !stats ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <p className="text-neutral-600">Failed to load dashboard data. Please try again.</p>
            <Button onClick={handleRefresh} className="mt-4">Retry</Button>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-6">
            {KPI_DATA.map((kpi, index) => {
              const Icon = kpi.icon;
              const isUp = kpi.trend === "up";
              return (
                <Card key={index} className="border border-neutral-200 hover:shadow-lg transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-neutral-600">{kpi.title}</p>
                        <p className="text-3xl font-bold text-neutral-900">{kpi.value}</p>
                        <div className={`flex items-center gap-1 ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span className="text-xs font-medium">{kpi.change}</span>
                          <span className="text-xs text-neutral-500">vs last month</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${kpi.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2 px-6">
            {/* Revenue Trend Chart */}
            <Card className="border border-neutral-200">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-neutral-900">Revenue Trend</CardTitle>
                    <p className="text-sm text-neutral-600 mt-1">6-month performance analysis</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +15.3% growth
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${(value/100000).toFixed(0)}L`}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value) || 0), "Revenue"]}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e5e5",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Event Type Distribution */}
            <Card className="border border-neutral-200">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-neutral-900">Event Distribution</CardTitle>
                    <p className="text-sm text-neutral-600 mt-1">By event type and revenue</p>
                  </div>
                  <PieChart className="h-5 w-5 text-neutral-400" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} (${value})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {eventTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "value") return [`${Number(value) || 0} events`, "Count"];
                          return [value, name];
                        }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e5e5",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Performance & Recent Transactions */}
          <div className="grid gap-6 md:grid-cols-2 px-6">
            {/* Location-wise Performance */}
            <Card className="border border-neutral-200">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-neutral-900">Location Performance</CardTitle>
                    <p className="text-sm text-neutral-600 mt-1">City-wise breakdown</p>
                  </div>
                  <MapPin className="h-5 w-5 text-neutral-400" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#374151"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "revenue") return [formatCurrency(Number(value) || 0), "Revenue"];
                          return [`${Number(value) || 0} events`, "Events"];
                        }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e5e5",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border border-neutral-200">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-neutral-900">Recent Transactions</CardTitle>
                    <p className="text-sm text-neutral-600 mt-1">Latest payment activity</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/transactions")}>
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/admin/transactions/${transaction.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            transaction.type === "Payment" ? "bg-emerald-100" :
                            transaction.type === "Refund" ? "bg-red-100" : "bg-blue-100"
                          }`}>
                            {transaction.type === "Payment" ? <DollarSign className="h-5 w-5 text-emerald-600" /> :
                             transaction.type === "Refund" ? <TrendingDown className="h-5 w-5 text-red-600" /> :
                             <Calendar className="h-5 w-5 text-blue-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{transaction.entity}</p>
                            <p className="text-xs text-neutral-500">{transaction.type} • {transaction.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-neutral-900">{formatCurrency(transaction.amount)}</p>
                          <Badge className={`text-xs ${
                            transaction.status === "Success" || transaction.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                            transaction.status === "Pending" || transaction.status === "PENDING_PAYMENT" ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-neutral-500">
                      <p>No recent transactions</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
