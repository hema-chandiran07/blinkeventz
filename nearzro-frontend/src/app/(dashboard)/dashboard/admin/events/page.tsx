"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, CheckCircle2, Clock, Eye, Search, TrendingUp
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
  area?: string;
  guestCount: number;
  totalAmount: number;
  status: string;
  customer?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, []);

  const loadEvents = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get("/events", { signal });
      const eventsData = extractArray<Event>(response);
      setEvents(eventsData);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Failed to load events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: events.length,
    confirmed: events.filter(e => e.status === "CONFIRMED").length,
    inProgress: events.filter(e => e.status === "IN_PROGRESS").length,
    completed: events.filter(e => e.status === "COMPLETED").length,
    totalRevenue: events.filter(e => e.status === "COMPLETED").reduce((sum, e) => sum + e.totalAmount, 0),
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Event Management</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage all events</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 px-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Events</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800">
                <Calendar className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Confirmed</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.confirmed}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-950/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-800 bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">In Progress</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{stats.inProgress}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-950/30">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-800 bg-purple-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Completed</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-950/30">
                <CheckCircle2 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Revenue</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-950/30">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/50 mx-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by event title or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-700 bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-zinc-700 bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
            >
              <option value="all">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="border-zinc-800 bg-zinc-900/50 mx-6">
        <CardHeader>
          <CardTitle className="text-zinc-100">All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">No events found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Date & Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-zinc-100">{event.title || event.eventType}</p>
                          <p className="text-sm text-zinc-400">{event.eventType}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{event.customer?.name}</p>
                          <p className="text-xs text-zinc-500">{event.customer?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        <div>{new Date(event.date).toLocaleDateString("en-IN")}</div>
                        <div className="text-xs">{event.timeSlot}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        {event.area}, {event.city}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-zinc-100">{formatCurrency(event.totalAmount)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          event.status === "COMPLETED" ? "bg-purple-950/30 text-purple-400 border-purple-700" :
                          event.status === "IN_PROGRESS" ? "bg-blue-950/30 text-blue-400 border-blue-700" :
                          event.status === "CONFIRMED" ? "bg-emerald-950/30 text-emerald-400 border-emerald-700" :
                          "bg-red-950/30 text-red-400 border-red-700"
                        }`}>
                          {event.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
