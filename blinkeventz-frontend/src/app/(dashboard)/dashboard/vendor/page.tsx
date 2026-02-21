"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  TrendingUp, 
  Star,
  ArrowRight,
  Plus,
  AlertCircle,
  Users,
  MapPin,
  Eye,
  Briefcase,
  Award,
  Activity
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Mock data for dashboard
const MOCK_DASHBOARD_DATA = {
  stats: {
    totalServices: 12,
    activeServices: 8,
    totalBookings: 47,
    pendingBookings: 5,
    confirmedBookings: 28,
    completedBookings: 12,
    cancelledBookings: 2,
    monthlyRevenue: 285000,
    totalRevenue: 1250000,
    averageRating: 4.8,
    totalReviews: 156,
    responseRate: 95,
    completionRate: 98
  },
  recentBookings: [
    {
      id: "1",
      customer: "Rajesh Kumar",
      event: "Priya & Karthik Wedding",
      service: "Wedding Photography Package",
      date: "2024-06-15",
      amount: 35000,
      status: "CONFIRMED"
    },
    {
      id: "2",
      customer: "Anita Sharma",
      event: "Rahul & Sneha Pre-Wedding",
      service: "Pre-Wedding Photoshoot",
      date: "2024-05-20",
      amount: 15000,
      status: "PENDING"
    },
    {
      id: "3",
      customer: "Mohammed Rizwan",
      event: "Fatima's Engagement",
      service: "Candid Photography",
      date: "2024-04-28",
      amount: 20000,
      status: "COMPLETED"
    },
    {
      id: "4",
      customer: "Lakshmi Narayanan",
      event: "Arun & Kavya Reception",
      service: "Wedding Photography Package",
      date: "2024-07-10",
      amount: 35000,
      status: "PENDING"
    }
  ],
  upcomingEvents: [
    {
      id: "1",
      title: "Priya & Karthik Wedding",
      date: "2024-06-15",
      time: "08:00 AM - 10:00 PM",
      location: "T Nagar, Chennai",
      service: "Wedding Photography"
    },
    {
      id: "2",
      title: "Rahul & Sneha Pre-Wedding",
      date: "2024-05-20",
      time: "06:00 AM - 09:00 AM",
      location: "ECR Beach, Chennai",
      service: "Pre-Wedding Shoot"
    },
    {
      id: "3",
      title: "TechCorp Annual Meet",
      date: "2024-09-20",
      time: "09:00 AM - 06:00 PM",
      location: "OMR, Chennai",
      service: "Event Videography"
    }
  ],
  notifications: [
    { id: "1", type: "booking", message: "New booking request from Rajesh Kumar", time: "2 hours ago", unread: true },
    { id: "2", type: "review", message: "New 5-star review from Fatima Mohammed", time: "1 day ago", unread: true },
    { id: "3", type: "payment", message: "Payment received of ₹35,000", time: "2 days ago", unread: false },
    { id: "4", type: "reminder", message: "Upcoming event tomorrow: Pre-Wedding Shoot", time: "3 days ago", unread: false }
  ],
  performance: {
    thisMonth: 285000,
    lastMonth: 245000,
    growth: 16.3,
    bookingsThisMonth: 12,
    bookingsLastMonth: 10,
    conversionRate: 78
  }
};

interface DashboardData {
  stats: typeof MOCK_DASHBOARD_DATA.stats;
  recentBookings: typeof MOCK_DASHBOARD_DATA.recentBookings;
  upcomingEvents: typeof MOCK_DASHBOARD_DATA.upcomingEvents;
  notifications: typeof MOCK_DASHBOARD_DATA.notifications;
  performance: typeof MOCK_DASHBOARD_DATA.performance;
}

export default function VendorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      setData(MOCK_DASHBOARD_DATA);
      setIsLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  const formatFullCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Confirmed</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Completed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case "review":
        return <Star className="h-4 w-4 text-yellow-600" />;
      case "payment":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "reminder":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-500">Manage your services, bookings, and grow your business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/vendor/services">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/vendor/profile">
              <Briefcase className="h-4 w-4 mr-2" />
              Update Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.totalBookings}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12% from last month</span>
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
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(data.stats.monthlyRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{data.performance.growth}% vs last month</span>
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
                <p className="text-sm font-medium text-gray-500">Active Services</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.activeServices}</p>
                <p className="text-sm text-gray-500 mt-2">of {data.stats.totalServices} total</p>
              </div>
              <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.averageRating}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-500">{data.stats.totalReviews} reviews</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-yellow-50 text-yellow-600">
                <Star className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Completion Rate</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{data.stats.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${data.stats.completionRate}%` }} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Response Rate</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{data.stats.responseRate}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${data.stats.responseRate}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{data.performance.conversionRate}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${data.performance.conversionRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Actions</CardTitle>
              <Badge className="bg-yellow-100 text-yellow-700">{data.stats.pendingBookings} pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentBookings.filter(b => b.status === "PENDING").map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.event}</p>
                      <p className="text-sm text-gray-500">{booking.customer} • {formatFullCurrency(booking.amount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/vendor/bookings">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {data.stats.pendingBookings === 0 && (
                <p className="text-center text-gray-500 py-4">No pending actions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Latest booking requests and updates</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/vendor/bookings">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{booking.event}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {booking.customer}
                        </span>
                        <span>•</span>
                        <span>{formatDate(booking.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatFullCurrency(booking.amount)}</p>
                      <p className="text-xs text-gray-500">{booking.service}</p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Scheduled events for next 30 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.upcomingEvents.map((event) => (
                <div key={event.id} className="p-4 border border-gray-100 rounded-lg hover:border-purple-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                      {event.date.split("-")[2]} {new Date(event.date).toLocaleDateString("en-IN", { month: "short" })}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>{event.service}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/vendor/bookings">
                <Calendar className="h-4 w-4 mr-2" />
                View Calendar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Recent updates and alerts</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              Mark all as read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                  notification.unread ? "bg-purple-50 border border-purple-100" : "bg-gray-50"
                }`}
              >
                <div className="p-2 bg-white rounded-full shadow-sm">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${notification.unread ? "font-medium text-gray-900" : "text-gray-600"}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                </div>
                {notification.unread && (
                  <div className="h-2 w-2 rounded-full bg-purple-600" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used actions for easy access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/vendor/services">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="font-medium">Add New Service</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/vendor/bookings">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="font-medium">View Bookings</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/vendor/profile">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="font-medium">Edit Profile</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/settings">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <Award className="h-5 w-5" />
                </div>
                <span className="font-medium">Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
