"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock,
  Eye, Phone, Mail, AlertCircle, TrendingUp, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { type TimeSlotType } from "@/components/venues/availability-calendar";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface Booking {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventName: string;
  eventType: string;
  date: string;
  timeSlot: TimeSlotType;
  guests: number;
  baseAmount: number;
  finalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
  venueName: string;
  createdAt: string;
  notes?: string;
  slot?: any;
}

const TIME_SLOT_LABELS: Record<TimeSlotType, string> = {
  morning: "Morning (6:00 AM - 12:00 PM)",
  evening: "Evening (4:00 PM - 10:00 PM)",
  full_day: "Full Day (6:00 AM - 12:00 AM)",
  night: "Night (8:00 PM - 2:00 AM)"
};

export default function VenueBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVenue, setFilterVenue] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "cancel" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [venues, setVenues] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    loadBookings();
    loadVenues();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      // Fetch venue bookings from API
      const response = await api.get('/venues/me/bookings');
      const data = response.data || [];

      // Transform backend data to frontend format
      const transformedBookings: Booking[] = data.map((booking: any) => ({
        id: booking.id,
        customerName: booking.user?.name || 'Unknown',
        customerEmail: booking.user?.email || '',
        customerPhone: booking.user?.phone || '',
        eventName: booking.slot?.eventTitle || booking.slot?.name || 'Event',
        eventType: booking.slot?.entityType === 'VENUE' ? 'VENUE' : 'SERVICE',
        date: booking.slot?.date || '',
        timeSlot: (booking.slot?.timeSlot || 'evening') as any,
        guests: booking.guestCount || 0,
        baseAmount: booking.totalAmount || 0,
        finalAmount: booking.totalAmount || 0,
        status: (booking.status || 'pending').toLowerCase() as any,
        venueName: booking.slot?.venue?.name,
        notes: booking.notes,
        createdAt: booking.createdAt,
        slot: booking.slot || booking,
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

  const loadVenues = async () => {
    try {
      const response = await api.get('/venues/my');
      setVenues(response.data || []);
    } catch (error) {
      console.error("Failed to load venues:", error);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    const matchesVenue = filterVenue === "all" || booking.venueName === filterVenue;
    return matchesSearch && matchesStatus && matchesVenue;
  });

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setViewDialogOpen(true);
  };

  const handleActionClick = (booking: Booking, type: "approve" | "reject" | "cancel") => {
    setSelectedBooking(booking);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedBooking || !actionType) return;

    setActionLoading(true);
    try {
      const newStatus: "CONFIRMED" | "CANCELLED" | "REJECTED" =
        actionType === "approve" ? "CONFIRMED" :
        actionType === "cancel" ? "CANCELLED" : "REJECTED";

      // Call the booking status update API
      await api.patch(`/venues/me/bookings/${selectedBooking.id}/status`, {
        status: newStatus
      });

      // Update local state
      setBookings(bookings.map(b =>
        b.id === selectedBooking.id ? { ...b, status: newStatus.toLowerCase() as any } : b
      ));

      const messages = {
        approve: "Booking confirmed successfully! Customer has been notified.",
        reject: "Booking rejected. Customer has been notified.",
        cancel: "Booking cancelled. Customer has been notified."
      };
      toast.success(messages[actionType]);

      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedBooking(null);
    } catch (error: any) {
      console.error("Action error:", error);
      toast.error(error?.response?.data?.message || `Failed to ${actionType} booking`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    revenue: bookings.filter(b => b.status === "confirmed" || b.status === "completed").reduce((sum, b) => sum + (b.finalAmount ?? 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-800 border-t-neutral-400 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Venue Bookings</h1>
          <p className="text-neutral-600">Manage your venue reservations and requests</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-neutral-200 bg-white hover:shadow-xl hover:shadow-black/10 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Total Bookings</p>
                <p className="text-2xl font-bold text-black mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-100 text-neutral-700 shadow-lg shadow-black/10">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Confirmed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Completed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Revenue</p>
                <p className="text-2xl font-bold text-black mt-1">Rs{(stats.revenue / 100000).toFixed(2)}L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by customer name, email, or event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-black"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {venues.length > 0 && (
                <select
                  value={filterVenue}
                  onChange={(e) => setFilterVenue(e.target.value)}
                  className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  <option value="all">All Venues</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bookings List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No bookings found</h3>
              <p className="text-neutral-600">
                {searchQuery || filterStatus !== "all" ? "Try adjusting your filters" : "Bookings will appear here once customers start booking"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="table-row-hover overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-xl font-bold text-black">{booking.eventName}</h3>
                        {getStatusBadge(booking.status)}
                        <Badge variant="outline" className="text-black">
                          {booking.eventType}
                        </Badge>
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-start gap-2">
                          <Users className="h-5 w-5 text-neutral-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-black">Customer</p>
                            <p className="text-black font-medium">{booking.customerName}</p>
                            <div className="flex items-center gap-2 text-sm text-neutral-600 mt-1">
                              <Phone className="h-3 w-3" />
                              {booking.customerPhone}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-neutral-600 mt-1">
                              <Mail className="h-3 w-3" />
                              {booking.customerEmail}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-5 w-5 text-neutral-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-black">Date & Time</p>
                            <p className="text-black font-medium">
                              {new Date(booking.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                            </p>
                            <p className="text-sm text-neutral-600 mt-1">{booking.slot?.meta?.startTime && booking.slot?.meta?.endTime
                              ? `${booking.slot.meta.startTime} – ${booking.slot.meta.endTime}`
                              : TIME_SLOT_LABELS[booking.timeSlot] || booking.timeSlot}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <DollarSign className="h-5 w-5 text-neutral-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-black">Amount</p>
                            <p className="text-black font-bold text-lg">Rs{booking.finalAmount.toLocaleString("en-IN")}</p>
                            <p className="text-sm text-neutral-600">
                              {booking.guests} guests - {booking.venueName}
                            </p>
                          </div>
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Customer Notes</p>
                            <p className="text-sm text-amber-700 mt-0.5">{booking.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:border-l lg:border-neutral-200 lg:pl-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBooking(booking)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {booking.status === "pending" && (
                        <>
                          <Button
                            onClick={() => handleActionClick(booking, "approve")}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleActionClick(booking, "reject")}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            size="sm"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {(booking.status === "confirmed" || booking.status === "pending") && (
                        <Button
                          variant="outline"
                          onClick={() => handleActionClick(booking, "cancel")}
                          className="w-full text-neutral-600 hover:text-neutral-700"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* View Booking Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription className="text-neutral-600">
              Complete information about the booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-black">{selectedBooking.eventName}</h3>
                {getStatusBadge(selectedBooking.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-black">Customer</p>
                  <p className="text-black font-medium">{selectedBooking.customerName}</p>
                  <p className="text-sm text-neutral-600">{selectedBooking.customerEmail}</p>
                  <p className="text-sm text-neutral-600">{selectedBooking.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Event Details</p>
                  <p className="text-black">{selectedBooking.eventType}</p>
                  <p className="text-sm text-neutral-600">
                    {new Date(selectedBooking.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <p className="text-sm text-neutral-600">{selectedBooking.slot?.meta?.startTime && selectedBooking.slot?.meta?.endTime
                    ? `${selectedBooking.slot.meta.startTime} – ${selectedBooking.slot.meta.endTime}`
                    : TIME_SLOT_LABELS[selectedBooking.timeSlot] || selectedBooking.timeSlot}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Venue</p>
                  <p className="text-black">{selectedBooking.venueName}</p>
                  <p className="text-sm text-neutral-600">{selectedBooking.guests} guests</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Payment</p>
                  <p className="text-black font-bold text-lg">Rs{selectedBooking.finalAmount.toLocaleString("en-IN")}</p>
                  <p className="text-sm text-neutral-600">Booked on {new Date(selectedBooking.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-sm font-medium text-black mb-1">Notes</p>
                  <p className="text-sm text-black">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            {selectedBooking?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleActionClick(selectedBooking, "reject");
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleActionClick(selectedBooking, "approve");
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {actionType === "reject" && <XCircle className="h-5 w-5 text-red-600" />}
              {actionType === "cancel" && <AlertCircle className="h-5 w-5 text-amber-600" />}
              {actionType === "approve" && "Confirm Approval"}
              {actionType === "reject" && "Confirm Rejection"}
              {actionType === "cancel" && "Confirm Cancellation"}
            </DialogTitle>
            <DialogDescription className="text-neutral-600">
              {actionType === "approve" && "This will confirm the booking and notify the customer."}
              {actionType === "reject" && "This will reject the booking and notify the customer."}
              {actionType === "cancel" && "This will cancel the confirmed booking and notify the customer."}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <p className="text-sm text-neutral-600 mb-2">Booking:</p>
              <p className="font-semibold text-black">{selectedBooking.eventName}</p>
              <p className="text-sm text-neutral-600 mt-2">Customer:</p>
              <p className="font-medium text-black">{selectedBooking.customerName}</p>
              <p className="text-sm text-neutral-600 mt-2">Date:</p>
              <p className="font-medium text-black">
                {new Date(selectedBooking.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionLoading}
              className={
                actionType === "approve" ? "bg-green-600 hover:bg-green-700 text-white" :
                actionType === "reject" ? "bg-red-600 hover:bg-red-700 text-white" :
                "bg-amber-600 hover:bg-amber-700 text-white"
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" && <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {actionType === "reject" && <XCircle className="h-4 w-4 mr-2" />}
                  {actionType === "cancel" && <AlertCircle className="h-4 w-4 mr-2" />}
                  {actionType === "approve" && "Confirm Approval"}
                  {actionType === "reject" && "Confirm Rejection"}
                  {actionType === "cancel" && "Confirm Cancellation"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
