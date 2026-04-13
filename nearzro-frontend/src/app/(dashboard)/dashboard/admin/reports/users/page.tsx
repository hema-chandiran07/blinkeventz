"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, TrendingUp, UserCheck, Download,
  Search, Activity, ArrowRight, BarChart3, RefreshCw,
  Loader2, AlertCircle, Filter, Trash2, Power, ToggleLeft, ToggleRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ==================== Types ====================
interface UserReportEntry {
  id: number;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
}

interface UsersReportData {
  data: UserReportEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserStats {
  totalUsers: number;
  growth: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
}

interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

// ==================== Constants ====================
const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-500 text-white",
  VENDOR: "bg-purple-500 text-white",
  VENUE_OWNER: "bg-orange-500 text-white",
  EVENT_MANAGER: "bg-green-500 text-white",
  ADMIN: "bg-black text-white",
};

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  VENUE_OWNER: "Venue Owner",
  EVENT_MANAGER: "Event Manager",
  ADMIN: "Admin",
};

const ALL_ROLES = ["CUSTOMER", "VENDOR", "VENUE_OWNER", "EVENT_MANAGER", "ADMIN"];

// ==================== Helpers ====================
function computeGrowthRate(data: UsersReportData): number {
  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 30);
  const prev30Start = new Date(now);
  prev30Start.setDate(prev30Start.getDate() - 60);
  const prev30End = new Date(now);
  prev30End.setDate(prev30End.getDate() - 30);

  const recent = data.data.filter(u => new Date(u.createdAt) >= last30Start).length;
  const previous = data.data.filter(u => {
    const d = new Date(u.createdAt);
    return d >= prev30Start && d < prev30End;
  }).length;

  if (previous === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - previous) / previous) * 100);
}

function computeRetentionRate(users: UserReportEntry[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const olderUsers = users.filter(u => new Date(u.createdAt) <= thirtyDaysAgo);
  if (olderUsers.length === 0) return 0;

  const retained = olderUsers.filter(u => u.isActive).length;
  return Math.round((retained / olderUsers.length) * 100);
}

// ==================== Main Component ====================
export default function UsersReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<UsersReportData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Action dialog states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "activate" | "deactivate" | "changeRole" | null>(null);
  const [confirmUser, setConfirmUser] = useState<UserReportEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState("");

  // Load users report data from backend API: GET /reports/users
  const loadUsersReport = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get<UsersReportData>('/reports/users', {
        params: { page, limit, role: filterRole === 'all' ? undefined : filterRole },
      });

      setReportData(response.data);

      // Calculate stats from report data
      const totalUsers = response.data.total || 0;
      const activeUsers = response.data.data.filter(u => u.isActive).length;

      // Calculate role distribution
      const roleCounts = response.data.data.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const distribution = Object.entries(roleCounts).map(([role, count]) => ({
        role: ROLE_LABELS[role] || role,
        count,
        percentage: Math.round((count / response.data.data.length) * 100) || 0,
      })).sort((a, b) => b.count - a.count);

      setRoleDistribution(distribution);

      setStats({
        totalUsers,
        growth: computeGrowthRate(response.data),
        activeUsers,
        newUsers: response.data.data.filter(u => {
          const joinedDate = new Date(u.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return joinedDate > thirtyDaysAgo;
        }).length,
        retentionRate: computeRetentionRate(response.data.data),
      });
    } catch (error: any) {
      console.error("Failed to load users report:", error);
      toast.error(error?.response?.data?.message || "Failed to load users report");
      setReportData(null);
      setStats(null);
      setRoleDistribution([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filterRole]);

  useEffect(() => {
    loadUsersReport();
  }, [loadUsersReport]);

  // ==================== User Action Handlers (Real Backend APIs) ====================

  const openConfirmDialog = (action: "delete" | "activate" | "deactivate" | "changeRole", user: UserReportEntry) => {
    setConfirmAction(action);
    setConfirmUser(user);
    setNewRole(user.role);
    setConfirmDialogOpen(true);
  };

  const executeAction = async () => {
    if (!confirmUser || !confirmAction) return;

    setActionLoading(true);
    try {
      if (confirmAction === "delete") {
        // Real API: DELETE /users/:id
        await api.delete(`/users/${confirmUser.id}`);
        toast.success(`User "${confirmUser.name || confirmUser.email}" deleted successfully`);

      } else if (confirmAction === "activate") {
        // Real API: PATCH /users/:id { isActive: true }
        await api.patch(`/users/${confirmUser.id}`, { isActive: true });
        toast.success(`User "${confirmUser.name || confirmUser.email}" activated`);

      } else if (confirmAction === "deactivate") {
        // Real API: PATCH /users/:id { isActive: false }
        await api.patch(`/users/${confirmUser.id}`, { isActive: false });
        toast.success(`User "${confirmUser.name || confirmUser.email}" deactivated`);

      } else if (confirmAction === "changeRole") {
        if (!newRole) {
          toast.error("Please select a role");
          setActionLoading(false);
          return;
        }
        // Real API: PATCH /users/:id { role: newRole }
        await api.patch(`/users/${confirmUser.id}`, { role: newRole });
        toast.success(`User role changed to ${ROLE_LABELS[newRole] || newRole}`);
      }

      setConfirmDialogOpen(false);
      loadUsersReport(true);
    } catch (error: any) {
      console.error("User action error:", error);
      toast.error(error?.response?.data?.message || `Failed to ${confirmAction} user`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle export: Real API: GET /reports/users/export
  const handleExport = async () => {
    try {
      const response = await api.get('/reports/users/export', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Users report exported successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to export report");
    }
  };

  const handleRefresh = () => {
    loadUsersReport(true);
  };

  const handleViewUser = (userId: number) => {
    router.push(`/dashboard/admin/users/${userId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (isActive: boolean, isVerified: boolean) => {
    if (!isActive) {
      return <Badge className="bg-neutral-500 text-white">Inactive</Badge>;
    }
    return isVerified ? (
      <Badge className="bg-emerald-500 text-white">Active & Verified</Badge>
    ) : (
      <Badge className="bg-amber-500 text-white">Active (Unverified)</Badge>
    );
  };

  const filteredUsers = reportData?.data.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getDialogConfig = () => {
    if (!confirmUser || !confirmAction) return { title: "", description: "", confirmText: "", danger: false };
    const name = confirmUser.name || confirmUser.email;
    switch (confirmAction) {
      case "delete":
        return { title: "Delete User", description: `Are you sure you want to delete "${name}"? This action cannot be undone.`, confirmText: "Delete User", danger: true };
      case "activate":
        return { title: "Activate User", description: `Activate "${name}"? They will be able to log in and use the platform.`, confirmText: "Activate", danger: false };
      case "deactivate":
        return { title: "Deactivate User", description: `Deactivate "${name}"? They will no longer be able to log in.`, confirmText: "Deactivate", danger: true };
      case "changeRole":
        return { title: "Change User Role", description: `Change role for "${name}" from ${ROLE_LABELS[confirmUser.role] || confirmUser.role} to ${ROLE_LABELS[newRole] || newRole}?`, confirmText: "Change Role", danger: false };
    }
  };

  const dialogConfig = getDialogConfig();

  return (
    <div className="space-y-6">
      {/* ==================== Header ==================== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowRight className="h-5 w-5 rotate-180" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">User Analytics</h1>
            <p className="text-neutral-600">User growth, engagement, and distribution metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100 text-black" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* ==================== Stats Overview ==================== */}
      {!loading && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 border-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Users</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +{stats.growth}% this month
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Active Users</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.activeUsers.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-2">
                    {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-600">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">New Users</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">+{stats.newUsers}</p>
                  <p className="text-xs text-purple-600 mt-2">Last 30 days</p>
                </div>
                <div className="p-3 rounded-full bg-purple-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-neutral-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Retention Rate</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.retentionRate}%</p>
                  <p className="text-xs text-neutral-600 mt-2">Last 30 days</p>
                </div>
                <div className="p-3 rounded-full bg-neutral-900">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== Filters ==================== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-black" />
              <span className="text-sm font-medium text-black">Filters:</span>
            </div>
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-black"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all" className="text-black">All Roles</option>
              <option value="CUSTOMER" className="text-black">Customers</option>
              <option value="VENDOR" className="text-black">Vendors</option>
              <option value="VENUE_OWNER" className="text-black">Venue Owners</option>
              <option value="EVENT_MANAGER" className="text-black">Event Managers</option>
              <option value="ADMIN" className="text-black">Admins</option>
            </select>
            {(searchTerm || filterRole !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchTerm(""); setFilterRole("all"); }}
                className="text-black hover:bg-neutral-100"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== Content Grid ==================== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User List */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-black">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-black">Recent Users</CardTitle>
                <Badge variant="outline">
                  {filteredUsers.length} users
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                  <p className="text-neutral-600 ml-4">Loading users...</p>
                </div>
              ) : !reportData || reportData.data.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">No users found</h3>
                  <p className="text-neutral-600">
                    {searchTerm || filterRole !== 'all' ? "Try adjusting your filters" : "No user data available"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">User</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Role</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Joined</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-bold text-black">{user.name || 'Unnamed User'}</p>
                                <p className="text-xs text-neutral-600">{user.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${ROLE_COLORS[user.role]} text-xs`}>
                                {ROLE_LABELS[user.role] || user.role.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(user.isActive, user.isEmailVerified)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-neutral-600">{formatDate(user.createdAt)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                {/* View → Navigate to user detail page */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-neutral-600 hover:bg-neutral-100"
                                  onClick={() => handleViewUser(user.id)}
                                  title="View Details"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>

                                {/* Activate/Deactivate → PATCH /users/:id */}
                                {user.isActive ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                                    onClick={() => openConfirmDialog("deactivate", user)}
                                    title="Deactivate User"
                                  >
                                    <ToggleRight className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                                    onClick={() => openConfirmDialog("activate", user)}
                                    title="Activate User"
                                  >
                                    <ToggleLeft className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Change Role → PATCH /users/:id { role } */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                  onClick={() => openConfirmDialog("changeRole", user)}
                                  title="Change Role"
                                >
                                  <Power className="h-4 w-4" />
                                </Button>

                                {/* Delete → DELETE /users/:id */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                  onClick={() => openConfirmDialog("delete", user)}
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {reportData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <p className="text-sm text-neutral-600">
                        Showing {(reportData.page - 1) * reportData.limit + 1} to {Math.min(reportData.page * reportData.limit, reportData.total)} of {reportData.total} users
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={reportData.page === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, reportData.totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            const isActive = reportData.page === pageNum;
                            return (
                              isActive ? (
                                <button
                                  key={pageNum}
                                  onClick={() => setPage(pageNum)}
                                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 rounded-xl px-4 text-xs bg-black text-white hover:bg-neutral-800 border border-neutral-700"
                                >
                                  {pageNum}
                                </button>
                              ) : (
                                <Button
                                  key={pageNum}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPage(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              )
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(reportData.totalPages, p + 1))}
                          disabled={reportData.page === reportData.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role Distribution */}
        <div>
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black">
                <BarChart3 className="h-5 w-5" />
                Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loading && roleDistribution.length > 0 ? (
                roleDistribution.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-black">{item.role}</span>
                      <span className="text-sm text-neutral-600">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <p>No role data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ==================== Action Confirmation Dialog ==================== */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] text-black">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-black">
              {confirmAction === "delete" && <Trash2 className="h-5 w-5 text-red-600" />}
              {confirmAction === "activate" && <ToggleLeft className="h-5 w-5 text-green-600" />}
              {confirmAction === "deactivate" && <ToggleRight className="h-5 w-5 text-amber-600" />}
              {confirmAction === "changeRole" && <Power className="h-5 w-5 text-blue-600" />}
              {dialogConfig.title}
            </DialogTitle>
            <DialogDescription className="text-neutral-600">
              {dialogConfig.description}
            </DialogDescription>
          </DialogHeader>

          {confirmAction === "changeRole" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="new-role" className="text-black">New Role</Label>
              <select
                id="new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
              >
                {ALL_ROLES.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={actionLoading || (confirmAction === "changeRole" && !newRole)}
              className={dialogConfig.danger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                dialogConfig.confirmText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
