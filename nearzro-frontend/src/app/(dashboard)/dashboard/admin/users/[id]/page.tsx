"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, DollarSign,
  CheckCircle2, XCircle, Download, MessageSquare, Shield,
  TrendingUp, Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  totalEvents: number;
  totalSpent: number;
  lastLogin: string;
  createdAt: string;
}

const MOCK_USER: UserDetail = {
  id: 1,
  name: "Rajesh Kumar",
  email: "rajesh@email.com",
  phone: "+91 9876543210",
  role: "CUSTOMER",
  status: "ACTIVE",
  totalEvents: 5,
  totalSpent: 2500000,
  lastLogin: "2024-03-15",
  createdAt: "2024-01-15",
};

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-500 text-white",
  VENDOR: "bg-purple-500 text-white",
  VENUE_OWNER: "bg-orange-500 text-white",
  EVENT_MANAGER: "bg-green-500 text-white",
  ADMIN: "bg-black text-white",
};

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user] = useState<UserDetail>(MOCK_USER);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleToggleStatus = async () => {
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      console.log(`Updating user ${user.id} status to ${newStatus}`);
      toast.success(`User ${newStatus.toLowerCase()} successfully`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        console.log(`Deleting user ${user.id}`);
        toast.success("User deleted successfully");
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/dashboard/admin/users");
      } catch (error: any) {
        console.error("Delete error:", error);
        toast.error("Failed to delete user");
      }
    }
  };

  const handleExport = async () => {
    try {
      console.log(`Exporting user ${user.id}`);
      toast.success("User details exported");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export user");
    }
  };

  const handleSendMessage = () => {
    console.log(`Sending message to user ${user.email}`);
    toast.success("Message sent to user");
  };

  const handleViewEvents = () => {
    console.log(`Viewing events for user ${user.id}`);
    router.push(`/dashboard/admin/events?userId=${user.id}`);
  };

  const handleViewPayments = () => {
    console.log(`Viewing payments for user ${user.id}`);
    router.push(`/dashboard/admin/transactions?userId=${user.id}`);
  };

  const handleViewAnalytics = () => {
    console.log(`Viewing analytics for user ${user.id}`);
    router.push(`/dashboard/admin/reports/users?id=${user.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{user.name}</h1>
            <p className="text-neutral-600">User ID: #{user.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-black hover:bg-neutral-100">
            <Download className="h-4 w-4 mr-2" /> Export
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
        <div className="flex items-center gap-2">
          <Badge className={`${ROLE_COLORS[user.role]} px-4 py-2 text-sm font-semibold`}>
            <Shield className="h-3 w-3 mr-1" />
            {user.role.replace("_", " ")}
          </Badge>
          <Badge className={`${user.status === "ACTIVE" ? "bg-emerald-500" : "bg-neutral-500"} text-white px-4 py-2 text-sm font-semibold`}>
            {user.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleToggleStatus} variant="outline" className="border-black hover:bg-neutral-100">
            {user.status === "ACTIVE" ? (
              <>
                <XCircle className="h-4 w-4 mr-2" /> Deactivate
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Activate
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Email Address</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <p className="text-lg font-bold text-black">{user.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-neutral-400" />
                    <p className="text-lg font-bold text-black">{user.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Last Login</p>
                  <p className="text-lg font-bold text-black">{new Date(user.lastLogin).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Registered On</p>
                  <p className="text-lg font-bold text-black">{new Date(user.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="border-black hover:bg-neutral-100">
                  <MessageSquare className="h-4 w-4 mr-2" /> Send Message
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Activity className="h-5 w-5" /> Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-black">Created Event: Priya & Karthik Wedding</p>
                    <p className="text-xs text-neutral-600">2024-02-10</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-black">Completed Payment: ₹1,50,000</p>
                    <p className="text-xs text-neutral-600">2024-02-15</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200">
                  <div className="h-2 w-2 rounded-full bg-neutral-400 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-black">Account Created</p>
                    <p className="text-xs text-neutral-600">2024-01-15</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Total Events</span>
                <span className="text-xl font-bold text-black">{user.totalEvents}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Total Spent</span>
                <span className="text-xl font-bold text-black">{formatCurrency(user.totalSpent)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Account Status</span>
                <Badge className={user.status === "ACTIVE" ? "bg-emerald-500 text-white" : "bg-neutral-500 text-white"}>
                  {user.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full border-black hover:bg-neutral-100 justify-start">
                <Calendar className="h-4 w-4 mr-2" /> View Events
              </Button>
              <Button variant="outline" className="w-full border-black hover:bg-neutral-100 justify-start">
                <DollarSign className="h-4 w-4 mr-2" /> View Payments
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
