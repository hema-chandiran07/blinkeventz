"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, X, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { useApiToast } from "@/components/ui/toast-provider";

interface VendorEdit {
  id: number;
  businessName: string;
  description?: string;
  city: string;
  area: string;
  serviceType: string;
  baseRate?: number;
  phone?: string;
  email?: string;
}

export default function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { withLoadingToast } = useApiToast();

  const [formData, setFormData] = useState({
    businessName: "",
    description: "",
    city: "",
    area: "",
    serviceType: "",
    baseRate: 0,
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const resolvedParams = await params;
      const response = await api.get(`/vendors/${resolvedParams.id}`);
      const data = response.data;
      setVendor(data);
      setFormData({
        businessName: data.businessName || "",
        description: data.description || "",
        city: data.city || "",
        area: data.area || "",
        serviceType: data.serviceType || "",
        baseRate: data.baseRate || 0,
        phone: data.user?.phone || "",
        email: data.user?.email || "",
      });
    } catch (error: any) {
      console.error("Failed to load vendor:", error);
      toast.error("Failed to load vendor details");
      router.push("/dashboard/admin/vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.businessName || !formData.city || !formData.serviceType) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const resolvedParams = await params;
      await api.patch(`/vendors/${resolvedParams.id}`, formData);
      toast.success("Vendor updated successfully");
      router.push(`/dashboard/admin/vendors/${resolvedParams.id}`);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update vendor");
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
          <p className="text-neutral-600">Loading vendor details...</p>
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
            <h1 className="text-3xl font-bold text-black">Edit Vendor</h1>
            <p className="text-neutral-600">Update vendor information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} className="border-black">
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-neutral-800">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Enter business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the business..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <Input
                id="serviceType"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                placeholder="e.g., Photography, Catering, Decoration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseRate">Base Rate (₹)</Label>
              <Input
                id="baseRate"
                type="number"
                value={formData.baseRate}
                onChange={(e) => setFormData({ ...formData, baseRate: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Location & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Enter area"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
