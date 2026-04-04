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
  CheckCircle2, Clock, Star, MapPin
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
      router.push("/dashboard/venue");
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
        const venuesResponse = await api.get('/venues/my');
        setVenues(venuesResponse.data || []);
      } catch (error) {
        console.warn("Could not fetch venues");
        setVenues([]);
      }

      try {
        const statsResponse = await api.get('/venues/venue-owner/stats');
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
          <h1 className="text-3xl font-bold text-white">
            Venue Owner Dashboard 🏢
          </h1>
          <p className="text-silver-400 mt-1">
            Manage your venues and bookings
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="premium"
            onClick={() => router.push("/dashboard/venue/details")}
            className="h-12 px-6"
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
            <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50 hover:shadow-xl hover:shadow-black/30 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-silver-300 mt-1">{stat.subtext}</p>
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
        ].map((action, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card 
              className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 cursor-pointer hover:-translate-y-1" 
              onClick={() => router.push(action.href)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-silver-700 to-silver-800 flex items-center justify-center shadow-lg shadow-black/20">
                    <action.icon className="h-6 w-6 text-silver-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{action.title}</p>
                    <p className="text-sm text-silver-400">{action.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Venues List */}
      <motion.div variants={itemVariants} id="venues">
        <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white">Your Venues</CardTitle>
                <CardDescription>
                  Manage your property listings
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
                <Input
                  placeholder="Search venues..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {venues.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-silver-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No venues yet</h3>
                <p className="text-silver-400 mb-6">
                  Start by adding your first venue listing
                </p>
                <Button variant="premium" onClick={() => router.push("/dashboard/venue/details")}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Venue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {venues.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map((venue) => (
                  <div
                    key={venue.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-silver-800 hover:shadow-lg hover:shadow-black/20 hover:border-silver-700 transition-all duration-300 bg-gradient-to-r from-silver-900/30 to-transparent"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-silver-600 to-silver-800 flex items-center justify-center text-white font-bold shadow-lg shadow-black/20">
                        {venue.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{venue.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-silver-400 mt-1">
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
                        venue.status === "ACTIVE" ? "bg-green-900/50 text-green-300 border-green-700" :
                        venue.status === "PENDING_APPROVAL" ? "bg-yellow-900/50 text-yellow-300 border-yellow-700" :
                        "bg-silver-800/50 text-silver-300 border-silver-600"
                      }>
                        {venue.status.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="silver"
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
        <Card className="border-silver-800 bg-gradient-to-br from-silver-900/30 to-silver-950/30">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Maximize Your Bookings</CardTitle>
            <CardDescription>Tips for venue success</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Star, title: "Keep Calendar Updated", desc: "Regularly update your availability to avoid booking conflicts and improve customer satisfaction" },
                { icon: Building, title: "Showcase Your Venue", desc: "Add high-quality photos and detailed descriptions to attract more bookings" },
              ].map((tip, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-silver-900/50 border border-silver-800">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-silver-600 to-silver-800 flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20">
                    <tip.icon className="h-5 w-5 text-silver-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tip.title}</p>
                    <p className="text-sm text-silver-400 mt-1">{tip.desc}</p>
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
