"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, DollarSign, CheckCircle2, Clock, Eye, Download,
  MapPin, Users, FileText, AlertCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Event {
  id: number;
  title: string;
  eventType: string;
  date: string;
  timeSlot: string;
  city: string;
  area: string;
  guestCount: number;
  status: string;
  totalAmount: number;
  venue?: {
    name: string;
    address: string;
  };
  isExpress: boolean;
  createdAt: string;
}

export default function CustomerEventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await api.get("/events/my");
      setEvents(response.data || []);
    } catch (error: any) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load your events");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (eventId: number) => {
    try {
      const response = await api.get(`/customer/events/${eventId}/invoice`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-event-${eventId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      console.error("Invoice download error:", error);
      toast.error("Failed to download invoice");
    }
  };

  const handleCancelEvent = async (eventId: number) => {
    if (!confirm("Are you sure you want to cancel this event? Cancellation policies apply.")) {
      return;
    }

    try {
      await api.post(`/customer/events/${eventId}/cancel`);
      toast.success("Event cancelled successfully");
      loadEvents();
    } catch (error: any) {
      console.error("Cancellation error:", error);
      toast.error(error?.response?.data?.message || "Failed to cancel event");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "COMPLETED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">My Events</h1>
        <p className="text-neutral-600">View and manage your booked events</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Events</p>
                <p className="text-2xl font-bold text-black">{events.length}</p>
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
                <p className="text-sm font-medium text-neutral-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">
                  {events.filter(e => e.status === "CONFIRMED" || e.status === "IN_PROGRESS").length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {events.filter(e => e.status === "COMPLETED").length}
                </p>
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
                <p className="text-sm font-medium text-neutral-600">Total Spent</p>
                <p className="text-2xl font-bold text-black">
                  {formatCurrency(events.reduce((sum, e) => sum + e.totalAmount, 0))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-black text-white">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Your Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-bold text-black mb-2">No Events Yet</h3>
              <p className="text-neutral-600 mb-6">Start planning your first event!</p>
              <Button
                variant="default"
                className="bg-black hover:bg-neutral-800"
                onClick={() => router.push("/plan-event")}
              >
                Plan an Event
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-black">{event.title}</h3>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status.replace("_", " ")}
                        </Badge>
                        {event.isExpress && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Express
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(event.date).toLocaleDateString("en-IN")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.guestCount} guests
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black mb-2">
                      {formatCurrency(event.totalAmount)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/customer/events/${event.id}`)}
                        className="border-black"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(event.id)}
                        className="border-black"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Invoice
                      </Button>
                      {(event.status === "CONFIRMED" || event.status === "IN_PROGRESS") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelEvent(event.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
