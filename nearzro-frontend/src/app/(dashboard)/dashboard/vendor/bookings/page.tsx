"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock, Eye, Phone, Mail, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

interface Booking {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventName: string;
  eventType: string;
  date: string;
  timeSlot: string;
  guestCount: number;
  baseRate: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  venueName?: string;
  venueAddress?: string;
  notes?: string;
  createdAt: string;
}

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      // Fetch vendor bookings from API
      const response = await api.get('/vendors/me/bookings');
      const data = response.data || [];

      // Transform backend data to frontend format
      const transformedBookings: Booking[] = data.map((booking: any) => ({
        id: booking.id,
        customerName: booking.user?.name || 'Unknown',
        customerEmail: booking.user?.email || '',
        customerPhone: booking.user?.phone || '',
        eventName: booking.slot?.eventTitle || booking.slot?.name || 'Event',
        eventType: booking.slot?.entityType === 'VENDOR' ? 'SERVICE' : 'VENUE',
        date: booking.slot?.date || '',
        timeSlot: booking.slot?.timeSlot || 'Full Day',
        guestCount: booking.guestCount || 0,
        baseRate: booking.totalAmount || 0,
        status: (booking.status || 'PENDING').toUpperCase() as any,
        venueName: booking.slot?.venue?.name,
        venueAddress: booking.slot?.venue?.address,
        notes: booking.notes,
        createdAt: booking.createdAt,
      }));

      setBookings(transformedBookings);
    } catch (error) {
      console.error("Failed to load bookings:", error);
      toast.error("Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const handleConfirmBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to confirm this booking?")) return;

    try {
      await api.patch(`/vendors/me/bookings/${bookingId}/status`, {
        status: 'CONFIRMED'
      });

      toast.success("Booking confirmed!", {
        description: "The customer has been notified via email and SMS."
      });

      // Reload bookings to show updated status
      loadBookings();
    } catch (error: any) {
      toast.error("Failed to confirm booking", {
        description: error?.response?.data?.message || "Please try again"
      });
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    const reason = prompt("Please provide a reason for rejection (optional):");

    try {
      await api.patch(`/vendors/me/bookings/${bookingId}/status`, {
        status: 'CANCELLED',
        reason: reason || undefined
      });

      toast.success("Booking rejected", {
        description: "The customer has been notified."
      });

      // Reload bookings
      loadBookings();
    } catch (error: any) {
      toast.error("Failed to reject booking", {
        description: error?.response?.data?.message || "Please try again"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "PENDING").length,
    confirmed: bookings.filter(b => b.status === "CONFIRMED").length,
    revenue: bookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED").reduce((sum, b) => sum + b.baseRate, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">My Bookings</h1>
          <p className="text-neutral-600 mt-1">View and manage your service bookings</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid gap-6 md:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-3xl font-bold text-black mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Confirmed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Revenue</p>
                <p className="text-3xl font-bold text-black mt-1">₹{(stats.revenue / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by customer, event, or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
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
      </motion.div>

      {/* Bookings List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Bookings ({filteredBookings.length})</CardTitle>
            <CardDescription className="text-neutral-600">Manage your service bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-10 w-10 text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No bookings found</h3>
                <p className="text-neutral-600">
                  {searchQuery || filterStatus !== "all" ? "Try adjusting your filters" : "Bookings will appear here once customers start booking"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-neutral-200 hover:border-neutral-300 transition-all bg-white">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-black">{booking.eventName}</h3>
                              {getStatusBadge(booking.status)}
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-start gap-2">
                                <Users className="h-5 w-5 text-neutral-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-neutral-600">Customer</p>
                                  <p className="text-black">{booking.customerName}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="h-5 w-5 text-neutral-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-neutral-600">Date</p>
                                  <p className="text-black">{new Date(booking.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <DollarSign className="h-5 w-5 text-neutral-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-neutral-600">Amount</p>
                                  <p className="text-black">₹{booking.baseRate.toLocaleString("en-IN")}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                              <Clock className="h-4 w-4" />
                              <span>{booking.timeSlot}</span>
                              <span>•</span>
                              <Users className="h-4 w-4" />
                              <span>{booking.guestCount} guests</span>
                            </div>

                            {booking.notes && (
                              <div className="mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                                <p className="text-sm text-neutral-700 italic">"{booking.notes}"</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(booking)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {booking.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmBooking(booking.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRejectBooking(booking.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">Booking Details</DialogTitle>
              <DialogDescription className="text-neutral-600">Complete information about this booking</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Event Info */}
              <div>
                <h4 className="font-semibold text-lg mb-3 text-black">{selectedBooking.eventName}</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Event Type</p>
                    <p className="text-black">{selectedBooking.eventType}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Date & Time</p>
                    <p className="text-black">
                      {new Date(selectedBooking.date).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-black">{selectedBooking.timeSlot}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Location</p>
                    <p className="text-black">{selectedBooking.venueName ? `${selectedBooking.venueName}` : selectedBooking.venueAddress || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Guest Count</p>
                    <p className="text-black">{selectedBooking.guestCount} guests</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="font-semibold text-lg mb-3 text-black">Customer Information</h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Name</p>
                    <p className="text-black">{selectedBooking.customerName}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Email</p>
                    <div className="flex items-center gap-2 text-black">
                      <Mail className="h-4 w-4" />
                      <span>{selectedBooking.customerEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Phone</p>
                    <div className="flex items-center gap-2 text-black">
                      <Phone className="h-4 w-4" />
                      <span>{selectedBooking.customerPhone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div>
                <h4 className="font-semibold text-lg mb-3 text-black">Booking Details</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Status</p>
                    <div>{getStatusBadge(selectedBooking.status)}</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Amount</p>
                    <p className="text-black font-semibold">₹{selectedBooking.baseRate.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-black">Customer Notes</h4>
                  <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <p className="text-neutral-700 italic">"{selectedBooking.notes}"</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
