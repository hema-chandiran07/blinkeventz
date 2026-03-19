"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Bell, Mail, MessageSquare, Smartphone, ArrowLeft, Save, Loader2
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
    loadPreferences();
  }, [isAuthenticated, router]);

  const loadPreferences = async () => {
    try {
      const response = await api.get("/notifications/preferences");
      if (response.data && response.data.length > 0) {
        setPreferences(response.data);
      }
    } catch (error) {
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
      <Button variant="ghost" onClick={() => router.push("/dashboard/customer")} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Notification Settings</h1>
          <p className="text-neutral-600">Manage how you receive notifications about your events</p>
        </div>

        <Card className="border-silver-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-neutral-800" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose which notifications you want to receive and how</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {preferences.map((pref) => (
              <div key={pref.type} className="p-4 rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {pref.type === "BOOKING" && <Bell className="h-5 w-5 text-blue-600" />}
                    {pref.type === "PAYMENT" && <DollarSign className="h-5 w-5 text-green-600" />}
                    {pref.type === "EVENT" && <Calendar className="h-5 w-5 text-purple-600" />}
                    {pref.type === "SYSTEM" && <MessageSquare className="h-5 w-5 text-neutral-600" />}
                    <div>
                      <p className="font-semibold text-black">
                        {pref.type === "BOOKING" && "Booking Updates"}
                        {pref.type === "PAYMENT" && "Payment Notifications"}
                        {pref.type === "EVENT" && "Event Reminders"}
                        {pref.type === "SYSTEM" && "System Notifications"}
                      </p>
                      <p className="text-sm text-neutral-600">
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
                    <Mail className="h-4 w-4 text-neutral-600" />
                    <span className="text-sm font-medium">Email</span>
                    <Switch
                      checked={pref.email}
                      onCheckedChange={(value) => handleToggle(pref.type, "EMAIL", value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-neutral-600" />
                    <span className="text-sm font-medium">SMS</span>
                    <Switch
                      checked={pref.sms}
                      onCheckedChange={(value) => handleToggle(pref.type, "SMS", value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-neutral-600" />
                    <span className="text-sm font-medium">Push</span>
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

// Helper component for DollarSign icon
function DollarSign({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Helper component for Calendar icon
function Calendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
