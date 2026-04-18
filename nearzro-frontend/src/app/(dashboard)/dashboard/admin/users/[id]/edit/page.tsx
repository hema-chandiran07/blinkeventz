"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Save, X, RefreshCw, User
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface UserEdit {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  image?: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSelf = Number(currentUser?.id) === Number(params.id);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CUSTOMER",
    isActive: true,
  });

  const loadUser = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const userId = parseInt(params.id as string);
      const response = await api.get(`/users/${userId}`, { signal });
      const foundUser = response.data;

      if (!foundUser) {
        toast.error("User not found");
        router.push("/dashboard/admin/users");
        return;
      }

      setUser(foundUser);
      setFormData({
        name: foundUser.name || "",
        email: foundUser.email || "",
        phone: foundUser.phone || "",
        role: foundUser.role ?? "CUSTOMER",
        isActive: foundUser.isActive,
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Failed to load user:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    const controller = new AbortController();
    loadUser(controller.signal);
    return () => controller.abort();
  }, [loadUser]);

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const userId = parseInt(params.id as string);
      await api.patch(`/users/${userId}`, formData);
      toast.success("User updated successfully");
      router.push(`/dashboard/admin/users/${userId}`);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-400">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen p-6">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                {user?.image ? (
                  <img src={user.image} alt={user?.name || 'User'} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-zinc-400" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100">Edit User</h1>
                <p className="text-zinc-400">{user?.name || 'User'}</p>
              </div>
            </div>
          </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" disabled={saving}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-semibold">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="grid gap-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <User className="h-5 w-5 text-zinc-400" /> User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className="bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-500 focus:ring-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-500 focus:ring-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-300">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                  className="bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-500 focus:ring-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-zinc-300">
                  Role * {isSelf && <span className="text-[10px] text-amber-400 font-bold ml-2">(Current User - Semi Restricted)</span>}
                </Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  disabled={isSelf}
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="VENUE_OWNER">Venue Owner</option>
                  <option value="EVENT_MANAGER">Event Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {isSelf && <p className="text-[10px] text-zinc-500">You cannot change your own administrative role to prevent accidental lockout.</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">
                Status {isSelf && <span className="text-[10px] text-amber-400 font-bold ml-2">(Protected)</span>}
              </Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={formData.isActive ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  disabled={isSelf}
                  className={formData.isActive ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}
                >
                  Active
                </Button>
                <Button
                  type="button"
                  variant={!formData.isActive ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, isActive: false })}
                  disabled={isSelf}
                  className={!formData.isActive ? "bg-red-600 hover:bg-red-700 disabled:opacity-50" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}
                >
                  Inactive
                </Button>
              </div>
              {isSelf && <p className="text-[10px] text-zinc-500 font-medium">Platform policies prevent admins from deactivating their own accounts.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
