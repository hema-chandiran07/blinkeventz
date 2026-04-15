"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, Trash2, Mail, Calendar,
  CheckCircle2, XCircle, Download, MessageSquare, Shield,
  Loader2
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  events?: any[];
  vendor?: any;
  venues?: any[];
}

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-500 text-white",
  VENDOR: "bg-purple-500 text-white",
  VENUE_OWNER: "bg-orange-500 text-white",
  EVENT_MANAGER: "bg-green-500 text-white",
  ADMIN: "bg-black text-white",
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [params.id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${params.id}`);
      setUser(response.data);
    } catch (error: any) {
      console.error("Failed to load user:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    
    const newStatus = !user.isActive;
    try {
      setActionLoading(true);
      // Update user status - adjust endpoint as needed
      await api.patch(`/users/${user.id}`, { isActive: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      loadUser();
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      setActionLoading(true);
      await api.delete(`/users/${user?.id}`);
      toast.success("User deleted successfully");
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = () => {
    router.push(`/dashboard/admin/compose?userId=${user?.id}&email=${encodeURIComponent(user?.email || '')}&method=email`);
  };

  const handleExportCSV = () => {
    if (!user) return;

    const headers = ['Field', 'Value'];
    const rows = [
      ['ID', user.id],
      ['Name', user.name],
      ['Email', user.email],
      ['Phone', user.phone || 'N/A'],
      ['Role', user.role],
      ['Status', user.isActive ? 'Active' : 'Inactive'],
      ['Email Verified', user.isEmailVerified ? 'Yes' : 'No'],
      ['Created At', new Date(user.createdAt).toLocaleString()],
    ];

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-${user.name.replace(/\s+/g, '-').toLowerCase()}-${user.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("User data exported successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-neutral-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-bold text-black mb-2">User Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{user.name}</h1>
            <p className="text-neutral-600">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-black" onClick={handleSendMessage}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" className="border-black" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* User Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-black">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Role</p>
                <p className="text-2xl font-bold text-black mt-1">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="p-3 rounded-full bg-black">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Status</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {user.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Email Verified</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {user.isEmailVerified ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Joined</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Full Name</p>
              <p className="font-medium text-black">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Email Address</p>
              <p className="font-medium text-black">{user.email}</p>
            </div>
            {user.phone && (
              <div>
                <p className="text-xs text-neutral-600">Phone Number</p>
                <p className="font-medium text-black">{user.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-600">Account Created</p>
              <p className="font-medium text-black">
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Account Active</span>
              <Badge className={user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Email Verified</span>
              <Badge className={user.isEmailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                {user.isEmailVerified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Role</span>
              <Badge className={ROLE_COLORS[user.role] || "bg-neutral-100 text-neutral-700"}>
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={user.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={user.isActive ? "bg-red-600 hover:bg-red-700" : "bg-black"}
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
              className="border-red-300 text-red-600 hover:bg-red-50"
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
