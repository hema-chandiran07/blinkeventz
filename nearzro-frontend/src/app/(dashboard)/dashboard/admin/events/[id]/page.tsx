"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, Trash2, Calendar, Users, DollarSign,
  CheckCircle2, XCircle, Clock, TrendingUp, Loader2, AlertCircle
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface EventDetail {
  id: number;
  customerId: number;
  eventType: string;
  title?: string;
  date: string;
  timeSlot: string;
  city: string;
  area?: string;
  venueId?: number;
  guestCount: number;
  status: string;
  isExpress: boolean;
  subtotal: number;
  discount: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  customer?: {
    name: string;
    email: string;
    phone?: string;
  };
  venue?: {
    name: string;
    type: string;
    address: string;
  };
  services?: any[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  INQUIRY: "bg-blue-100 text-blue-700 border-blue-200",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding",
  RECEPTION: "Reception",
  BIRTHDAY: "Birthday",
  CORPORATE: "Corporate Event",
  ENGAGEMENT: "Engagement",
  PRIVATE: "Private Party",
  OTHER: "Other",
};

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [params.id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events");
      const found = response.data.find((e: any) => e.id === parseInt(params.id as string));
      setEvent(found || null);
    } catch (error: any) {
      console.error("Failed to load event:", error);
      toast.error("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/events/${event?.id}`, { status: newStatus });
      toast.success(`Event status updated to ${newStatus.replace('_', ' ')}`);
      loadEvent();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update event status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this event?")) return;
    
    try {
      setActionLoading(true);
      await api.patch(`/events/${event?.id}`, { status: 'CANCELLED' });
      toast.success("Event cancelled");
      loadEvent();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to cancel event");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
    
    try {
      setActionLoading(true);
      await api.delete(`/events/${event?.id}`);
      toast.success("Event deleted successfully");
      router.push("/dashboard/admin/events");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete event");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-neutral-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-bold text-black mb-2">Event Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{event.title || `${EVENT_TYPE_LABELS[event.eventType]} Event`}</h1>
            <p className="text-neutral-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(event.date).toLocaleDateString()} • {event.timeSlot}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-black">
            <Edit className="h-4 w-4 mr-2" />
            Edit Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-black">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Status</p>
                <p className="text-2xl font-bold text-black mt-1">{event.status.replace('_', ' ')}</p>
              </div>
              <div className="p-3 rounded-full bg-black">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(event.totalAmount)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Guests</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{event.guestCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Type</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Event Type</p>
              <p className="font-medium text-black">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Date & Time</p>
              <p className="font-medium text-black">
                {new Date(event.date).toLocaleDateString()} • {event.timeSlot}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Location</p>
              <p className="font-medium text-black">{event.area}, {event.city}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Guest Count</p>
              <p className="font-medium text-black">{event.guestCount} guests</p>
            </div>
            {event.isExpress && (
              <div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Express Booking
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Customer Name</p>
              <p className="font-medium text-black">{event.customer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Email</p>
              <p className="font-medium text-black">{event.customer?.email || 'N/A'}</p>
            </div>
            {event.customer?.phone && (
              <div>
                <p className="text-xs text-neutral-600">Phone</p>
                <p className="font-medium text-black">{event.customer.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {event.venue && (
          <Card className="border-2 border-black md:col-span-2">
            <CardHeader>
              <CardTitle className="text-black">Venue Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-neutral-600">Venue Name</p>
                  <p className="font-medium text-black">{event.venue.name}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Venue Type</p>
                  <p className="font-medium text-black">{event.venue.type}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600">Address</p>
                  <p className="font-medium text-black">{event.venue.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-black md:col-span-2">
          <CardHeader>
            <CardTitle className="text-black">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-neutral-600">Subtotal</p>
                <p className="font-medium text-black">{formatCurrency(event.subtotal)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Discount</p>
                <p className="font-medium text-red-600">- {formatCurrency(event.discount)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Platform Fee</p>
                <p className="font-medium text-black">{formatCurrency(event.platformFee)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Tax</p>
                <p className="font-medium text-black">{formatCurrency(event.tax)}</p>
              </div>
              <div className="md:col-span-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-black">Total Amount</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(event.totalAmount)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Badge */}
      <Card className="border-2 border-black">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 mb-2">Current Status</p>
              <Badge className={STATUS_COLORS[event.status]}>
                {event.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex gap-3">
              {event.status === 'PENDING_PAYMENT' && (
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Event
                </Button>
              )}
              
              {event.status === 'CONFIRMED' && (
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleUpdateStatus('IN_PROGRESS')}
                  disabled={actionLoading}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Mark In Progress
                </Button>
              )}

              {event.status === 'IN_PROGRESS' && (
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Completed
                </Button>
              )}

              {event.status !== 'CANCELLED' && event.status !== 'COMPLETED' && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Event
                </Button>
              )}

              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
