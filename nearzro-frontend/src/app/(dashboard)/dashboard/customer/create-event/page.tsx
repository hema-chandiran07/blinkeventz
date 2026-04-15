"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const EVENT_TYPES = ["WEDDING", "ENGAGEMENT", "RECEPTION", "BIRTHDAY", "CORPORATE", "OTHER"];
const TIME_SLOTS = ["MORNING", "EVENING", "FULL_DAY"];

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    eventType: "WEDDING",
    title: "",
    date: "",
    timeSlot: "EVENING",
    city: "Chennai",
    area: "",
    guestCount: "",
    isExpress: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData = {
        ...formData,
        guestCount: parseInt(formData.guestCount),
      };

      await api.post("/events", eventData);
      toast.success("Event created successfully!");
      router.push("/dashboard/customer");
    } catch (error: any) {
      console.error("Event creation error:", error);
      toast.error(error?.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.push("/dashboard/customer")} className="mb-6 gap-2 text-zinc-300 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Create New Event</h1>
          <p className="text-zinc-400">Start planning your special occasion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Priya & Karthik Wedding"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-zinc-900 border-zinc-700 text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType" className="text-zinc-300">Event Type *</Label>
                <select
                  id="eventType"
                  className="flex w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  required
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-zinc-300">Event Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSlot" className="text-zinc-300">Time Slot *</Label>
                <select
                  id="timeSlot"
                  className="flex w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  required
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-zinc-300">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-zinc-300">Area *</Label>
                  <Input
                    id="area"
                    placeholder="e.g., T Nagar"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    required
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestCount" className="text-zinc-300">Expected Guest Count *</Label>
                <Input
                  id="guestCount"
                  type="number"
                  placeholder="100"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  required
                  className="bg-zinc-900 border-zinc-700 text-zinc-100"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="premium"
              className="flex-1 h-12"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Event...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Event
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="silver"
              className="flex-1 h-12"
              onClick={() => router.push("/dashboard/customer")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
