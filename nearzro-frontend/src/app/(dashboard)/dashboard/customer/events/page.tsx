"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, DollarSign, CheckCircle2, Clock, Eye, Download,
  MapPin, Users, AlertCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";

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
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, []);

  const loadEvents = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get("/events/my", { signal });
      const eventsData = extractArray<Event>(response);
      setEvents(eventsData);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Failed to load events:", error);
      toast.error("Failed to load your events");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (eventId: number) => {
    toast.error("Invoice download is not available yet");
  };

  const handleCancelEvent = async (eventId: number) => {
    toast.error("Event cancellation is not available yet");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-950/30 text-emerald-400 border-emerald-700";
      case "IN_PROGRESS":
        return "bg-blue-950/30 text-blue-400 border-blue-700";
      case "COMPLETED":
        return "bg-purple-950/30 text-purple-400 border-purple-700";
      case "CANCELLED":
        return "bg-red-950/30 text-red-400 border-red-700";
      default:
        return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
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
          <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">My Events</h1>
        <p className="text-zinc-400">View and manage your booked events</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Events</p>
                <p className="text-2xl font-bold text-zinc-100">{events.length}</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800 text-zinc-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Upcoming</p>
                <p className="text-2xl font-bold text-blue-400">
                  {events.filter(e => e.status === "CONFIRMED" || e.status === "IN_PROGRESS").length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-950/30 text-blue-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Completed</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {events.filter(e => e.status === "COMPLETED").length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-950/30 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Spent</p>
                <p className="text-2xl font-bold text-zinc-100">
                  {formatCurrency(events.reduce((sum, e) => sum + e.totalAmount, 0))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800 text-zinc-300">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100">Your Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
              <h3 className="text-lg font-bold text-zinc-100 mb-2">No Events Yet</h3>
              <p className="text-zinc-400 mb-6">Start planning your first event!</p>
              <Button
                variant="premium"
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
                  className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-zinc-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-zinc-100">{event.title}</h3>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status.replace("_", " ")}
                        </Badge>
                        {event.isExpress && (
                          <Badge className="bg-amber-950/30 text-amber-400 border-amber-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Express
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
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
                    <p className="font-bold text-zinc-100 mb-2">
                      {formatCurrency(event.totalAmount || 0)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/customer/events/${event.id}`)}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="border-zinc-700 text-zinc-500 opacity-50 cursor-not-allowed"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Unavailable
                      </Button>
                      {(event.status === "CONFIRMED" || event.status === "IN_PROGRESS") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="border-red-800 text-red-500 opacity-50 cursor-not-allowed"
                        >
                          <XCircle className="h-4 w-4" />
                          Unavailable
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
