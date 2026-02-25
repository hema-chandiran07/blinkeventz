"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Building2,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  Eye,
  Plus,
  Edit2,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AvailabilityCalendar } from "@/components/venues/availability-calendar";
import type { TimeSlot } from "@/components/venues/availability-calendar";

interface VenueStats {
  totalBookings: number;
  pendingInquiries: number;
  monthlyRevenue: number;
  totalViews: number;
  averageRating: number;
  totalReviews: number;
  occupancyRate: number;
}

interface VenueBooking {
  id: string;
  customer: string;
  event: string;
  date: string;
  timeSlot: string;
  amount: number;
  status: string;
  guests: number;
}

const MOCK_VENUE_DATA = {
  name: "Grand Ballroom ITC Grand Chola",
  address: "63, Mount Road, Guindy, Chennai",
  capacity: 2000,
  basePrice: 150000,
  stats: {
    totalBookings: 24,
    pendingInquiries: 5,
    monthlyRevenue: 425000,
    totalViews: 1234,
    averageRating: 4.8,
    totalReviews: 89,
    occupancyRate: 78
  } as VenueStats,
  upcomingBookings: [
    {
      id: "1",
      customer: "Rajesh Kumar",
      event: "Priya & Karthik Wedding",
      date: "2024-06-15",
      timeSlot: "08:00 AM - 10:00 PM",
      amount: 150000,
      status: "CONFIRMED",
      guests: 800
    },
    {
      id: "2",
      customer: "Anita Sharma",
      event: "Rahul & Sneha Reception",
      date: "2024-05-20",
      timeSlot: "06:00 PM - 11:00 PM",
      amount: 120000,
      status: "PENDING",
      guests: 500
    },
    {
      id: "3",
      customer: "Mohammed Rizwan",
      event: "Fatima's Engagement",
      date: "2024-04-28",
      timeSlot: "04:00 PM - 09:00 PM",
      amount: 100000,
      status: "CONFIRMED",
      guests: 300
    }
  ] as VenueBooking[]
};

export default function VenueDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "evening" | "full_day" | "night" | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  const formatFullCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleDateSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot.type);
    toast.info(`Selected: ${slot.label} on ${date.toLocaleDateString()}`, {
      description: `Price: ₹${Math.round(MOCK_VENUE_DATA.basePrice * slot.multiplier).toLocaleString("en-IN")}`
    });
  };

  const handleBlockSlot = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and time slot first");
      return;
    }
    toast.success("Slot blocked successfully", {
      description: `${selectedDate.toLocaleDateString()} - ${selectedSlot} is now blocked`
    });
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venue Dashboard</h1>
          <p className="text-gray-500">Manage your venue, availability, and bookings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/venue/details">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Venue
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/venue/calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Calendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Venue Info Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-full bg-white shadow-md">
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{MOCK_VENUE_DATA.name}</h2>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{MOCK_VENUE_DATA.address}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-gray-600">Capacity: {MOCK_VENUE_DATA.capacity} guests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600">{MOCK_VENUE_DATA.stats.averageRating} ({MOCK_VENUE_DATA.stats.totalReviews} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Base Price</p>
              <p className="text-3xl font-bold text-purple-600">{formatCurrency(MOCK_VENUE_DATA.basePrice)}</p>
              <p className="text-sm text-gray-500">per day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Upcoming Bookings</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{MOCK_VENUE_DATA.stats.totalBookings}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8 this month</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-purple-50 text-purple-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Inquiries</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{MOCK_VENUE_DATA.stats.pendingInquiries}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-yellow-600">
                  <Clock className="h-4 w-4" />
                  <span>5 need response</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-yellow-50 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(MOCK_VENUE_DATA.stats.monthlyRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+15% vs last month</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{MOCK_VENUE_DATA.stats.totalViews.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                  <Eye className="h-4 w-4" />
                  <span>{MOCK_VENUE_DATA.stats.occupancyRate}% occupancy</span>
                </div>
              </div>
              <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Availability Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Availability Calendar</CardTitle>
                <CardDescription>Manage your venue availability and block dates</CardDescription>
              </div>
              {selectedDate && selectedSlot && (
                <Button variant="destructive" size="sm" onClick={handleBlockSlot}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Block Selected Slot
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <AvailabilityCalendar
              venueId="venue-1"
              basePrice={MOCK_VENUE_DATA.basePrice}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
            />
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>Next 30 days schedule</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/venue/bookings">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MOCK_VENUE_DATA.upcomingBookings.map((booking) => (
                <div key={booking.id} className="p-4 border border-gray-100 rounded-lg hover:border-purple-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{booking.event}</h4>
                    {getStatusBadge(booking.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{booking.customer}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(booking.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{booking.guests} guests</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">{formatFullCurrency(booking.amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used actions for easy access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/venue/details">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Edit2 className="h-5 w-5" />
                </div>
                <span className="font-medium">Edit Venue Details</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/venue/bookings">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="font-medium">View Bookings</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/venue/calendar">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="font-medium">Manage Availability</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50" asChild>
              <Link href="/dashboard/settings">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="font-medium">Payment Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
