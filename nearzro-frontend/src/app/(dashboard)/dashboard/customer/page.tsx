"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, MapPin, Users, DollarSign,
  Plus, Search, CheckCircle2, AlertCircle, Package, Sparkles, Bell
} from "lucide-react";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import type { Event, EventStatus } from "@/types";
import { motion } from "framer-motion";

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalSpent: number;
  activeBookings: number;
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

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "CUSTOMER") {
      router.push("/dashboard/customer");
      return;
    }
    loadDashboardData(controller.signal);
    
    return () => controller.abort();
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const loadDashboardData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      
      const statsResponse = await api.get("/dashboard/customer/stats", { signal });
      const eventsResponse = await api.get("/events/my", { signal });
      
      const statsData = statsResponse?.data;
      const eventsData = extractArray<Event>(eventsResponse);
      setEvents(eventsData);

      setStats({
        totalEvents: statsData?.totalEvents ?? eventsData?.length ?? 0,
        upcomingEvents: statsData?.upcomingEvents ?? eventsData?.filter((e: Event) =>
          ["CONFIRMED", "IN_PROGRESS", "PENDING_PAYMENT"].includes(e.status)
        ).length ?? 0,
        totalSpent: statsData?.totalSpent ?? eventsData?.reduce((sum: number, e: Event) =>
          sum + (e.totalAmount || 0), 0
        ) ?? 0,
        activeBookings: statsData?.activeBookings ?? statsData?.upcomingEvents ?? 0,
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return; // Ignore abort errors
      }
      console.error("Dashboard error:", error);
      setStats({
        totalEvents: 0,
        upcomingEvents: 0,
        totalSpent: 0,
        activeBookings: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case "INQUIRY": return "bg-blue-950/30 text-blue-400 border-blue-700";
      case "PENDING_PAYMENT": return "bg-yellow-950/30 text-yellow-400 border-yellow-700";
      case "CONFIRMED": return "bg-emerald-950/30 text-emerald-400 border-emerald-700";
      case "IN_PROGRESS": return "bg-purple-950/30 text-purple-400 border-purple-700";
      case "COMPLETED": return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
      case "CANCELLED": return "bg-red-950/30 text-red-400 border-red-700";
      default: return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
    }
  };

  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case "INQUIRY": return <AlertCircle className="h-4 w-4" />;
      case "PENDING_PAYMENT": return <Clock className="h-4 w-4" />;
      case "CONFIRMED": return <CheckCircle2 className="h-4 w-4" />;
      case "IN_PROGRESS": return <Clock className="h-4 w-4" />;
      case "COMPLETED": return <CheckCircle2 className="h-4 w-4" />;
      case "CANCELLED": return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isProcessingOAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Welcome Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            Welcome back, {user?.name || "Customer"}! 👋
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage your events and bookings all in one place
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="premium"
            onClick={() => router.push("/dashboard/customer/create-event")}
            className="h-12 px-6"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Event
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          { title: "Total Events", value: stats?.totalEvents || 0, subtext: "All time events", icon: Calendar },
          { title: "Upcoming Events", value: stats?.upcomingEvents || 0, subtext: "Planning & booked", icon: Clock },
          { title: "Total Budget", value: `₹${(stats?.totalSpent || 0).toLocaleString()}`, subtext: "Across all events", icon: DollarSign },
          { title: "Active Bookings", value: stats?.activeBookings || 0, subtext: "Venues & vendors", icon: Package },
        ].map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-zinc-100">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-100">{stat.value}</div>
                <p className="text-xs text-zinc-500 mt-1">{stat.subtext}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="grid gap-4 md:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        {[
          { title: "Browse Venues", subtitle: "Find perfect spaces", icon: MapPin, href: "/venues" },
          { title: "Find Vendors", subtitle: "Expert services", icon: Users, href: "/vendors" },
          { title: "AI Planning", subtitle: "Smart recommendations", icon: Sparkles, href: "/plan-event" },
        ].map((action, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card 
              className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-1" 
              onClick={() => router.push(action.href)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                    <action.icon className="h-6 w-6 text-zinc-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{action.title}</p>
                    <p className="text-sm text-zinc-400">{action.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Events Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-zinc-100">Your Events</CardTitle>
                <CardDescription className="text-zinc-400">
                  Manage and track all your events
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search events..."
                    className="pl-9 w-64 bg-zinc-900 border-zinc-700 text-zinc-100"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="h-11 px-4 rounded-xl border border-zinc-700 bg-zinc-900 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="INQUIRY">Inquiry</option>
                  <option value="PENDING_PAYMENT">Pending Payment</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">No events found</h3>
                <p className="text-zinc-400 mb-6">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filters"
                    : "Start by creating your first event!"}
                </p>
                <Button variant="premium" onClick={() => router.push("/dashboard/customer/create-event")}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 bg-zinc-900/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-100 font-bold">
                        {event.eventType.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-100">{event.title || event.eventType}</h3>
                        <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {event.guestCount} guests
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`${getStatusColor(event.status)} border`}>
                        {getStatusIcon(event.status)}
                        <span className="ml-1 capitalize">{event.status.replace("_", " ")}</span>
                      </Badge>
                      <Button
                        variant="silver"
                        size="sm"
                        onClick={() => router.push(`/dashboard/customer/events/${event.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-zinc-100">Quick Tips</CardTitle>
            <CardDescription className="text-zinc-400">Make the most of NearZro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Sparkles, title: "Use AI Event Planner", desc: "Get personalized budget recommendations and vendor suggestions based on your event type and city" },
                { icon: Bell, title: "Stay Updated", desc: "Enable notifications to get real-time updates on your bookings and vendor responses" },
              ].map((tip, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <tip.icon className="h-5 w-5 text-zinc-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{tip.title}</p>
                    <p className="text-sm text-zinc-400 mt-1">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
