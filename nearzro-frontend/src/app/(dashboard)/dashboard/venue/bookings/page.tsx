"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { AvailabilityCalendar, type TimeSlot, type TimeSlotType } from "@/components/venues/availability-calendar";

interface Booking {
  id: string;
  customer: string;
  event: string;
  date: string;
  timeSlot: TimeSlotType;
  guests: number;
  baseAmount: number;
  finalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    customer: "Rajesh Kumar",
    event: "Priya & Karthik Wedding",
    date: "2024-06-15",
    timeSlot: "full_day",
    guests: 800,
    baseAmount: 150000,
    finalAmount: 150000,
    status: "confirmed"
  },
];

const TIME_SLOT_MULTIPLIERS: Record<TimeSlotType, number> = {
  morning: 0.6,
  evening: 0.8,
  full_day: 1.0,
  night: 0.7
};

const TIME_SLOT_LABELS: Record<TimeSlotType, string> = {
  morning: "Morning (6 AM - 12 PM)",
  evening: "Evening (4 PM - 10 PM)",
  full_day: "Full Day (6 AM - 12 AM)",
  night: "Night (8 PM - 2 AM)"
};

export default function VenueBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotType | null>(null);
  const [basePrice] = useState(150000);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.event.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDateSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot.type);
    const multiplier = TIME_SLOT_MULTIPLIERS[slot.type];
    const price = Math.round(basePrice * multiplier);
    toast.info(`Selected: ${slot.label}`, {
      description: `${date.toLocaleDateString()} - Price: ₹${price.toLocaleString("en-IN")}`
    });
  };

  const handleConfirmBooking = (bookingId: string) => {
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: "confirmed" as const } : b
    ));
    toast.success("Booking confirmed!", {
      description: "The customer has been notified."
    });
  };

  const handleRejectBooking = (bookingId: string) => {
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: "cancelled" as const } : b
    ));
    toast.success("Booking rejected", {
      description: "The customer has been notified."
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculatePrice = (slot: TimeSlotType) => {
    return Math.round(basePrice * TIME_SLOT_MULTIPLIERS[slot]);
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    revenue: bookings.filter(b => b.status === "confirmed" || b.status === "completed").reduce((sum, b) => sum + b.finalAmount, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black">Venue Bookings</h1>
        <p className="text-neutral-600">Manage your venue reservations</p>
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
                <p className="text-2xl font-bold text-black mt-1">₹{(stats.revenue / 100000).toFixed(2)}L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bookings List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-300" />
                  <Input
                    placeholder="Search by customer or event..."
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
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Bookings */}
          {filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-black">{booking.event}</h3>
                      {getStatusBadge(booking.status)}
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-silver-300" />
                        <div>
                          <p className="text-sm font-medium text-neutral-600">Customer</p>
                          <p className="text-black">{booking.customer}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-silver-300" />
                        <div>
                          <p className="text-sm font-medium text-neutral-600">Date</p>
                          <p className="text-black">{new Date(booking.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-silver-300" />
                        <div>
                          <p className="text-sm font-medium text-neutral-600">Amount</p>
                          <p className="text-black">₹{booking.finalAmount.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="h-4 w-4" />
                      <span>{TIME_SLOT_LABELS[booking.timeSlot]}</span>
                      <span>•</span>
                      <Users className="h-4 w-4" />
                      <span>{booking.guests} guests</span>
                    </div>
                  </div>

                  {booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmBooking(booking.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRejectBooking(booking.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Calendar & Pricing */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar
                venueId="venue-1"
                basePrice={basePrice}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
              />
            </CardContent>
          </Card>

          {selectedSlot && (
            <Card className="bg-gradient-to-r from-silver-50 to-silver-100 border-silver-200">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Selected Slot Pricing</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-700">Base Price:</span>
                    <span className="font-medium">₹{basePrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-700">Time Slot:</span>
                    <span className="font-medium capitalize">{selectedSlot.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-700">Multiplier:</span>
                    <span className="font-medium">{TIME_SLOT_MULTIPLIERS[selectedSlot] * 100}%</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold text-black">Final Price:</span>
                    <span className="text-2xl font-bold text-neutral-900">
                      ₹{calculatePrice(selectedSlot).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
