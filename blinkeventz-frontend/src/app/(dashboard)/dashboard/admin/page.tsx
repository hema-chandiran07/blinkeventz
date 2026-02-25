"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Store,
  Building2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Activity,
  ArrowUpRight,
  Package,
  CreditCard,
  Star,
  Download,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlatformStats {
  totalUsers: number;
  totalVendors: number;
  totalVenues: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingApprovals: number;
  activeEvents: number;
  completionRate: number;
  averageRating: number;
}

interface RecentActivity {
  id: string;
  type: "booking" | "vendor" | "venue" | "payment" | "user";
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "pending" | "warning" | "info";
}

interface TopPerformer {
  id: string;
  name: string;
  type: "vendor" | "venue";
  bookings: number;
  revenue: number;
  rating: number;
}

const MOCK_PLATFORM_STATS: PlatformStats = {
  totalUsers: 12847,
  totalVendors: 234,
  totalVenues: 89,
  totalBookings: 1563,
  totalRevenue: 28500000,
  monthlyRevenue: 4250000,
  pendingApprovals: 12,
  activeEvents: 47,
  completionRate: 96.8,
  averageRating: 4.7
};

const MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: "1",
    type: "booking",
    title: "New Booking Confirmed",
    description: "Priya & Karthik Wedding booked Grand Ballroom ITC",
    timestamp: "2 minutes ago",
    status: "success"
  },
  {
    id: "2",
    type: "vendor",
    title: "Vendor Application Pending",
    description: "Elegant Decor Studio submitted for approval",
    timestamp: "15 minutes ago",
    status: "pending"
  },
  {
    id: "3",
    type: "payment",
    title: "Large Payment Processed",
    description: "₹3,50,000 payment for wedding event",
    timestamp: "1 hour ago",
    status: "success"
  },
  {
    id: "4",
    type: "venue",
    title: "New Venue Listed",
    description: "Royal Convention Center added to platform",
    timestamp: "2 hours ago",
    status: "info"
  },
  {
    id: "5",
    type: "booking",
    title: "Booking Cancelled",
    description: "Corporate event cancelled - refund initiated",
    timestamp: "3 hours ago",
    status: "warning"
  },
  {
    id: "6",
    type: "user",
    title: "New User Registration",
    description: "50+ new users registered today",
    timestamp: "5 hours ago",
    status: "info"
  }
];

const MOCK_TOP_PERFORMERS: TopPerformer[] = [
  {
    id: "1",
    name: "Grand Ballroom ITC Grand Chola",
    type: "venue",
    bookings: 47,
    revenue: 7050000,
    rating: 4.9
  },
  {
    id: "2",
    name: "LensCraft Studios",
    type: "vendor",
    bookings: 38,
    revenue: 1330000,
    rating: 4.9
  },
  {
    id: "3",
    name: "Le Royal Méridien",
    type: "venue",
    bookings: 35,
    revenue: 4200000,
    rating: 4.8
  },
  {
    id: "4",
    name: "Annapurna Caterers",
    type: "vendor",
    bookings: 32,
    revenue: 800000,
    rating: 4.8
  }
];

const formatCurrency = (amount: number) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-700 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "warning":
      return "bg-red-100 text-red-700 border-red-200";
    case "info":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4" />;
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "warning":
      return <AlertCircle className="h-4 w-4" />;
    case "info":
      return <Activity className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats] = useState<PlatformStats>(MOCK_PLATFORM_STATS);
  const [activities] = useState<RecentActivity[]>(MOCK_RECENT_ACTIVITIES);
  const [topPerformers] = useState<TopPerformer[]>(MOCK_TOP_PERFORMERS);

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsRefreshing(false);
    toast.success("Dashboard updated", {
      description: "Latest data has been loaded"
    });
  };

  const handleExportReport = () => {
    toast.success("Report generated", {
      description: "Downloading platform analytics report..."
    });
  };

  const revenueGrowth = 15.3;
  const bookingsGrowth = 8.7;
  const userGrowth = 12.4;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Platform overview and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadDashboardData} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{revenueGrowth}% vs last period</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalBookings}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{bookingsGrowth}% vs last period</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-purple-50 text-purple-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{userGrowth}% vs last period</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingApprovals}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-yellow-600">
                  <Clock className="h-4 w-4" />
                  <span>Need attention</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-yellow-50 text-yellow-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalVendors}</p>
                <p className="text-xs text-gray-500 mt-1">+12 this month</p>
              </div>
              <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                <Store className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Venues</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalVenues}</p>
                <p className="text-xs text-gray-500 mt-1">+5 this month</p>
              </div>
              <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Events</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeEvents}</p>
                <p className="text-xs text-gray-500 mt-1">Happening now</p>
              </div>
              <div className="p-3 rounded-full bg-pink-50 text-pink-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageRating}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-gray-500">Platform wide</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Star className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Real-time platform activity feed</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/admin/approvals">
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={cn(
                    "p-2 rounded-full flex-shrink-0",
                    getStatusColor(activity.status)
                  )}>
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <span className="text-xs text-gray-500">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Best performing vendors & venues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div
                  key={performer.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0 && "bg-yellow-100 text-yellow-700",
                    index === 1 && "bg-gray-100 text-gray-700",
                    index === 2 && "bg-orange-100 text-orange-700",
                    index > 2 && "bg-purple-50 text-purple-700"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{performer.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Badge variant="secondary" className="text-xs">
                        {performer.type === "venue" ? <Building2 className="h-3 w-3 mr-1" /> : <Store className="h-3 w-3 mr-1" />}
                        {performer.type}
                      </Badge>
                      <span>{performer.bookings} bookings</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(performer.revenue)}</p>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{performer.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/admin/approvals">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Key metrics and completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Booking Completion Rate</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Payment Success Rate</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">98.5%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: "98.5%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">Customer Satisfaction</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{stats.averageRating}/5.0</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.averageRating / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Avg. Response Time</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">2.4 hrs</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for current month</CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-700">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{revenueGrowth}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-1">This Month</p>
                <p className="text-4xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
                <p className="text-sm text-green-600 mt-2">
                  +{formatCurrency(Math.round(stats.monthlyRevenue * 0.153))} from last month
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Venue Bookings</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(Math.round(stats.monthlyRevenue * 0.65))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Vendor Services</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(Math.round(stats.monthlyRevenue * 0.35))}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Platform Fee</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(Math.round(stats.monthlyRevenue * 0.05))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Taxes</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(Math.round(stats.monthlyRevenue * 0.18))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Net Revenue</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(Math.round(stats.monthlyRevenue * 0.77))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common admin tasks for quick access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/admin/approvals">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="font-medium">Review Approvals</span>
                <span className="text-xs text-gray-500">{stats.pendingApprovals} pending</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/admin/users">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <span className="font-medium">Manage Users</span>
                <span className="text-xs text-gray-500">{stats.totalUsers} users</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/admin/events">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="font-medium">View Events</span>
                <span className="text-xs text-gray-500">{stats.activeEvents} active</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/settings">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="font-medium">Platform Settings</span>
                <span className="text-xs text-gray-500">Configuration</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
