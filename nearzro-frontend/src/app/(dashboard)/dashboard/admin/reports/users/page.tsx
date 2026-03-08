"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, TrendingUp, UserCheck, UserX, Calendar, Download,
  Search, Filter, Activity, ArrowRight, BarChart3
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

const USER_DATA = [
  { id: 1, name: "Rajesh Kumar", email: "rajesh@email.com", role: "CUSTOMER", events: 5, spent: 2500000, joined: "2024-01-15", status: "ACTIVE" },
  { id: 2, name: "Anita Sharma", email: "anita@email.com", role: "VENDOR", events: 12, spent: 0, joined: "2024-02-20", status: "ACTIVE" },
  { id: 3, name: "Mohammed Rizwan", email: "rizwan@email.com", role: "VENUE_OWNER", events: 8, spent: 0, joined: "2024-03-10", status: "ACTIVE" },
  { id: 4, name: "Priya Menon", email: "priya@email.com", role: "CUSTOMER", events: 2, spent: 350000, joined: "2024-01-25", status: "INACTIVE" },
  { id: 5, name: "John David", email: "john@email.com", role: "EVENT_MANAGER", events: 25, spent: 0, joined: "2024-02-15", status: "ACTIVE" },
];

const ROLE_DISTRIBUTION = [
  { role: "Customer", count: 847, percentage: 68 },
  { role: "Vendor", count: 156, percentage: 12.5 },
  { role: "Venue Owner", count: 89, percentage: 7.1 },
  { role: "Event Manager", count: 134, percentage: 10.7 },
  { role: "Admin", count: 21, percentage: 1.7 },
];

export default function UsersReportPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const stats = {
    totalUsers: 1247,
    growth: 22.1,
    activeUsers: 1189,
    newUsers: 127,
    retentionRate: 94.2,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleExport = () => {
    console.log("Exporting users report...");
    toast.success("Users report exported successfully!");
  };

  const handleViewUser = (id: number) => {
    console.log(`Viewing user ${id}`);
    router.push(`/dashboard/admin/users/${id}`);
  };

  const ROLE_COLORS: Record<string, string> = {
    CUSTOMER: "bg-blue-500 text-white",
    VENDOR: "bg-purple-500 text-white",
    VENUE_OWNER: "bg-orange-500 text-white",
    EVENT_MANAGER: "bg-green-500 text-white",
    ADMIN: "bg-black text-white",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowRight className="h-5 w-5 rotate-180" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">User Analytics</h1>
            <p className="text-neutral-600">User growth and engagement metrics</p>
          </div>
        </div>
        <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Report
        </Button>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Users</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalUsers}</p>
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
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.activeUsers}</p>
                <p className="text-xs text-emerald-600 mt-2">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total</p>
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
                <p className="text-xs text-purple-600 mt-2">This month</p>
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

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User List */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black">Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-neutral-300" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Events</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Spent</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {USER_DATA.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-bold text-black">{user.name}</p>
                            <p className="text-xs text-neutral-600">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${ROLE_COLORS[user.role]} text-xs`}>{user.role.replace("_", " ")}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-black">{user.events}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-bold text-black">{user.spent > 0 ? formatCurrency(user.spent) : "-"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={user.status === "ACTIVE" ? "bg-emerald-500 text-white" : "bg-neutral-500 text-white"}>{user.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" className="text-black hover:bg-neutral-100" onClick={() => handleViewUser(user.id)}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Distribution */}
        <div>
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ROLE_DISTRIBUTION.map((item, index) => (
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
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
