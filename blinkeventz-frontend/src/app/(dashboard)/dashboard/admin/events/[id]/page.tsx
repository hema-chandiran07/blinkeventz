"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Edit, Trash2, Calendar, MapPin, Users,
  DollarSign, Clock, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, Download, Share2, MessageSquare, Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { eventsApi } from "@/lib/api-endpoints";

interface EventDetail {
  id: number;
  title: string;
  customer: string;
  email: string;
  phone: string;
  type: string;
  date: string;
  timeSlot: string;
  location: string;
  area: string;
  city: string;
  guests: number;
  amount: number;
  status: string;
  venue?: string;
  vendors?: string[];
  notes: string;
  createdAt: string;
}

const MOCK_EVENT: EventDetail = {
  id: 1,
  title: "Priya & Karthik Wedding",
  customer: "Rajesh Kumar",
  email: "rajesh@email.com",
  phone: "+91 9876543210",
  type: "WEDDING",
  date: "2024-06-15",
  timeSlot: "FULL_DAY",
  location: "Grand Ballroom ITC",
  area: "Guindy",
  city: "Chennai",
  guests: 800,
  amount: 1500000,
  status: "CONFIRMED",
  venue: "Grand Ballroom ITC",
  vendors: ["Elite Photography", "Divine Caterers", "DJ Sounds Pro"],
  notes: "VIP customer. Requires special decoration setup.",
  createdAt: "2024-02-10",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-500 text-white",
  PENDING_PAYMENT: "bg-amber-500 text-white",
  IN_PROGRESS: "bg-blue-500 text-white",
  COMPLETED: "bg-purple-500 text-white",
  CANCELLED: "bg-red-500 text-white",
  INQUIRY: "bg-neutral-500 text-white",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = useState<any>(null);
  const [event] = useState<EventDetail>(MOCK_EVENT);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      console.log(`Updating event ${event.id} status to ${newStatus}`);
      toast.success(`Event status updated to ${newStatus}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        console.log(`Deleting event ${event.id}`);
        toast.success("Event deleted successfully");
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/dashboard/admin/events");
      } catch (error: any) {
        console.error("Delete error:", error);
        toast.error("Failed to delete event");
      }
    }
  };

  const handleExport = async () => {
    try {
      console.log(`Exporting event ${event.id}`);
      toast.success("Event details exported");
      // TODO: Implement actual export when backend endpoint is available
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export event");
    }
  };

  const handleShare = async () => {
    try {
      console.log(`Sharing event ${event.id}`);
      const shareUrl = `${window.location.origin}/events/${event.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Event link copied to clipboard");
    } catch (error: any) {
      console.error("Share error:", error);
      toast.error("Failed to share event");
    }
  };

  const handleEdit = async () => {
    console.log(`Editing event ${event.id}`);
    toast.info("Opening edit mode...");
    // TODO: Navigate to edit page or open modal
  };

  const handleSendMessage = async () => {
    console.log(`Sending message to customer ${event.customer}`);
    toast.success("Message sent to customer");
    // TODO: Open message modal or integrate with messaging system
  };

  const handleViewProfile = () => {
    console.log(`Viewing customer profile`);
    router.push("/dashboard/admin/users");
  };

  const handleAddVendor = () => {
    console.log(`Adding vendor to event ${event.id}`);
    toast.info("Opening vendor selection...");
    router.push("/dashboard/admin/vendors");
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{event.title}</h1>
            <p className="text-neutral-600">Event ID: #{event.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* Status & Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <Badge className={`${STATUS_COLORS[event.status]} px-4 py-2 text-sm font-semibold`}>
          {event.status.replace("_", " ")}
        </Badge>
        <div className="flex items-center gap-2">
          {event.status === "PENDING_PAYMENT" && (
            <Button
              onClick={() => handleUpdateStatus("CONFIRMED")}
              className="bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Payment
            </Button>
          )}
          {event.status === "CONFIRMED" && (
            <Button
              onClick={() => handleUpdateStatus("IN_PROGRESS")}
              className="bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Clock className="h-4 w-4 mr-2" />
              Start Event
            </Button>
          )}
          {event.status === "IN_PROGRESS" && (
            <Button
              onClick={() => handleUpdateStatus("COMPLETED")}
              className="bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Event
            </Button>
          )}
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => handleUpdateStatus("CANCELLED")}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Event
          </Button>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event Details */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Event Type</p>
                  <p className="text-lg font-bold text-black">{event.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Date & Time</p>
                  <p className="text-lg font-bold text-black">
                    {new Date(event.date).toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-neutral-600">{event.timeSlot.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Guest Count</p>
                  <p className="text-lg font-bold text-black">{event.guests} guests</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                  <p className="text-2xl font-bold text-black">{formatCurrency(event.amount)}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-neutral-600 mb-2">Location</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-lg font-bold text-black">{event.location}</p>
                    <p className="text-sm text-neutral-600">{event.area}, {event.city}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Customer Name</p>
                  <p className="text-lg font-bold text-black">{event.customer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Email Address</p>
                  <p className="text-lg font-bold text-black">{event.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone Number</p>
                  <p className="text-lg font-bold text-black">{event.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Created On</p>
                  <p className="text-lg font-bold text-black">
                    {new Date(event.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors" onClick={handleSendMessage}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors" onClick={handleViewProfile}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Notes & Remarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-black leading-relaxed">{event.notes}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black">Associated Vendors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.vendors?.map((vendor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/admin/vendors`)}
                >
                  <span className="text-sm font-medium text-black">{vendor}</span>
                  <Eye className="h-4 w-4 text-neutral-400" />
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full border-black hover:bg-neutral-100 transition-colors"
                onClick={() => router.push("/dashboard/admin/vendors")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-600 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-black">Event Created</p>
                  <p className="text-xs text-neutral-600">{new Date(event.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-black">Payment Confirmed</p>
                  <p className="text-xs text-neutral-600">2024-02-15</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-neutral-400 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-black">Event Date</p>
                  <p className="text-xs text-neutral-600">{new Date(event.date).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Days Until Event</span>
                <span className="text-lg font-bold text-black">92</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Payment Status</span>
                <Badge className="bg-emerald-500 text-white">Paid</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Vendors Assigned</span>
                <span className="text-lg font-bold text-black">{event.vendors?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
