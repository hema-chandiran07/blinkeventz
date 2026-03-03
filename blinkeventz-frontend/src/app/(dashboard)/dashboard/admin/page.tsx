"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Calendar, Users, Building, Store, CheckCircle2,
  DollarSign, TrendingUp, TrendingDown, Activity, ArrowRight, RefreshCw,
  AlertCircle, MapPin, Eye, BarChart3, PieChart, CreditCard, Package,
  Settings, LogOut, Bell, Search, Shield
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

// Professional Mock Data
const KPI_DATA = [
  { title: "Total Revenue", value: "₹4.75Cr", change: "+18.4%", trend: "up", icon: DollarSign, color: "bg-emerald-600" },
  { title: "Monthly Revenue", value: "₹38.5L", change: "+15.3%", trend: "up", icon: CreditCard, color: "bg-blue-600" },
  { title: "Total Events", value: "534", change: "+12.5%", trend: "up", icon: Calendar, color: "bg-indigo-600" },
  { title: "Active Bookings", value: "145", change: "+8.2%", trend: "up", icon: CheckCircle2, color: "bg-green-600" },
  { title: "Total Users", value: "1,247", change: "+22.1%", trend: "up", icon: Users, color: "bg-purple-600" },
  { title: "Total Venues", value: "89", change: "+15.3%", trend: "up", icon: Building, color: "bg-orange-600" },
  { title: "Total Vendors", value: "156", change: "+10.7%", trend: "up", icon: Store, color: "bg-pink-600" },
  { title: "Pending Approvals", value: "12", change: "-5.2%", trend: "down", icon: AlertCircle, color: "bg-amber-600" },
];

const REVENUE_DATA = [
  { month: "Jan", revenue: 2800000, bookings: 45, target: 2500000 },
  { month: "Feb", revenue: 3200000, bookings: 52, target: 2800000 },
  { month: "Mar", revenue: 3850000, bookings: 68, target: 3200000 },
  { month: "Apr", revenue: 4200000, bookings: 75, target: 3800000 },
  { month: "May", revenue: 4800000, bookings: 89, target: 4200000 },
  { month: "Jun", revenue: 5100000, bookings: 95, target: 4800000 },
];

const EVENT_TYPE_DATA = [
  { name: "Wedding", value: 145, revenue: 21750000, percentage: 32 },
  { name: "Corporate", value: 67, revenue: 10050000, percentage: 15 },
  { name: "Engagement", value: 89, revenue: 6675000, percentage: 20 },
  { name: "Reception", value: 38, revenue: 3800000, percentage: 8 },
  { name: "Birthday", value: 45, revenue: 2250000, percentage: 10 },
  { name: "Other", value: 67, revenue: 6500000, percentage: 15 },
];

const LOCATION_DATA = [
  { name: "Anna Nagar", events: 89, revenue: 8900000, growth: 12.5 },
  { name: "T Nagar", events: 78, revenue: 7800000, growth: 8.3 },
  { name: "Adyar", events: 65, revenue: 6500000, growth: 15.7 },
  { name: "Velachery", events: 54, revenue: 5400000, growth: 6.2 },
  { name: "OMR", events: 48, revenue: 4800000, growth: 18.9 },
  { name: "Guindy", events: 42, revenue: 4200000, growth: 9.4 },
];

const RECENT_TRANSACTIONS = [
  { id: 1, type: "Payment", entity: "Priya & Karthik Wedding", amount: 1500000, status: "Success", time: "2 hours ago" },
  { id: 2, type: "Booking", entity: "TechCorp Annual Meet", amount: 750000, status: "Pending", time: "4 hours ago" },
  { id: 3, type: "Payment", entity: "Fatima's Engagement", amount: 500000, status: "Processing", time: "6 hours ago" },
  { id: 4, type: "Refund", entity: "Arjun's Birthday Bash", amount: 50000, status: "Completed", time: "1 day ago" },
  { id: 5, type: "Payment", entity: "Global Solutions Conference", amount: 2500000, status: "Success", time: "1 day ago" },
];

const COLORS = ["#059669", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${(amount / 1000).toFixed(2)}K`;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Dashboard data updated");
  };

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
            disabled={refreshing}
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
                <AreaChart data={REVENUE_DATA}>
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
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
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
                    data={EVENT_TYPE_DATA}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {EVENT_TYPE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "value") return [`${value} events`, "Count"];
                      if (name === "revenue") return [formatCurrency(value), "Revenue"];
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
                <p className="text-sm text-neutral-600 mt-1">Chennai area-wise breakdown</p>
              </div>
              <MapPin className="h-5 w-5 text-neutral-400" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={LOCATION_DATA} layout="vertical">
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
                    formatter={(value: number, name: string) => {
                      if (name === "revenue") return [formatCurrency(value), "Revenue"];
                      return [`${value} events`, "Events"];
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
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/payments")}>
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {RECENT_TRANSACTIONS.map((transaction) => (
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
                      transaction.status === "Success" ? "bg-emerald-100 text-emerald-700" :
                      transaction.status === "Pending" ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
