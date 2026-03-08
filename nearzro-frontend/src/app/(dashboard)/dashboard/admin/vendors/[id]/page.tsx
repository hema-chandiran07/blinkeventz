"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, Trash2, MapPin, DollarSign, CheckCircle2,
  XCircle, Calendar, Download, Share2, MessageSquare, Star, Store,
  TrendingUp, Package, Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { vendorsApi } from "@/lib/api-endpoints";

interface VendorDetail {
  id: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  serviceType: string;
  area: string;
  city: string;
  basePrice: number;
  status: string;
  bookings: number;
  revenue: number;
  rating: number;
  services: string[];
  createdAt: string;
}

const MOCK_VENDOR: VendorDetail = {
  id: 1,
  name: "Elite Photography",
  owner: "John Smith",
  email: "john@elitephoto.in",
  phone: "+91 9876543210",
  serviceType: "PHOTOGRAPHY",
  area: "Anna Nagar",
  city: "Chennai",
  basePrice: 50000,
  status: "VERIFIED",
  bookings: 67,
  revenue: 3350000,
  rating: 4.8,
  services: ["Wedding Photography", "Candid Shots", "Pre-Wedding", "Album Design"],
  createdAt: "2024-01-10",
};

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: "bg-emerald-500 text-white",
  PENDING: "bg-amber-500 text-white",
  SUSPENDED: "bg-red-500 text-white",
};

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [vendor] = useState<VendorDetail>(MOCK_VENDOR);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      console.log(`Updating vendor ${vendor.id} status to ${newStatus}`);
      toast.success(`Vendor status updated to ${newStatus}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      try {
        console.log(`Deleting vendor ${vendor.id}`);
        toast.success("Vendor deleted successfully");
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/dashboard/admin/vendors");
      } catch (error: any) {
        console.error("Delete error:", error);
        toast.error("Failed to delete vendor");
      }
    }
  };

  const handleExport = async () => {
    try {
      console.log(`Exporting vendor ${vendor.id}`);
      toast.success("Vendor details exported");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export vendor");
    }
  };

  const handleShare = async () => {
    try {
      console.log(`Sharing vendor ${vendor.id}`);
      const shareUrl = `${window.location.origin}/vendors/${vendor.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Vendor link copied to clipboard");
    } catch (error: any) {
      console.error("Share error:", error);
      toast.error("Failed to share vendor");
    }
  };

  const handleEdit = () => {
    console.log(`Editing vendor ${vendor.id}`);
    toast.info("Opening edit mode...");
  };

  const handleSendMessage = () => {
    console.log(`Sending message to owner ${vendor.owner}`);
    toast.success("Message sent to owner");
  };

  const handleViewProfile = () => {
    console.log(`Viewing owner profile`);
    router.push("/dashboard/admin/users");
  };

  const handleViewBookings = () => {
    console.log(`Viewing bookings for vendor ${vendor.id}`);
    router.push(`/dashboard/admin/vendors/${vendor.id}/bookings`);
  };

  const handleViewAnalytics = () => {
    console.log(`Viewing analytics for vendor ${vendor.id}`);
    router.push(`/dashboard/admin/reports/vendors?id=${vendor.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{vendor.name}</h1>
            <p className="text-neutral-600">Vendor ID: #{vendor.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-black hover:bg-neutral-100">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </motion.div>

      {/* Status & Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <Badge className={`${STATUS_COLORS[vendor.status]} px-4 py-2 text-sm font-semibold`}>
          {vendor.status}
        </Badge>
        <div className="flex items-center gap-2">
          {vendor.status === "PENDING" && (
            <>
              <Button onClick={() => handleUpdateStatus("VERIFIED")} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Verify Vendor
              </Button>
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleUpdateStatus("SUSPENDED")}>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Store className="h-5 w-5" /> Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Service Type</p>
                  <p className="text-lg font-bold text-black">{vendor.serviceType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Base Price</p>
                  <p className="text-2xl font-bold text-black">{formatCurrency(vendor.basePrice)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    <p className="text-lg font-bold text-black">{vendor.area}, {vendor.city}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Registered On</p>
                  <p className="text-lg font-bold text-black">{new Date(vendor.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Package className="h-5 w-5" /> Services Offered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {vendor.services.map((service, index) => (
                  <Badge key={index} className="bg-neutral-100 text-black border-neutral-300 px-3 py-1">
                    {service}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Users className="h-5 w-5" /> Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Owner Name</p>
                  <p className="text-lg font-bold text-black">{vendor.owner}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Email</p>
                  <p className="text-lg font-bold text-black">{vendor.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone</p>
                  <p className="text-lg font-bold text-black">{vendor.phone}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="border-black hover:bg-neutral-100">
                  <MessageSquare className="h-4 w-4 mr-2" /> Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Total Bookings</span>
                <span className="text-xl font-bold text-black">{vendor.bookings}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Total Revenue</span>
                <span className="text-xl font-bold text-black">{formatCurrency(vendor.revenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Rating</span>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <span className="text-xl font-bold text-black">{vendor.rating}/5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full border-black hover:bg-neutral-100 justify-start">
                <Calendar className="h-4 w-4 mr-2" /> View Bookings
              </Button>
              <Button variant="outline" className="w-full border-black hover:bg-neutral-100 justify-start">
                <TrendingUp className="h-4 w-4 mr-2" /> View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
