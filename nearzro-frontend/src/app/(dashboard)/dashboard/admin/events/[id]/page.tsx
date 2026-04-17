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
  INQUIRY: "bg-blue-950/30 text-blue-400 border-blue-800",
  PENDING_PAYMENT: "bg-amber-950/30 text-amber-400 border-amber-800",
  CONFIRMED: "bg-emerald-950/30 text-emerald-400 border-emerald-800",
  IN_PROGRESS: "bg-blue-950/30 text-blue-400 border-blue-800",
  COMPLETED: "bg-emerald-950/30 text-emerald-400 border-emerald-800",
  CANCELLED: "bg-red-950/30 text-red-400 border-red-800",
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
     const controller = new AbortController();
     loadEvent(controller.signal);
     return () => controller.abort();
   }, [params.id]);

   const loadEvent = async (signal?: AbortSignal) => {
     try {
       setLoading(true);
       const response = await api.get(`/events/${params.id}`, { signal });
       const data = response.data;
       setEvent(data);
     } catch (error: any) {
       if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
       console.error("Failed to load event:", error);
       toast.error("Failed to load event details");
       router.push("/dashboard/admin/events");
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
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-400">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-bold text-zinc-100 mb-2">Event Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-6 py-4 rounded-lg">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-zinc-800 text-zinc-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">{event.title || `${EVENT_TYPE_LABELS[event.eventType]} Event`}</h1>
            <p className="text-zinc-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(event.date).toLocaleDateString()} • {event.timeSlot}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Edit className="h-4 w-4 mr-2" />
            Edit Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Status</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{event.status.replace('_', ' ')}</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800">
                <Clock className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-900/30 bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Amount</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(event.totalAmount)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-950/40">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-900/30 bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Guests</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{event.guestCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-950/40">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-900/30 bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Type</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-950/40">
                <TrendingUp className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Event Type</p>
              <p className="font-medium text-zinc-100">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Date & Time</p>
              <p className="font-medium text-zinc-100">
                {new Date(event.date).toLocaleDateString()} • {event.timeSlot}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Location</p>
              <p className="font-medium text-zinc-100">{event.area}, {event.city}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Guest Count</p>
              <p className="font-medium text-zinc-100">{event.guestCount} guests</p>
            </div>
            {event.isExpress && (
              <div>
                <Badge className="bg-amber-950/30 text-amber-400 border-amber-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Express Booking
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Customer Name</p>
              <p className="font-medium text-zinc-100">{event.customer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="font-medium text-zinc-100">{event.customer?.email || 'N/A'}</p>
            </div>
            {event.customer?.phone && (
              <div>
                <p className="text-xs text-zinc-500">Phone</p>
                <p className="font-medium text-zinc-100">{event.customer.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {event.venue && (
          <Card className="border border-zinc-800 bg-zinc-900/50 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-zinc-100">Venue Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Venue Name</p>
                  <p className="font-medium text-zinc-100">{event.venue.name}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Venue Type</p>
                  <p className="font-medium text-zinc-100">{event.venue.type}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Address</p>
                  <p className="font-medium text-zinc-100">{event.venue.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border border-zinc-800 bg-zinc-900/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-zinc-100">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-500">Subtotal</p>
                <p className="font-medium text-zinc-100">{formatCurrency(event.subtotal)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Discount</p>
                <p className="font-medium text-red-400">- {formatCurrency(event.discount)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Platform Fee</p>
                <p className="font-medium text-zinc-100">{formatCurrency(event.platformFee)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Tax</p>
                <p className="font-medium text-zinc-100">{formatCurrency(event.tax)}</p>
              </div>
              <div className="md:col-span-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-zinc-100">Total Amount</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(event.totalAmount)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Badge */}
      <Card className="border border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-2">Current Status</p>
              <Badge className={STATUS_COLORS[event.status]}>
                {event.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex gap-3">
              {event.status === 'PENDING_PAYMENT' && (
                <Button
                  variant="default"
                  className="bg-emerald-700 hover:bg-emerald-600 text-zinc-100"
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
                  className="bg-blue-700 hover:bg-blue-600 text-zinc-100"
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
                  className="bg-emerald-700 hover:bg-emerald-600 text-zinc-100"
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
                  className="border-red-800 text-red-400 hover:bg-red-950/30"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Event
                </Button>
              )}

              <Button
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-950/30"
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
