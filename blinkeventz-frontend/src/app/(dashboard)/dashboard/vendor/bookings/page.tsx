"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock, Eye, Phone, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Booking {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  event: {
    title: string;
    eventType: string;
    date: string;
    timeSlot: string;
    city: string;
    area: string;
    guestCount: number;
    venue?: {
      name: string;
      address: string;
    };
  };
  service: {
    name: string;
    serviceType: string;
    baseRate: number;
  };
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: string;
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    customer: {
      name: "Rajesh Kumar",
      email: "rajesh.kumar@email.com",
      phone: "+91 98765 43210"
    },
    event: {
      title: "Priya & Karthik Wedding",
      eventType: "WEDDING",
      date: "2024-06-15",
      timeSlot: "08:00 AM - 10:00 PM",
      city: "Chennai",
      area: "T Nagar",
      guestCount: 800,
      venue: {
        name: "Grand Ballroom ITC Grand Chola",
        address: "63, Mount Road, Guindy, Chennai"
      }
    },
    service: {
      name: "Wedding Photography Package",
      serviceType: "PHOTOGRAPHY",
      baseRate: 35000
    },
    status: "CONFIRMED",
    notes: "Client wants candid shots throughout the event",
    createdAt: "2024-02-10T10:30:00Z"
  },
  {
    id: "2",
    customer: {
      name: "Anita Sharma",
      email: "anita.sharma@email.com",
      phone: "+91 91234 56789"
    },
    event: {
      title: "Rahul & Sneha Pre-Wedding",
      eventType: "PRE_WEDDING",
      date: "2024-05-20",
      timeSlot: "06:00 AM - 09:00 AM",
      city: "Chennai",
      area: "ECR Beach",
      guestCount: 10
    },
    service: {
      name: "Pre-Wedding Photoshoot",
      serviceType: "PHOTOGRAPHY",
      baseRate: 15000
    },
    status: "PENDING",
    notes: "Sunrise shoot at beach location",
    createdAt: "2024-02-15T09:00:00Z"
  }
];

export default function VendorBookingsPage() {
  const [bookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const handleConfirmBooking = (bookingId: string) => {
    toast.success("Booking confirmed!", {
      description: "The customer has been notified via email and SMS."
    });
  };

  const handleRejectBooking = (bookingId: string) => {
    toast.success("Booking rejected", {
      description: "The customer has been notified."
    });
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
    revenue: bookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED").reduce((sum, b) => sum + b.service.baseRate, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black">My Bookings</h1>
        <p className="text-neutral-600">View and manage your service bookings</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-2xl font-bold text-black mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-silver-100 text-neutral-700">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Revenue</p>
                <p className="text-2xl font-bold text-black mt-1">₹{(stats.revenue / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-300" />
              <Input
                placeholder="Search by customer, event, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-full border border-silver-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
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
      <div className="grid gap-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-black">{booking.event.title}</h3>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-silver-300 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Customer</p>
                        <p className="text-black">{booking.customer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-silver-300 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Date</p>
                        <p className="text-black">{new Date(booking.event.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <DollarSign className="h-5 w-5 text-silver-300 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Service</p>
                        <p className="text-black">₹{booking.service.baseRate.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Clock className="h-4 w-4" />
                    <span>{booking.event.timeSlot}</span>
                    <span>•</span>
                    <Users className="h-4 w-4" />
                    <span>{booking.event.guestCount} guests</span>
                  </div>

                  {booking.notes && (
                    <div className="mt-3 p-3 bg-silver-50 rounded-lg">
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
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectBooking(booking.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>Complete information about this booking</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Event Info */}
              <div>
                <h4 className="font-semibold text-lg mb-3">{selectedBooking.event.title}</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Event Type</p>
                    <p className="text-black">{selectedBooking.event.eventType}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Date & Time</p>
                    <p className="text-black">
                      {new Date(selectedBooking.event.date).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-black">{selectedBooking.event.timeSlot}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Location</p>
                    <p className="text-black">{selectedBooking.event.area}, {selectedBooking.event.city}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Guest Count</p>
                    <p className="text-black">{selectedBooking.event.guestCount} guests</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Customer Information</h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Name</p>
                    <p className="text-black">{selectedBooking.customer.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Email</p>
                    <div className="flex items-center gap-2 text-black">
                      <Mail className="h-4 w-4" />
                      <span>{selectedBooking.customer.email}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Phone</p>
                    <div className="flex items-center gap-2 text-black">
                      <Phone className="h-4 w-4" />
                      <span>{selectedBooking.customer.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Service Details</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Service Name</p>
                    <p className="text-black">{selectedBooking.service.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Service Type</p>
                    <Badge variant="secondary">{selectedBooking.service.serviceType}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Base Rate</p>
                    <p className="text-black font-semibold">₹{selectedBooking.service.baseRate.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Venue Info (if applicable) */}
              {selectedBooking.event.venue && (
                <div>
                  <h4 className="font-semibold text-lg mb-3">Venue Information</h4>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-600">Venue Name</p>
                    <p className="text-black">{selectedBooking.event.venue.name}</p>
                    <p className="text-sm text-neutral-600">{selectedBooking.event.venue.address}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <h4 className="font-semibold text-lg mb-3">Customer Notes</h4>
                  <div className="p-4 bg-silver-50 rounded-lg">
                    <p className="text-neutral-800 italic">"{selectedBooking.notes}"</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
