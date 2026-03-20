"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, X, RefreshCw, Calendar, MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { useApiToast } from "@/components/ui/toast-provider";

interface EventEdit {
  id: number;
  title: string;
  type: string;
  date: string;
  location?: string;
  city?: string;
  guests?: number;
  notes?: string;
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { withLoadingToast } = useApiToast();

  const [formData, setFormData] = useState({
    title: "",
    type: "",
    date: "",
    location: "",
    city: "",
    guests: 0,
    notes: "",
  });

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const resolvedParams = await params;
      const response = await api.get(`/events/${resolvedParams.id}`);
      const data = response.data;
      setEvent(data);
      setFormData({
        title: data.title || "",
        type: data.type || "",
        date: data.date || "",
        location: data.location || "",
        city: data.city || "",
        guests: data.guests || 0,
        notes: data.notes || "",
      });
    } catch (error: any) {
      console.error("Failed to load event:", error);
      toast.error("Failed to load event details");
      router.push("/dashboard/admin/events");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const resolvedParams = await params;
      await api.patch(`/events/${resolvedParams.id}`, formData);
      toast.success("Event updated successfully");
      router.push(`/dashboard/admin/events/${resolvedParams.id}`);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update event");
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
          <p className="text-neutral-600">Loading event details...</p>
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
            <h1 className="text-3xl font-bold text-black">Edit Event</h1>
            <p className="text-neutral-600">Update event information</p>
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
            <CardTitle className="text-black flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Event Type *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g., Wedding, Corporate, Birthday"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Event Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Expected Guests</Label>
              <Input
                id="guests"
                type="number"
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Location & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Venue/Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter venue name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
