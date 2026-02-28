"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, Calendar, Eye, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    loadUsers();
  }, [isAuthenticated, user, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      setUsers([
        { id: 1, name: "John Doe", email: "john@example.com", phone: "9876543210", role: "CUSTOMER", isActive: true, createdAt: "2024-01-15" },
        { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "9876543211", role: "VENDOR", isActive: true, createdAt: "2024-02-20" },
        { id: 3, name: "Mike Johnson", email: "mike@example.com", phone: "9876543212", role: "VENUE_OWNER", isActive: true, createdAt: "2024-03-10" },
      ]);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (userId: number, currentStatus: boolean) => {
    toast.success(`User ${currentStatus ? "deactivated" : "activated"} successfully`);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-neutral-800 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">User Management</h1>
          <p className="text-neutral-600 mt-1">View and manage all registered users</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin")}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="border-silver-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search users..."
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Joined</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-black">{user.name}</p>
                          <p className="text-sm text-neutral-600">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-neutral-100 text-neutral-800 border-neutral-200">
                        {user.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {user.phone && (
                          <div className="flex items-center gap-1 text-sm text-neutral-600">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={user.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/admin/users?id=${user.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                        >
                          {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
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
