"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, DollarSign, Search,
  CheckCircle2, AlertCircle, Package, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { motion } from "framer-motion";

interface Booking {
  id: number;
  eventId?: number;
  slot?: {
    venue?: {
      name?: string;
    };
    vendor?: {
      name?: string;
    };
    date: string;
    timeSlot: string;
  };
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
    const controller = new AbortController();
    loadBookings(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, router]);

  const loadBookings = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get("/booking/my", { signal });
      const bookingsData = extractArray<Booking>(response);
      setBookings(bookingsData);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Error loading bookings:", error);
      toast.error(error?.response?.data?.message || "Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const venueName = booking.slot?.venue?.name;
    const vendorName = booking.slot?.vendor?.name;
    const matchesSearch = venueName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-950/30 text-yellow-400 border-yellow-700";
      case "CONFIRMED": return "bg-emerald-950/30 text-emerald-400 border-emerald-700";
      case "COMPLETED": return "bg-blue-950/30 text-blue-400 border-blue-700";
      case "CANCELLED": return "bg-red-950/30 text-red-400 border-red-700";
      default: return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
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
      <Button variant="ghost" onClick={() => router.push("/dashboard/customer")} className="mb-6 gap-2 text-zinc-300 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">My Bookings</h1>
          <p className="text-zinc-400">View and manage all your venue and vendor bookings</p>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-10 px-4 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-100"
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
            <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading your bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">No bookings found</h3>
              <p className="text-zinc-400 mb-6">
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
                <Card className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-zinc-100 text-lg">
                            {booking.slot?.venue?.name || booking.slot?.vendor?.name || "Booking TBA"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              }) : "Date TBA"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.slot?.timeSlot?.replace("_", " ") || "Time TBA"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(booking.status)} border`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status.toLowerCase()}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-6 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{(booking.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Booked on {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-IN") : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="silver"
                          size="sm"
                          disabled
                          className="opacity-50 cursor-not-allowed"
                        >
                          View Details
                        </Button>
                        {booking.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="text-red-400 opacity-50 cursor-not-allowed"
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
