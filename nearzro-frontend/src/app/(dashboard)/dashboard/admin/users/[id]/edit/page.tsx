"use client";

import { useState, useEffect } from "react";
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

interface UserEdit {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<UserEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CUSTOMER",
    isActive: true,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userId = parseInt(params.id as string);
      const response = await api.get(`/users/${userId}`);
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
        role: foundUser.role || "CUSTOMER",
        isActive: foundUser.isActive,
      });
    } catch (error: any) {
      console.error("Failed to load user:", error);
      toast.error("Failed to load user details");
      router.push("/dashboard/admin/users");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Edit User</h1>
            <p className="text-neutral-600">Update user information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} className="border-black" disabled={saving}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-neutral-800">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="grid gap-6">
        <Card className="border-2 border-black bg-white">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <User className="h-5 w-5" /> User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-black">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className="bg-white text-black border-neutral-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-white text-black border-neutral-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-black">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 XXXXXXXXXX"
                  className="bg-white text-black border-neutral-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-black">Role *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="VENUE_OWNER">Venue Owner</option>
                  <option value="EVENT_MANAGER">Event Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-black">Status</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={formData.isActive ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  className={formData.isActive ? "bg-emerald-600 hover:bg-emerald-700" : "border-neutral-300 text-neutral-700"}
                >
                  Active
                </Button>
                <Button
                  type="button"
                  variant={!formData.isActive ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, isActive: false })}
                  className={!formData.isActive ? "bg-red-600 hover:bg-red-700" : "border-neutral-300 text-neutral-700"}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
