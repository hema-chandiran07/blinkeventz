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

interface VenueEdit {
  id: number;
  name: string;
  location?: string;
  city: string;
  area?: string;
  capacity?: number;
  description?: string;
  amenities?: string[];
  basePriceMorning?: number;
  basePriceEvening?: number;
  basePriceFullDay?: number;
}

export default function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [venue, setVenue] = useState<VenueEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { withLoadingToast } = useApiToast();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    city: "",
    area: "",
    capacity: 0,
    description: "",
    amenities: "",
    basePriceMorning: 0,
    basePriceEvening: 0,
    basePriceFullDay: 0,
  });

  useEffect(() => {
    loadVenue();
  }, []);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const resolvedParams = await params;
      const response = await api.get(`/venues/${resolvedParams.id}`);
      const data = response.data;
      setVenue(data);
      setFormData({
        name: data.name || "",
        location: data.location || "",
        city: data.city || "",
        area: data.area || "",
        capacity: data.capacity || 0,
        description: data.description || "",
        amenities: data.amenities?.join(", ") || "",
        basePriceMorning: data.basePriceMorning || 0,
        basePriceEvening: data.basePriceEvening || 0,
        basePriceFullDay: data.basePriceFullDay || 0,
      });
    } catch (error: any) {
      console.error("Failed to load venue:", error);
      toast.error("Failed to load venue details");
      router.push("/dashboard/admin/venues");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.city) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const resolvedParams = await params;
      const payload = {
        ...formData,
        amenities: formData.amenities.split(",").map(a => a.trim()).filter(a => a),
      };
      await api.patch(`/venues/${resolvedParams.id}`, payload);
      toast.success("Venue updated successfully");
      router.push(`/dashboard/admin/venues/${resolvedParams.id}`);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update venue");
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
          <p className="text-neutral-600">Loading venue details...</p>
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
            <h1 className="text-3xl font-bold text-black">Edit Venue</h1>
            <p className="text-neutral-600">Update venue information</p>
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
            <CardTitle className="text-black">Venue Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Venue Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter venue name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the venue..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities (comma-separated)</Label>
              <Textarea
                id="amenities"
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="AC, Parking, Catering, Sound System..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Location & Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location"
              />
            </div>

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
              <Label htmlFor="capacity">Capacity (guests)</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="basePriceMorning">Morning Package (₹)</Label>
              <Input
                id="basePriceMorning"
                type="number"
                value={formData.basePriceMorning}
                onChange={(e) => setFormData({ ...formData, basePriceMorning: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePriceEvening">Evening Package (₹)</Label>
              <Input
                id="basePriceEvening"
                type="number"
                value={formData.basePriceEvening}
                onChange={(e) => setFormData({ ...formData, basePriceEvening: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePriceFullDay">Full Day Package (₹)</Label>
              <Input
                id="basePriceFullDay"
                type="number"
                value={formData.basePriceFullDay}
                onChange={(e) => setFormData({ ...formData, basePriceFullDay: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
