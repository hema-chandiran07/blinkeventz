"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock, Eye, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  title: string;
  eventType: string;
  date: string;
  timeSlot: string;
  city: string;
  venue?: string;
  guestCount: number;
  totalAmount: number;
  status: "INQUIRY" | "PENDING_PAYMENT" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    customer: {
      name: "Rajesh Kumar",
      email: "rajesh@email.com",
      phone: "+91 98765 43210"
    },
    title: "Priya & Karthik Wedding",
    eventType: "WEDDING",
    date: "2024-06-15",
    timeSlot: "08:00 AM - 10:00 PM",
    city: "Chennai",
    venue: "Grand Ballroom ITC Grand Chola",
    guestCount: 800,
    totalAmount: 1500000,
    status: "CONFIRMED",
    createdAt: "2024-02-10"
  },
  {
    id: "2",
    customer: {
      name: "Anita Sharma",
      email: "anita@email.com",
      phone: "+91 91234 56789"
    },
    title: "TechCorp Annual Meet",
    eventType: "CORPORATE",
    date: "2024-09-20",
    timeSlot: "09:00 AM - 06:00 PM",
    city: "Chennai",
    guestCount: 500,
    totalAmount: 750000,
    status: "PENDING_PAYMENT",
    createdAt: "2024-02-15"
  },
  {
    id: "3",
    customer: {
      name: "Mohammed Rizwan",
      email: "rizwan@email.com",
      phone: "+91 99887 76655"
    },
    title: "Fatima's Engagement",
    eventType: "ENGAGEMENT",
    date: "2024-04-28",
    timeSlot: "04:00 PM - 09:00 PM",
    city: "Chennai",
    venue: "Taj Coromandel",
    guestCount: 300,
    totalAmount: 500000,
    status: "IN_PROGRESS",
    createdAt: "2024-01-20"
  }
];

export default function AdminEventsPage() {
  const [events] = useState<Event[]>(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (eventId: string, newStatus: Event["status"]) => {
    toast.success(`Event status updated to ${newStatus}`);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      CONFIRMED: <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>,
      PENDING_PAYMENT: <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending Payment</Badge>,
      IN_PROGRESS: <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>,
      COMPLETED: <Badge className="bg-gray-100 text-gray-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>,
      CANCELLED: <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>,
      INQUIRY: <Badge className="bg-purple-100 text-purple-700">Inquiry</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  const stats = {
    total: events.length,
    confirmed: events.filter(e => e.status === "CONFIRMED").length,
    inProgress: events.filter(e => e.status === "IN_PROGRESS").length,
    totalRevenue: events.filter(e => e.status === "CONFIRMED" || e.status === "COMPLETED").reduce((sum, e) => sum + e.totalAmount, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Global Event Monitoring</h1>
        <p className="text-gray-500">View and manage all platform events</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Events</p>
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
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
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
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{(stats.totalRevenue / 100000).toFixed(2)}L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-700">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15.3% vs last month
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <div className="text-center text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-purple-400" />
              <p>Revenue analytics chart would display here</p>
              <p className="text-sm">Showing monthly booking trends</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by event or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="INQUIRY">Inquiry</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="grid gap-4">
        {filteredEvents.map((event) => (
          <Card key={event.id}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                    {getStatusBadge(event.status)}
                  </div>

                  <div className="grid sm:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Customer</p>
                        <p className="text-gray-900">{event.customer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p className="text-gray-900">{new Date(event.date).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Amount</p>
                        <p className="text-gray-900">₹{(event.totalAmount / 100000).toFixed(2)}L</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Guests</p>
                        <p className="text-gray-900">{event.guestCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{event.timeSlot}</span>
                    {event.venue && (
                      <>
                        <span>•</span>
                        <span>{event.venue}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {event.status === "PENDING_PAYMENT" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(event.id, "CONFIRMED")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm
                    </Button>
                  )}
                  {event.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(event.id, "IN_PROGRESS")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Start Event
                    </Button>
                  )}
                  {event.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(event.id, "COMPLETED")}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
