"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Edit, Trash2, MapPin, Users, DollarSign,
  CheckCircle2, XCircle, Calendar, TrendingUp, Download, Share2,
  MessageSquare, Star, Building2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { venuesApi } from "@/lib/api-endpoints";

interface VenueDetail {
  id: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  type: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning: number;
  basePriceEvening: number;
  basePriceFullDay: number;
  amenities: string[];
  status: string;
  bookings: number;
  revenue: number;
  rating: number;
  createdAt: string;
}

const MOCK_VENUE: VenueDetail = {
  id: 1,
  name: "Grand Ballroom ITC",
  owner: "ITC Hotels",
  email: "hotels@itchotels.in",
  phone: "+91 44 2231 1111",
  type: "BANQUET",
  address: "123 GST Road",
  area: "Guindy",
  city: "Chennai",
  pincode: "600032",
  capacityMin: 500,
  capacityMax: 800,
  basePriceMorning: 100000,
  basePriceEvening: 150000,
  basePriceFullDay: 200000,
  amenities: ["Parking", "AC", "Catering", "Decoration", "Sound System"],
  status: "ACTIVE",
  bookings: 45,
  revenue: 6750000,
  rating: 4.8,
  createdAt: "2024-01-15",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500 text-white",
  PENDING_APPROVAL: "bg-amber-500 text-white",
  INACTIVE: "bg-neutral-500 text-white",
  SUSPENDED: "bg-red-500 text-white",
};

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [venue] = useState<VenueDetail>(MOCK_VENUE);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      console.log(`Updating venue ${venue.id} status to ${newStatus}`);
      toast.success(`Venue status updated to ${newStatus}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this venue?")) {
      try {
        console.log(`Deleting venue ${venue.id}`);
        toast.success("Venue deleted successfully");
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/dashboard/admin/venues");
      } catch (error: any) {
        console.error("Delete error:", error);
        toast.error("Failed to delete venue");
      }
    }
  };

  const handleExport = async () => {
    try {
      console.log(`Exporting venue ${venue.id}`);
      toast.success("Venue details exported");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export venue");
    }
  };

  const handleShare = async () => {
    try {
      console.log(`Sharing venue ${venue.id}`);
      const shareUrl = `${window.location.origin}/venues/${venue.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Venue link copied to clipboard");
    } catch (error: any) {
      console.error("Share error:", error);
      toast.error("Failed to share venue");
    }
  };

  const handleEdit = () => {
    console.log(`Editing venue ${venue.id}`);
    toast.info("Opening edit mode...");
  };

  const handleSendMessage = () => {
    console.log(`Sending message to owner ${venue.owner}`);
    toast.success("Message sent to owner");
  };

  const handleViewProfile = () => {
    console.log(`Viewing owner profile`);
    router.push("/dashboard/admin/users");
  };

  const handleViewBookings = () => {
    console.log(`Viewing bookings for venue ${venue.id}`);
    router.push(`/dashboard/admin/venues/${venue.id}/bookings`);
  };

  const handleManageCalendar = () => {
    console.log(`Managing calendar for venue ${venue.id}`);
    router.push(`/dashboard/admin/venues/${venue.id}/calendar`);
  };

  const handleViewAnalytics = () => {
    console.log(`Viewing analytics for venue ${venue.id}`);
    router.push(`/dashboard/admin/reports/venues?id=${venue.id}`);
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
            <h1 className="text-3xl font-bold text-black">{venue.name}</h1>
            <p className="text-neutral-600">Venue ID: #{venue.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors">
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
        <Badge className={`${STATUS_COLORS[venue.status]} px-4 py-2 text-sm font-semibold`}>
          {venue.status.replace("_", " ")}
        </Badge>
        <div className="flex items-center gap-2">
          {venue.status === "PENDING_APPROVAL" && (
            <>
              <Button
                onClick={() => handleUpdateStatus("ACTIVE")}
                className="bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Venue
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => handleUpdateStatus("INACTIVE")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {venue.status === "ACTIVE" && (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => handleUpdateStatus("INACTIVE")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deactivate
            </Button>
          )}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Venue Details */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Venue Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Venue Type</p>
                  <p className="text-lg font-bold text-black">{venue.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Capacity</p>
                  <p className="text-lg font-bold text-black">
                    {venue.capacityMin} - {venue.capacityMax} guests
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-lg font-bold text-black">{venue.address}</p>
                      <p className="text-sm text-neutral-600">{venue.area}, {venue.city} - {venue.pincode}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border-2 border-neutral-200">
                  <p className="text-sm font-medium text-neutral-600">Morning Slot</p>
                  <p className="text-2xl font-bold text-black mt-2">{formatCurrency(venue.basePriceMorning)}</p>
                </div>
                <div className="p-4 rounded-lg border-2 border-neutral-200">
                  <p className="text-sm font-medium text-neutral-600">Evening Slot</p>
                  <p className="text-2xl font-bold text-black mt-2">{formatCurrency(venue.basePriceEvening)}</p>
                </div>
                <div className="p-4 rounded-lg border-2 border-neutral-200">
                  <p className="text-sm font-medium text-neutral-600">Full Day</p>
                  <p className="text-2xl font-bold text-black mt-2">{formatCurrency(venue.basePriceFullDay)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Star className="h-5 w-5" />
                Amenities & Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((amenity, index) => (
                  <Badge key={index} className="bg-neutral-100 text-black border-neutral-300 px-3 py-1">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Users className="h-5 w-5" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Owner Name</p>
                  <p className="text-lg font-bold text-black">{venue.owner}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Email Address</p>
                  <p className="text-lg font-bold text-black">{venue.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone Number</p>
                  <p className="text-lg font-bold text-black">{venue.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Registered On</p>
                  <p className="text-lg font-bold text-black">
                    {new Date(venue.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="border-black hover:bg-neutral-100 transition-colors">
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </div>
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
              <CardTitle className="text-black">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-neutral-400" />
                  <span className="text-sm text-neutral-600">Total Bookings</span>
                </div>
                <span className="text-xl font-bold text-black">{venue.bookings}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-neutral-400" />
                  <span className="text-sm text-neutral-600">Total Revenue</span>
                </div>
                <span className="text-xl font-bold text-black">{formatCurrency(venue.revenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <span className="text-sm text-neutral-600">Rating</span>
                </div>
                <span className="text-xl font-bold text-black">{venue.rating}/5.0</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-600 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-black">Venue Approved</p>
                  <p className="text-xs text-neutral-600">2024-01-20</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-black">New Booking</p>
                  <p className="text-xs text-neutral-600">2024-03-10</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-neutral-400 mt-2" />
                <div>
                  <p className="text-sm font-semibold text-black">Profile Updated</p>
                  <p className="text-xs text-neutral-600">2024-03-01</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-black">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full border-black hover:bg-neutral-100 transition-colors justify-start"
                onClick={() => router.push(`/dashboard/admin/venues/${venue.id}/bookings`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Bookings
              </Button>
              <Button
                variant="outline"
                className="w-full border-black hover:bg-neutral-100 transition-colors justify-start"
                onClick={() => router.push(`/dashboard/admin/venues/${venue.id}/calendar`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Manage Calendar
              </Button>
              <Button
                variant="outline"
                className="w-full border-black hover:bg-neutral-100 transition-colors justify-start"
                onClick={() => router.push(`/dashboard/admin/venues/${venue.id}/analytics`)}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
