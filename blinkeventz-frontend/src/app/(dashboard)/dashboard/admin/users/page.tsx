"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, Search, Mail, Phone, Calendar, Eye, Ban, CheckCircle2,
  UserCheck, UserX, Shield, Clock, MapPin, Filter, Download, RefreshCw,
  Building, Plus, Edit, Trash2
} from "lucide-react";
import { toast } from "sonner";

const MOCK_USERS = [
  { id: 1, name: "Rajesh Kumar", email: "rajesh@email.com", phone: "+91 9876543210", role: "CUSTOMER", location: "Anna Nagar, Chennai", joined: "2024-01-15", status: "ACTIVE", events: 5 },
  { id: 2, name: "Anita Sharma", email: "anita@email.com", phone: "+91 9123456789", role: "VENDOR", location: "T Nagar, Chennai", joined: "2024-02-20", status: "ACTIVE", events: 12 },
  { id: 3, name: "Mohammed Rizwan", email: "rizwan@email.com", phone: "+91 9988776655", role: "VENUE_OWNER", location: "Adyar, Chennai", joined: "2024-03-10", status: "ACTIVE", events: 8 },
  { id: 4, name: "Priya Menon", email: "priya@email.com", phone: "+91 9876543211", role: "CUSTOMER", location: "Velachery, Chennai", joined: "2024-01-25", status: "INACTIVE", events: 2 },
  { id: 5, name: "John David", email: "john@email.com", phone: "+91 9876543212", role: "EVENT_MANAGER", location: "OMR, Chennai", joined: "2024-02-15", status: "ACTIVE", events: 25 },
  { id: 6, name: "Lakshmi Devi", email: "lakshmi@email.com", phone: "+91 9876543213", role: "CUSTOMER", location: "Guindy, Chennai", joined: "2024-03-05", status: "ACTIVE", events: 3 },
];

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-50 text-blue-700 border-blue-200",
  VENDOR: "bg-purple-50 text-purple-700 border-purple-200",
  VENUE_OWNER: "bg-orange-50 text-orange-700 border-orange-200",
  EVENT_MANAGER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADMIN: "bg-neutral-900 text-white border-neutral-800",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-neutral-100 text-neutral-600 border-neutral-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users] = useState(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Users data refreshed");
  };

  const handleToggleStatus = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    toast.success(`User ${newStatus.toLowerCase()} successfully`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === "ACTIVE").length,
    vendors: users.filter(u => u.role === "VENDOR").length,
    venueOwners: users.filter(u => u.role === "VENUE_OWNER").length,
  };

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Professional Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">User Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage all registered users and their permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-neutral-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-neutral-900 hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Users</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Users</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Vendors</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.vendors}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Venue Owners</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.venueOwners}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-600">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-neutral-300"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
              <option value="VENUE_OWNER">Venue Owner</option>
              <option value="EVENT_MANAGER">Event Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border border-neutral-200 mx-6">
        <CardHeader className="border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-neutral-900">All Users</CardTitle>
            <Badge variant="outline" className="bg-neutral-100 text-neutral-700">
              <Filter className="h-3 w-3 mr-1" />
              {filteredUsers.length} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">User</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Contact</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Role</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Location</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Events</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Joined</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{user.name}</p>
                          <p className="text-xs text-neutral-500">ID: #{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Mail className="h-3 w-3 text-neutral-400" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Phone className="h-3 w-3 text-neutral-400" />
                          {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={`${ROLE_COLORS[user.role]} border text-xs font-medium`}>
                        {user.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-neutral-700">
                        <MapPin className="h-3 w-3 text-neutral-400" />
                        {user.location}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-neutral-900">{user.events} events</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-neutral-700">
                        <Calendar className="h-3 w-3 text-neutral-400" />
                        {new Date(user.joined).toLocaleDateString("en-IN", { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={`${STATUS_COLORS[user.status]} border text-xs font-medium`}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4 text-neutral-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`h-8 w-8 p-0 ${user.status === "ACTIVE" ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                        >
                          {user.status === "ACTIVE" ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
