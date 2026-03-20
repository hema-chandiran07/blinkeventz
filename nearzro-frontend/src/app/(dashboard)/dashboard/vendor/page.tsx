"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package, Calendar, DollarSign, Plus, Search,
  CheckCircle2, Clock, Star, Sparkles, Bell
} from "lucide-react";
import type { VendorService } from "@/types";
import { motion } from "framer-motion";

interface DashboardStats {
  totalServices: number;
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

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<VendorService[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "VENDOR") {
      router.push("/dashboard/vendor");
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, user, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // For now, use mock data since backend endpoint may not exist
      // TODO: Replace with actual API call when endpoint is ready
      const mockServices: VendorService[] = [
        {
          id: 1,
          vendorId: 1,
          name: "Premium Photography Package",
          serviceType: "PHOTOGRAPHY",
          pricingModel: "PER_EVENT",
          baseRate: 50000,
          minGuests: null,
          maxGuests: null,
          description: null,
          inclusions: null,
          exclusions: null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setServices(mockServices);

      setStats({
        totalServices: mockServices.length,
        activeBookings: 3,
        totalEarnings: 150000,
        pendingRequests: 2,
      });
    } catch (error) {
      console.error("Dashboard load error:", error);
      // Set default stats on error
      setStats({
        totalServices: 0,
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
            Vendor Dashboard 🎯
          </h1>
          <p className="text-silver-400 mt-1">
            Manage your services and bookings
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="premium"
            onClick={() => router.push("/dashboard/vendor/services")}
            className="h-12 px-6"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Service
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
          { title: "Total Services", value: stats?.totalServices || 0, subtext: "Active listings", icon: Package },
          { title: "Active Bookings", value: stats?.activeBookings || 0, subtext: "Pending & confirmed", icon: Calendar },
          { title: "Total Earnings", value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`, subtext: "All time revenue", icon: DollarSign },
          { title: "Pending Requests", value: stats?.pendingRequests || 0, subtext: "Awaiting response", icon: Clock },
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
          { title: "My Services", subtitle: "Manage listings", icon: Package, href: "/dashboard/vendor/services" },
          { title: "Bookings", subtitle: "View all requests", icon: CheckCircle2, href: "/dashboard/vendor/bookings" },
          { title: "Calendar", subtitle: "Check availability", icon: Calendar, href: "/dashboard/vendor/calendar" },
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

      {/* Services List */}
      <motion.div variants={itemVariants}>
        <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white">Your Services</CardTitle>
                <CardDescription>
                  Manage your service listings
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
                <Input
                  placeholder="Search services..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-silver-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No services yet</h3>
                <p className="text-silver-400 mb-6">
                  Start by adding your first service listing
                </p>
                <Button variant="premium" onClick={() => router.push("/dashboard/vendor/services")}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-silver-800 hover:shadow-lg hover:shadow-black/20 hover:border-silver-700 transition-all duration-300 bg-gradient-to-r from-silver-900/30 to-transparent"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-silver-600 to-silver-800 flex items-center justify-center text-white font-bold shadow-lg shadow-black/20">
                        {service.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{service.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-silver-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {service.serviceType}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ₹{service.baseRate.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={service.isActive ? "bg-green-900/50 text-green-300 border-green-700" : "bg-silver-800/50 text-silver-300 border-silver-600"}>
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="silver"
                        size="sm"
                        onClick={() => router.push(`/dashboard/vendor/services/${service.id}`)}
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
            <CardTitle className="text-2xl text-white">Grow Your Business</CardTitle>
            <CardDescription>Tips for vendor success</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Sparkles, title: "Complete Your Profile", desc: "Add detailed service descriptions, high-quality photos, and clear pricing to attract more customers" },
                { icon: Bell, title: "Respond Quickly", desc: "Fast responses to booking requests improve your visibility and customer satisfaction" },
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
