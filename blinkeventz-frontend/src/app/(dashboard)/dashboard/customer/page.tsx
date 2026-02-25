"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Users, DollarSign, Plus, Edit2, Trash2, Search, MapPin, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  timeSlot: string;
  city: string;
  venue?: string;
  guestCount: number;
  budget: number;
  status: "planning" | "booked" | "confirmed" | "completed" | "cancelled";
  vendors: string[];
}

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    name: "Priya & Karthik Wedding",
    type: "Wedding",
    date: "2024-06-15",
    timeSlot: "08:00 AM - 10:00 PM",
    city: "Chennai",
    venue: "Grand Ballroom ITC Grand Chola",
    guestCount: 800,
    budget: 1500000,
    status: "booked",
    vendors: ["LensCraft Studios", "Annapurna Caterers"]
  },
  {
    id: "2",
    name: "Rahul's Engagement",
    type: "Engagement",
    date: "2024-05-20",
    timeSlot: "04:00 PM - 09:00 PM",
    city: "Chennai",
    venue: "Taj Coromandel",
    guestCount: 300,
    budget: 500000,
    status: "planning",
    vendors: []
  },
];

const EVENT_TYPES = ["Wedding", "Engagement", "Reception", "Birthday", "Corporate", "Other"];
const TIME_SLOTS = [
  "Morning (6 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 10 PM)",
  "Full Day (6 AM - 12 AM)"
];

export default function CustomerDashboardPage() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Wedding",
    date: "",
    timeSlot: "Evening (4 PM - 10 PM)",
    city: "Chennai",
    venue: "",
    guestCount: "",
    budget: ""
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateEvent = () => {
    if (!formData.name.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (!formData.date) {
      toast.error("Event date is required");
      return;
    }
    if (!formData.guestCount || parseInt(formData.guestCount) <= 0) {
      toast.error("Please enter valid guest count");
      return;
    }

    // eslint-disable-next-line react-hooks/purity
    const newEvent: Event = {
      // eslint-disable-next-line react-hooks/purity
      id: `event-${Date.now()}`,
      name: formData.name,
      type: formData.type,
      date: formData.date,
      timeSlot: formData.timeSlot,
      city: formData.city,
      venue: formData.venue || "TBD",
      guestCount: parseInt(formData.guestCount),
      budget: parseInt(formData.budget) || 0,
      status: "planning",
      vendors: []
    };

    setEvents([newEvent, ...events]);
    toast.success("Event created successfully!");
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    if (!formData.name.trim()) {
      toast.error("Event name is required");
      return;
    }

    setEvents(events.map(e => 
      e.id === selectedEvent.id 
        ? { 
            ...e, 
            name: formData.name,
            type: formData.type,
            date: formData.date,
            timeSlot: formData.timeSlot,
            city: formData.city,
            venue: formData.venue,
            guestCount: parseInt(formData.guestCount),
            budget: parseInt(formData.budget)
          } 
        : e
    ));
    
    toast.success("Event updated successfully!");
    setIsEditOpen(false);
    setSelectedEvent(null);
    resetForm();
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(e => e.id !== eventId));
      toast.success("Event deleted successfully");
    }
  };

  const handleCancelEvent = (eventId: string) => {
    setEvents(events.map(e => 
      e.id === eventId ? { ...e, status: "cancelled" as const } : e
    ));
    toast.success("Event cancelled");
  };

  const openEditDialog = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      name: event.name,
      type: event.type,
      date: event.date,
      timeSlot: event.timeSlot,
      city: event.city,
      venue: event.venue || "",
      guestCount: String(event.guestCount),
      budget: String(event.budget)
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Wedding",
      date: "",
      timeSlot: "Evening (4 PM - 10 PM)",
      city: "Chennai",
      venue: "",
      guestCount: "",
      budget: ""
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "planning":
        return <Badge className="bg-blue-100 text-blue-700">Planning</Badge>;
      case "booked":
        return <Badge className="bg-purple-100 text-purple-700">Booked</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: events.length,
    planning: events.filter(e => e.status === "planning").length,
    booked: events.filter(e => e.status === "booked" || e.status === "confirmed").length,
    totalBudget: events.reduce((sum, e) => sum + e.budget, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-500">Plan and manage your special occasions</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsCreateOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
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
                <p className="text-sm font-medium text-gray-500">Planning</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.planning}</p>
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
                <p className="text-sm font-medium text-gray-500">Booked</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.booked}</p>
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
                <p className="text-sm font-medium text-gray-500">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{(stats.totalBudget / 100000).toFixed(2)}L</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
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
              <option value="planning">Planning</option>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
                    <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                    {getStatusBadge(event.status)}
                  </div>

                  <div className="grid sm:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p className="text-gray-900">{new Date(event.date).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Guests</p>
                        <p className="text-gray-900">{event.guestCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Venue</p>
                        <p className="text-gray-900">{event.venue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Budget</p>
                        <p className="text-gray-900">₹{(event.budget / 100000).toFixed(2)}L</p>
                      </div>
                    </div>
                  </div>

                  {event.vendors.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-500">Vendors:</span>
                      {event.vendors.map((vendor, idx) => (
                        <Badge key={idx} variant="secondary">{vendor}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(event)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {event.status !== "cancelled" && event.status !== "completed" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelEvent(event.id)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Plan your special occasion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Priya & Karthik Wedding"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Event Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Event Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeSlot">Time Slot</Label>
                <select
                  id="timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Chennai"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Venue name or TBD"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestCount">Guest Count *</Label>
                <Input
                  id="guestCount"
                  type="number"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="500000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update your event details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Event Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Event Type *</Label>
                <select
                  id="edit-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Event Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-timeSlot">Time Slot</Label>
                <select
                  id="edit-timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-venue">Venue</Label>
                <Input
                  id="edit-venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-guestCount">Guest Count *</Label>
                <Input
                  id="edit-guestCount"
                  type="number"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Budget (₹)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEvent}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
