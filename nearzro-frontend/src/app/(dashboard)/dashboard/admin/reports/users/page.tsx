"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area 
} from 'recharts';

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

  // Action handlers removed as per administrative policy (view-only)

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

  // Action dialog logic removed

  return (
    <div className="space-y-8 p-6 bg-[#0a0a0b] text-white selection:bg-blue-500/30 min-h-screen">
      {/* ==================== Header ==================== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="hover:bg-white shadow-sm rounded-full transition-all"
          >
            <ArrowRight className="h-5 w-5 rotate-180" />
          </Button>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-2xl border border-zinc-700/50">
            <Users className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              User <span className="text-zinc-500">Intelligence</span>
            </h1>
            <p className="text-zinc-500 font-medium">Growth indexing and demographic distribution matrix</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all rounded-full" 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Sync
          </Button>
          <Button 
            className="bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5 transition-all font-bold rounded-full h-11 px-8" 
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" /> Export Dataset
          </Button>
        </div>
      </motion.div>

      {/* ==================== Stats Overview ==================== */}
      {!loading && stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Identities", value: stats.totalUsers, growth: stats.growth, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Active Nodes", value: stats.activeUsers, subtext: `${stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% Uptime`, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "New Provisions", value: stats.newUsers, subtext: "30D Velocity", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "Retention Delta", value: `${stats.retentionRate}%`, subtext: "Stability Index", icon: Activity, color: "text-zinc-400", bg: "bg-zinc-500/10" }
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl backdrop-blur-md overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-1">{item.label}</p>
                      <p className="text-3xl font-black text-white">{item.value.toLocaleString()}</p>
                      {item.growth !== undefined ? (
                        <p className="text-[10px] text-blue-400 mt-2 flex items-center gap-1 font-bold">
                          <TrendingUp className="h-3 w-3" /> +{item.growth}% Monthly Linear Growth
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-tighter">{item.subtext}</p>
                      )}
                    </div>
                    <div className={cn("p-3 rounded-xl border", item.bg, item.color, "border-white/5 shadow-2xl")}>
                      <item.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ==================== Filters ==================== */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-tighter">Query Filter:</span>
            </div>
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search identity registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white focus:border-blue-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              className="flex h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
            >
              <option value="all">Global Fleet</option>
              <option value="CUSTOMER">End Users</option>
              <option value="VENDOR">Service Providers</option>
              <option value="VENUE_OWNER">Asset Owners</option>
              <option value="EVENT_MANAGER">Regional Nodes</option>
              <option value="ADMIN">Root Administrators</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Charts ==================== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-zinc-900 shadow-2xl border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Provisioning Velocity
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Temporal Growth Analysis</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData?.data.slice(0, 15).reverse().map((u, i) => ({ name: formatDate(u.createdAt), users: i + 1 })) || []}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 shadow-2xl border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Role Composition
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Demographic Matrix</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="role"
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ffffff'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ==================== Content Grid ==================== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User List */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white font-black tracking-tight">Active Identity Registry</CardTitle>
                <Badge variant="outline" className="border-zinc-800 text-zinc-500 font-bold uppercase tracking-tighter text-[10px]">
                  {filteredUsers.length} ARCHIVED NODES
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
                      <thead className="bg-zinc-950/50 border-b border-zinc-800">
                        <tr>
                          <th className="text-left py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identity Node</th>
                          <th className="text-left py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Protocol Type</th>
                          <th className="text-left py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Uptime Status</th>
                          <th className="text-left py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Provision Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="py-4 px-4">
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.name || 'Anonymous'}</p>
                                <p className="text-[10px] text-zinc-500 font-medium font-mono">{user.email}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={`${ROLE_COLORS[user.role]} text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-md shadow-sm border border-white/10`}>
                                {ROLE_LABELS[user.role] || user.role.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              {getStatusBadge(user.isActive, user.isEmailVerified)}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-xs text-zinc-500 font-bold">{formatDate(user.createdAt)}</span>
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
          <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
            <CardHeader className="border-b border-zinc-800/50 pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                Sector Analysis
              </CardTitle>
              <CardDescription className="text-zinc-500 font-medium font-mono text-[10px] uppercase tracking-widest">Protocol Distribution Matrix</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {!loading && roleDistribution.length > 0 ? (
                roleDistribution.map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-tighter">{item.role}</span>
                      <span className="text-[10px] font-mono text-zinc-500 font-bold">{item.count} NODES | {item.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-700 font-bold uppercase tracking-widest text-[10px]">
                  No sector data synchronized
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action dialog removed */}
    </div>
  );
}
