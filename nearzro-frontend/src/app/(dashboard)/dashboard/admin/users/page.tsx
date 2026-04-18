"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserCheck, Edit, Search, UserMinus, Shield, Eye, MoreVertical, Settings, RefreshCw, FileText, User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  image?: string;
  createdAt: string;
  _count?: {
    customerEvents: number;
    bookings: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const loadUsers = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get("/users", { signal });
      const usersData = extractArray<User>(response);
      setUsers(usersData);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredUsers = users.filter(user => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = (user.name || "").toLowerCase().includes(searchStr) ||
      (user.email || "").toLowerCase().includes(searchStr) ||
      (user.phone && user.phone.includes(searchStr));
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    customers: users.filter(u => u.role === "CUSTOMER").length,
    vendors: users.filter(u => u.role === "VENDOR").length,
    venueOwners: users.filter(u => u.role === "VENUE_OWNER").length,
  };

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">User Management</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage all registered users</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Users</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800">
                <Users className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-800 bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Customers</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{stats.customers}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-950/30">
                <UserCheck className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-800 bg-purple-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Vendors</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{stats.vendors}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-950/30">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-800 bg-orange-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Venue Owners</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">{stats.venueOwners}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-950/30">
                <Users className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/50 mx-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-700 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-zinc-700 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
            >
              <option value="all">All Roles</option>
              <option value="CUSTOMER">Customers</option>
              <option value="VENDOR">Vendors</option>
              <option value="VENUE_OWNER">Venue Owners</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-zinc-800 bg-zinc-900/50 mx-6">
        <CardHeader>
          <CardTitle className="text-zinc-100">Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                 <thead className="border-b border-zinc-800">
                   <tr>
                     <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">User</th>
                     <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Phone</th>
                     <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Role</th>
                     <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Email Verified</th>
                     <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Joined</th>
                     <th className="text-right py-3 px-4 text-sm font-semibold text-zinc-400">Actions</th>
                   </tr>
                 </thead>
                <tbody>
                   {filteredUsers.map((user) => (
                     <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                       <td className="py-3 px-4">
                         <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                             {user.image ? (
                               <img src={user.image} alt={user.name || 'User'} className="h-full w-full object-cover" />
                             ) : (
                               <UserIcon className="h-5 w-5 text-zinc-400" />
                             )}
                           </div>
                           <div>
                             <p className="font-medium text-zinc-100">{user.name || "N/A"}</p>
                             <p className="text-sm text-zinc-400">{user.email ?? "N/A"}</p>
                           </div>
                         </div>
                       </td>
                       <td className="py-3 px-4 text-sm text-zinc-400">
                         {user.phone ?? "N/A"}
                       </td>
                       <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          user.role === "ADMIN" ? "bg-zinc-800 text-zinc-100 border-zinc-600" :
                          user.role === "VENUE_OWNER" ? "bg-orange-950/30 text-orange-400 border-orange-700" :
                          user.role === "VENDOR" ? "bg-purple-950/30 text-purple-400 border-purple-700" :
                          "bg-blue-950/30 text-blue-400 border-blue-700"
                        }`}>
                          {user.role || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {user.isEmailVerified ? (
                          <Badge className="bg-emerald-950/30 text-emerald-400 border-emerald-700 text-xs">Verified</Badge>
                        ) : (
                          <Badge className="bg-amber-950/30 text-amber-400 border-amber-700 text-xs">Pending</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                          className="hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 font-bold text-[10px] uppercase tracking-tighter"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-zinc-900/50 py-6 px-10 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-700 text-center italic">Encryption Active • Distributed Ledger Authority • Optimized for Command Access</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
