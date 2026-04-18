"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Edit, Trash2, Mail, Calendar,
  CheckCircle2, XCircle, Download, MessageSquare, Shield,
  Loader2, User
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";

interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  image?: string;
  createdAt: string;
  customerEvents?: any[];
  bookings?: any[];
  payments?: any[];
  reviews?: any[];
  vendor?: any;
  venues?: any[];
}

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-950/30 text-blue-400 border-blue-700",
  VENDOR: "bg-purple-950/30 text-purple-400 border-purple-700",
  VENUE_OWNER: "bg-orange-950/30 text-orange-400 border-orange-700",
  EVENT_MANAGER: "bg-emerald-950/30 text-emerald-400 border-emerald-700",
  ADMIN: "bg-zinc-800 text-zinc-100 border-zinc-600",
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUser = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${params.id}`, { signal });
      setUser(response.data);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Failed to load user:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const controller = new AbortController();
    loadUser(controller.signal);
    return () => controller.abort();
  }, [loadUser]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const loadAllData = () => {
    loadUser();
  };

  const handleSendMessage = () => {
    toast.info("Message interface initializing...");
  };

  const handleExportCSV = () => {
    toast.info("Exporting user ledger data...");
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to permanently delete this user account? This action cannot be undone.")) return;

    try {
      setActionLoading(true);
      await api.delete(`/users/${user.id}`);
      toast.success("Identity record purged successfully");
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Purge protocol failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;

    const newStatus = !user.isActive;
    try {
      setActionLoading(true);
      await api.patch(`/users/${user.id}`, { isActive: newStatus });
      toast.success(`User account ${newStatus ? 'fully restored' : 'suspended indefinitely'}`);
      loadAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Critical error updating status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-400">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <div className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-bold text-zinc-100 mb-2">User Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/users")} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt={user?.name || 'User'} className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-zinc-400" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">{user?.name}</h1>
              <p className="text-zinc-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleSendMessage}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Message
        </Button>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Role</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800">
                <Shield className="h-6 w-6 text-zinc-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Status</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {user.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-950/40">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-800 bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Email Verified</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {user.isEmailVerified ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-950/40">
                <Mail className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-800 bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Joined</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-950/40">
                <Calendar className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Full Name</p>
              <p className="font-medium text-zinc-100">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Email Address</p>
              <p className="font-medium text-zinc-100">{user.email}</p>
            </div>
            {user.phone && (
              <div>
                <p className="text-xs text-zinc-500">Phone Number</p>
                <p className="font-medium text-zinc-100">{user.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500">Account Created</p>
              <p className="font-medium text-zinc-100">
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Account Active</span>
              <Badge className={user.isActive ? "bg-emerald-950/30 text-emerald-400 border border-emerald-700" : "bg-red-950/30 text-red-400 border border-red-700"}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Email Verified</span>
              <Badge className={user.isEmailVerified ? "bg-emerald-950/30 text-emerald-400 border border-emerald-700" : "bg-amber-950/30 text-amber-400 border border-amber-700"}>
                {user.isEmailVerified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Role</span>
              <Badge className={ROLE_COLORS[user.role] || "bg-zinc-800 text-zinc-400 border-zinc-600"}>
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={user.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={user.isActive ? "bg-red-600 hover:bg-red-700" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"}
            >
              {user.isActive ? (
                <XCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </Button>

            <Button
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-950/30 hover:text-red-300"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
