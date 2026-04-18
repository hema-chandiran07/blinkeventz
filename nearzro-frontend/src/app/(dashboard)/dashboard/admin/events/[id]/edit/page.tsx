"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, X, RefreshCw, Calendar, MapPin, Loader2
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<EventEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const controller = new AbortController();
    const loadEvent = async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        const response = await api.get(`/events/${eventId}`, { signal });
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
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          return;
        }
        console.error("Failed to load event:", error);
        toast.error("Failed to load event details");
        router.push("/dashboard/admin/events");
      } finally {
        setLoading(false);
      }
    };
    loadEvent(controller.signal);
    return () => controller.abort();
  }, [eventId, router]);

  const handleSave = async () => {
    if (!formData.title || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/events/${eventId}`, formData);
      toast.success("Event updated successfully");
      router.push(`/dashboard/admin/events/${eventId}`);
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
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-100" />
          <p className="text-zinc-400">Loading event details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5 text-zinc-100" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Edit Event</h1>
            <p className="text-zinc-400">Update event information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} className="border-zinc-700 text-zinc-100 hover:bg-zinc-800">
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="grid gap-6 lg:grid-cols-2 px-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-zinc-400" /> Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter event title"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-zinc-300">Event Type *</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g., Wedding, Corporate, Birthday"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-zinc-300">Event Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests" className="text-zinc-300">Expected Guests</Label>
              <Input
                id="guests"
                type="number"
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-zinc-400" /> Location & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-zinc-300">Venue/Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter venue name"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-zinc-300">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-zinc-300">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
