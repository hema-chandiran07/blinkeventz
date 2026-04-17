"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Bell, Mail, MessageSquare, Smartphone, ArrowLeft, Save, Loader2, DollarSign, Calendar
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type NotificationType = "BOOKING" | "PAYMENT" | "EVENT" | "SYSTEM";
type NotificationChannel = "EMAIL" | "SMS" | "PUSH";

interface NotificationPreference {
  type: NotificationType;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export default function CustomerNotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    { type: "BOOKING", email: true, sms: true, push: true },
    { type: "PAYMENT", email: true, sms: true, push: true },
    { type: "EVENT", email: true, sms: false, push: true },
    { type: "SYSTEM", email: true, sms: false, push: false },
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const controller = new AbortController();
    loadPreferences(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, router]);

  const loadPreferences = async (signal?: AbortSignal) => {
    try {
      const response = await api.get("/notifications/preferences", { signal });
      if (response.data && response.data.length > 0) {
        setPreferences(response.data);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Error loading preferences:", error);
    }
  };

  const handleToggle = (type: NotificationType, channel: NotificationChannel, value: boolean) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.type === type
          ? { ...pref, [channel.toLowerCase()]: value }
          : pref
      )
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put("/notifications/preferences", { preferences });
      toast.success("Notification preferences saved!");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error(error?.response?.data?.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/dashboard/customer")} className="mb-6 gap-2 text-zinc-300 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Notification Settings</h1>
          <p className="text-zinc-400">Manage how you receive notifications about your events</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/50 mb-6">
          <CardHeader>
            <CardTitle className="text-zinc-100">
              <Bell className="h-5 w-5 text-zinc-400" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-zinc-400">Choose which notifications you want to receive and how</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {preferences.map((pref) => (
              <div key={pref.type} className="p-4 rounded-lg border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {pref.type === "BOOKING" && <Bell className="h-5 w-5 text-blue-400" />}
                    {pref.type === "PAYMENT" && <DollarSign className="h-5 w-5 text-green-400" />}
                    {pref.type === "EVENT" && <Calendar className="h-5 w-5 text-purple-400" />}
                    {pref.type === "SYSTEM" && <MessageSquare className="h-5 w-5 text-zinc-400" />}
                    <div>
                      <p className="font-semibold text-zinc-100">
                        {pref.type === "BOOKING" && "Booking Updates"}
                        {pref.type === "PAYMENT" && "Payment Notifications"}
                        {pref.type === "EVENT" && "Event Reminders"}
                        {pref.type === "SYSTEM" && "System Notifications"}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {pref.type === "BOOKING" && "Get updates about your venue and vendor bookings"}
                        {pref.type === "PAYMENT" && "Payment confirmations and receipts"}
                        {pref.type === "EVENT" && "Reminders and updates about upcoming events"}
                        {pref.type === "SYSTEM" && "Important platform updates and announcements"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 pl-8">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-300">Email</span>
                    <Switch
                      checked={pref.email}
                      onCheckedChange={(value) => handleToggle(pref.type, "EMAIL", value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-300">SMS</span>
                    <Switch
                      checked={pref.sms}
                      onCheckedChange={(value) => handleToggle(pref.type, "SMS", value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-300">Push</span>
                    <Switch
                      checked={pref.push}
                      onCheckedChange={(value) => handleToggle(pref.type, "PUSH", value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="premium"
            onClick={handleSave}
            disabled={loading}
            className="h-12 px-8"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
