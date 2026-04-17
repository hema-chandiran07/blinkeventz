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
    <motion.div
      className="venue-dashboard space-y-8 p-8 bg-[#0a0a0b] text-white selection:bg-blue-500/30 min-h-screen"
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
          <h1 className="text-3xl font-bold text-black">
            Venue Owner Dashboard 🏢
          </h1>
          <p className="text-neutral-600 mt-1">
            Manage your venues and bookings
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={() => router.push("/dashboard/venue/details?new=true")}
            className="h-12 px-6 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Venue
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
          { title: "Total Venues", value: stats?.totalVenues || 0, subtext: "Active listings", icon: Building },
          { title: "Active Bookings", value: stats?.activeBookings || 0, subtext: "Pending & confirmed", icon: Calendar },
          { title: "Total Revenue", value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`, subtext: "All time earnings", icon: DollarSign },
          { title: "Pending Requests", value: stats?.pendingRequests || 0, subtext: "Awaiting approval", icon: Clock },
        ].map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="border-neutral-200 bg-gradient-to-br from-white to-neutral-50 hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-black">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-neutral-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stat.value}</div>
                <p className="text-xs text-neutral-600 mt-1">{stat.subtext}</p>
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
          { title: "My Venues", subtitle: "Manage properties", icon: Building, href: "/dashboard/venue/details" },
          { title: "Bookings", subtitle: "View all requests", icon: CheckCircle2, href: "/dashboard/venue/bookings" },
          { title: "Calendar", subtitle: "Check availability", icon: Calendar, href: "/dashboard/venue/calendar" },
          { title: "Analytics", subtitle: "Performance data", icon: BarChart3, href: "/dashboard/venue/analytics" },
          { title: "Payouts", subtitle: "Manage earnings", icon: DollarSign, href: "/dashboard/venue/payouts" },
          { title: "KYC & Bank", subtitle: "Compliance", icon: Star, href: "/dashboard/venue/kyc" },
        ].map((action, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card
              className="border-neutral-200 bg-gradient-to-br from-white to-neutral-50 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
              onClick={() => router.push(action.href)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shadow-lg">
                    <action.icon className="h-6 w-6 text-neutral-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">{action.title}</p>
                    <p className="text-sm text-neutral-600">{action.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Venues List */}
      <motion.div variants={itemVariants} id="venues">
        <Card className="border-neutral-200 bg-gradient-to-br from-white to-neutral-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black">Your Venues</CardTitle>
                <CardDescription className="text-neutral-600">
                  Manage your property listings
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search venues..."
                  className="pl-9 w-64 text-black"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {venues.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-black mb-2">No venues yet</h3>
                <p className="text-neutral-600 mb-6">
                  Start by adding your first venue listing
                </p>
                <Button variant="default" onClick={() => router.push("/dashboard/venue/details")} className="text-white">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Venue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {venues.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map((venue) => (
                  <div
                    key={venue.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:shadow-lg hover:border-neutral-300 transition-all duration-300 bg-gradient-to-r from-neutral-50 to-transparent"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center text-black font-bold shadow-lg">
                        {venue.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">{venue.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-neutral-600 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {venue.area}, {venue.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ₹{venue.basePriceEvening.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={
                        venue.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-300" :
                        venue.status === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-700 border-amber-300" :
                        "bg-neutral-100 text-neutral-700 border-neutral-300"
                      }>
                        {venue.status.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/venue/details?id=${venue.id}`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200 bg-gradient-to-br from-white to-neutral-50">
          <CardHeader>
            <CardTitle className="text-black">Maximize Your Bookings</CardTitle>
            <CardDescription className="text-neutral-600">Tips for venue success</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Star, title: "Keep Calendar Updated", desc: "Regularly update your availability to avoid booking conflicts and improve customer satisfaction" },
                { icon: Building, title: "Showcase Your Venue", desc: "Add high-quality photos and detailed descriptions to attract more bookings" },
              ].map((tip, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <tip.icon className="h-5 w-5 text-neutral-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">{tip.title}</p>
                    <p className="text-sm text-neutral-600 mt-1">{tip.desc}</p>
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
