"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, MapPin, Users, DollarSign, Search,
  CheckCircle2, AlertCircle, Package, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

interface Booking {
  id: number;
  eventId: number;
  venueName?: string;
  vendorName?: string;
  serviceName?: string;
  date: string;
  timeSlot: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  createdAt: string;
}

export default function CustomerBookingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadBookings();
  }, [isAuthenticated, router]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/bookings/my");
      setBookings(response.data || []);
    } catch (error: any) {
      console.error("Error loading bookings:", error);
      toast.error(error?.response?.data?.message || "Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.venueName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.serviceName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CONFIRMED": return "bg-green-100 text-green-800 border-green-200";
      case "COMPLETED": return "bg-blue-100 text-blue-800 border-blue-200";
      case "CANCELLED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING": return <Clock className="h-4 w-4" />;
      case "CONFIRMED": return <CheckCircle2 className="h-4 w-4" />;
      case "COMPLETED": return <CheckCircle2 className="h-4 w-4" />;
      case "CANCELLED": return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/dashboard/customer")} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">My Bookings</h1>
          <p className="text-neutral-600">View and manage all your venue and vendor bookings</p>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 border-silver-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-10 px-4 rounded-lg border border-neutral-200 bg-white text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full border-4 border-silver-800 border-t-silver-400 animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">Loading your bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="border-silver-200">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No bookings found</h3>
              <p className="text-neutral-600 mb-6">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start by booking venues and vendors for your events"}
              </p>
              <Button variant="premium" onClick={() => router.push("/venues")}>
                Browse Venues
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-silver-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-white font-bold">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-black text-lg">
                            {booking.venueName || booking.vendorName || booking.serviceName || "Booking"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-neutral-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(booking.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.timeSlot.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(booking.status)} border`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status.toLowerCase()}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-6 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{booking.totalAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Booked on {new Date(booking.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="silver"
                          size="sm"
                          onClick={() => toast.info("Booking details coming soon")}
                        >
                          View Details
                        </Button>
                        {booking.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => toast.info("Cancellation coming soon")}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
