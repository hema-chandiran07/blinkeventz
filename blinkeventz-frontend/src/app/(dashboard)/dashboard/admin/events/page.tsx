"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar, Search, Eye, Plus, Filter, RefreshCw, MapPin, Users,
  DollarSign, Clock, CheckCircle2, Heart, Briefcase, Sparkles, PartyPopper,
  TrendingUp, BarChart3, Download, Edit, Trash2
} from "lucide-react";
import { toast } from "sonner";

const MOCK_EVENTS = [
  { id: 1, title: "Priya & Karthik Wedding", customer: "Rajesh Kumar", type: "WEDDING", date: "2024-06-15", location: "Anna Nagar, Chennai", guests: 800, amount: 1500000, status: "CONFIRMED" },
  { id: 2, title: "TechCorp Annual Meet", customer: "Anita Sharma", type: "CORPORATE", date: "2024-09-20", location: "OMR, Chennai", guests: 500, amount: 750000, status: "PENDING_PAYMENT" },
  { id: 3, title: "Fatima's Engagement", customer: "Mohammed Rizwan", type: "ENGAGEMENT", date: "2024-04-28", location: "T Nagar, Chennai", guests: 300, amount: 500000, status: "IN_PROGRESS" },
  { id: 4, title: "Arjun's Birthday Bash", customer: "Lakshmi Devi", type: "BIRTHDAY", date: "2024-05-10", location: "Adyar, Chennai", guests: 150, amount: 150000, status: "COMPLETED" },
  { id: 5, title: "Global Solutions Conference", customer: "Global Solutions Pvt Ltd", type: "CORPORATE", date: "2024-07-05", location: "Guindy, Chennai", guests: 1000, amount: 2500000, status: "CONFIRMED" },
];

const TYPE_ICONS: Record<string, any> = {
  WEDDING: Heart,
  ENGAGEMENT: Sparkles,
  CORPORATE: Briefcase,
  BIRTHDAY: PartyPopper,
  RECEPTION: Heart,
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-purple-50 text-purple-700 border-purple-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  INQUIRY: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [events] = useState(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Events refreshed");
  };

  const handleUpdateStatus = (eventId: number, newStatus: string) => {
    toast.success(`Event status updated to ${newStatus}`);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || event.type === filterType;
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: events.length,
    confirmed: events.filter(e => e.status === "CONFIRMED").length,
    inProgress: events.filter(e => e.status === "IN_PROGRESS").length,
    totalRevenue: events.filter(e => ["CONFIRMED", "COMPLETED"].includes(e.status))
      .reduce((sum, e) => sum + e.amount, 0),
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Professional Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Event Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage and monitor all platform events</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-neutral-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-neutral-900 hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Events</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.5% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Confirmed</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.confirmed}</p>
                <p className="text-xs text-neutral-500 mt-2">Active bookings</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
                <p className="text-xs text-neutral-500 mt-2">Live events</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +18.4% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-neutral-300"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Types</option>
              <option value="WEDDING">Wedding</option>
              <option value="ENGAGEMENT">Engagement</option>
              <option value="CORPORATE">Corporate</option>
              <option value="BIRTHDAY">Birthday</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="border border-neutral-200 mx-6">
        <CardHeader className="border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-neutral-900">All Events</CardTitle>
            <Badge variant="outline" className="bg-neutral-100 text-neutral-700">
              <Filter className="h-3 w-3 mr-1" />
              {filteredEvents.length} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredEvents.map((event) => {
              const IconComponent = TYPE_ICONS[event.type] || Calendar;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-6 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-neutral-900 flex items-center justify-center">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-neutral-900">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-neutral-400" />
                          {event.customer}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-neutral-400" />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-neutral-400" />
                          {new Date(event.date).toLocaleDateString("en-IN", { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">{formatCurrency(event.amount)}</p>
                      <p className="text-xs text-neutral-500">{event.guests} guests</p>
                    </div>
                    <Badge className={`${STATUS_COLORS[event.status]} border text-xs font-medium`}>
                      {event.status.replace("_", " ")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/admin/events/${event.id}`);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4 text-neutral-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
