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
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events");
      const eventsData = extractArray<Event>(response);
      setEvents(eventsData);
    } catch (error: any) {
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
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Event Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage all events</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 px-6">
        <Card className="border-2 border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Events</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-100">
                <Calendar className="h-6 w-6 text-neutral-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Confirmed</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.confirmed}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Completed</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by event title or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
      <Card className="border-2 border-neutral-200 mx-6">
        <CardHeader>
          <CardTitle className="text-black">All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-neutral-600">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-neutral-600">No events found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-neutral-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Date & Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-neutral-900">{event.title || event.eventType}</p>
                          <p className="text-sm text-neutral-600">{event.eventType}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{event.customer?.name}</p>
                          <p className="text-xs text-neutral-600">{event.customer?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        <div>{new Date(event.date).toLocaleDateString("en-IN")}</div>
                        <div className="text-xs">{event.timeSlot}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        {event.area}, {event.city}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-neutral-900">{formatCurrency(event.totalAmount)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          event.status === "COMPLETED" ? "bg-purple-100 text-purple-700" :
                          event.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                          event.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                          "bg-red-100 text-red-700"
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
