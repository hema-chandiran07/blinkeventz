"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  TrendingUp,
  DollarSign,
  Package,
  User,
  CheckSquare,
  X
} from "lucide-react";
import { toast } from "sonner";

// Mock data for vendor bookings
const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    eventId: "1",
    serviceId: "1",
    service: {
      id: "1",
      name: "Wedding Photography Package",
      serviceType: "PHOTOGRAPHY",
      baseRate: 35000
    },
    customer: {
      id: "1",
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
    status: "CONFIRMED",
    notes: "Client wants candid shots throughout the event",
    createdAt: "2024-02-10T10:30:00Z",
    updatedAt: "2024-02-12T14:20:00Z"
  },
  {
    id: "2",
    eventId: "2",
    serviceId: "2",
    service: {
      id: "2",
      name: "Pre-Wedding Photoshoot",
      serviceType: "PHOTOGRAPHY",
      baseRate: 15000
    },
    customer: {
      id: "2",
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
      guestCount: 10,
      venue: null
    },
    status: "PENDING",
    notes: "Sunrise shoot at beach location",
    createdAt: "2024-02-15T09:00:00Z",
    updatedAt: "2024-02-15T09:00:00Z"
  },
  {
    id: "3",
    eventId: "3",
    serviceId: "4",
    service: {
      id: "4",
      name: "Candid Photography",
      serviceType: "PHOTOGRAPHY",
      baseRate: 20000
    },
    customer: {
      id: "3",
      name: "Mohammed Rizwan",
      email: "rizwan@email.com",
      phone: "+91 99887 76655"
    },
    event: {
      title: "Fatima's Engagement Ceremony",
      eventType: "ENGAGEMENT",
      date: "2024-04-28",
      timeSlot: "04:00 PM - 09:00 PM",
      city: "Chennai",
      area: "Anna Nagar",
      guestCount: 300,
      venue: {
        name: "Taj Coromandel Banquet Hall",
        address: "37, Mahatma Gandhi Road, Nungambakkam, Chennai"
      }
    },
    status: "COMPLETED",
    notes: "Focus on family moments and ceremonies",
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-04-29T10:00:00Z"
  },
  {
    id: "4",
    eventId: "4",
    serviceId: "1",
    service: {
      id: "1",
      name: "Wedding Photography Package",
      serviceType: "PHOTOGRAPHY",
      baseRate: 35000
    },
    customer: {
      id: "4",
      name: "Lakshmi Narayanan",
      email: "lakshmi.n@email.com",
      phone: "+91 98765 12345"
    },
    event: {
      title: "Arun & Kavya Reception",
      eventType: "RECEPTION",
      date: "2024-07-10",
      timeSlot: "06:00 PM - 11:00 PM",
      city: "Chennai",
      area: "Velachery",
      guestCount: 500,
      venue: {
        name: "Le Royal Méridien Grand Ballroom",
        address: "1, Velachery Main Road, Chennai"
      }
    },
    status: "PENDING",
    notes: "Need both photography and videography",
    createdAt: "2024-02-18T15:30:00Z",
    updatedAt: "2024-02-18T15:30:00Z"
  },
  {
    id: "5",
    eventId: "5",
    serviceId: "3",
    service: {
      id: "3",
      name: "Event Videography",
      serviceType: "VIDEOGRAPHY",
      baseRate: 25000
    },
    customer: {
      id: "5",
      name: "Priya Vasudev",
      email: "priya.v@email.com",
      phone: "+91 97654 32109"
    },
    event: {
      title: "TechCorp Annual Meet 2024",
      eventType: "CORPORATE",
      date: "2024-09-20",
      timeSlot: "09:00 AM - 06:00 PM",
      city: "Chennai",
      area: "OMR",
      guestCount: 500,
      venue: {
        name: "SPIC Convention Center",
        address: "Kathipara Junction, Guindy, Chennai"
      }
    },
    status: "CANCELLED",
    notes: "Event cancelled due to venue issues",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z"
  }
];

interface Booking {
  id: string;
  eventId: string;
  serviceId: string;
  service: {
    id: string;
    name: string;
    serviceType: string;
    baseRate: number;
  };
  customer: {
    id: string;
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
    venue: {
      name: string;
      address: string;
    } | null;
  };
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      setBookings(MOCK_BOOKINGS);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    const matchesType = filterType === "all" || booking.event.eventType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailDialogOpen(true);
  };

  const handleConfirmBooking = (bookingId: string) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId 
        ? { ...b, status: "CONFIRMED" as const, updatedAt: new Date().toISOString() }
        : b
    ));
    toast.success("Booking confirmed successfully!", {
      description: "The customer has been notified."
    });
    setIsConfirmDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleRejectBooking = (bookingId: string, reason: string) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId 
        ? { ...b, status: "CANCELLED" as const, updatedAt: new Date().toISOString() }
        : b
    ));
    toast.success("Booking rejected", {
      description: "The customer has been notified."
    });
    setIsConfirmDialogOpen(false);
    setSelectedBooking(null);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <CheckSquare className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getEventTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      WEDDING: "bg-pink-100 text-pink-700",
      PRE_WEDDING: "bg-purple-100 text-purple-700",
      ENGAGEMENT: "bg-orange-100 text-orange-700",
      RECEPTION: "bg-indigo-100 text-indigo-700",
      CORPORATE: "bg-slate-100 text-slate-700",
      BIRTHDAY: "bg-green-100 text-green-700",
      OTHER: "bg-gray-100 text-gray-700"
    };
    return (
      <Badge variant="secondary" className={colors[type] || colors.OTHER}>
        {type.replace("_", " ")}
      </Badge>
    );
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "PENDING").length,
    confirmed: bookings.filter(b => b.status === "CONFIRMED").length,
    completed: bookings.filter(b => b.status === "COMPLETED").length,
    cancelled: bookings.filter(b => b.status === "CANCELLED").length,
    revenue: bookings
      .filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED")
      .reduce((sum, b) => sum + b.service.baseRate, 0)
  };

  const upcomingBookings = bookings
    .filter(b => b.status === "CONFIRMED" && new Date(b.event.date) >= new Date())
    .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());

  if (isLoading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500">Manage your event bookings and customer requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
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
                <p className="text-sm font-medium text-gray-500">Confirmed</p>
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
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <CheckSquare className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.revenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBookings.slice(0, 3).map(booking => (
                <div key={booking.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{booking.event.title}</h4>
                    {getStatusBadge(booking.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{booking.service.name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.event.date)}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => handleViewDetails(booking)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer, event, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="WEDDING">Wedding</option>
                <option value="PRE_WEDDING">Pre-Wedding</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="RECEPTION">Reception</option>
                <option value="CORPORATE">Corporate</option>
                <option value="BIRTHDAY">Birthday</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="grid gap-4">
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No bookings found</h3>
              <p className="text-gray-500 mt-1">
                {searchQuery || filterStatus !== "all" || filterType !== "all"
                  ? "Try adjusting your filters"
                  : "You don't have any bookings yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{booking.event.title}</h3>
                      {getStatusBadge(booking.status)}
                      {getEventTypeBadge(booking.event.eventType)}
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-start gap-2">
                        <User className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Customer</p>
                          <p className="text-gray-900">{booking.customer.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Service</p>
                          <p className="text-gray-900">{booking.service.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date & Time</p>
                          <p className="text-gray-900">{formatDate(booking.event.date)}</p>
                          <p className="text-sm text-gray-500">{booking.event.timeSlot}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Location</p>
                          <p className="text-gray-900">{booking.event.area}, {booking.event.city}</p>
                        </div>
                      </div>
                    </div>

                    {booking.event.venue && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-gray-900">{booking.event.venue.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{booking.event.venue.address}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Booked: {formatDate(booking.createdAt)}</span>
                      {booking.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">&quot;{booking.notes}&quot;</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(booking)}
                      className="w-full lg:w-auto"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {booking.status === "PENDING" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsConfirmDialogOpen(true);
                          }}
                          className="w-full lg:w-auto bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsConfirmDialogOpen(true);
                          }}
                          className="w-full lg:w-auto text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Event Info */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-lg font-bold text-gray-900">{selectedBooking.event.title}</h4>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h5 className="font-semibold text-purple-900 mb-2">Event Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{selectedBooking.event.eventType.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{formatDate(selectedBooking.event.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">{selectedBooking.event.timeSlot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Guests:</span>
                        <span className="font-medium">{selectedBooking.event.guestCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{selectedBooking.event.area}, {selectedBooking.event.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h5 className="font-semibold text-green-900 mb-2">Service Details</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium">{selectedBooking.service.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{selectedBooking.service.serviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium text-green-600">{formatCurrency(selectedBooking.service.baseRate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue Info */}
              {selectedBooking.event.venue && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Venue Information
                  </h5>
                  <p className="font-medium text-gray-900">{selectedBooking.event.venue.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedBooking.event.venue.address}</p>
                </div>
              )}

              {/* Customer Info */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h5 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h5>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{selectedBooking.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{selectedBooking.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{selectedBooking.customer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Customer Notes</h5>
                  <p className="text-gray-600 italic">&quot;{selectedBooking.notes}&quot;</p>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Created: {formatDate(selectedBooking.createdAt)}</span>
                  <span>Updated: {formatDate(selectedBooking.updatedAt)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
              {selectedBooking.status === "PENDING" && (
                <>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleRejectBooking(selectedBooking.id, "Not available");
                      setIsDetailDialogOpen(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleConfirmBooking(selectedBooking.id);
                      setIsDetailDialogOpen(false);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Booking
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm/Reject Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBooking?.status === "PENDING" ? "Confirm or Reject Booking" : "Booking Action"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              {selectedBooking?.status === "PENDING" 
                ? `How would you like to respond to "${selectedBooking?.event.title}"?`
                : "Select an action for this booking."}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedBooking) {
                  handleRejectBooking(selectedBooking.id, "Not available");
                }
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedBooking) {
                  handleConfirmBooking(selectedBooking.id);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
