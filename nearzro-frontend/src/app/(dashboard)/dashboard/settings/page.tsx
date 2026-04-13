"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Bell, Lock, Mail, Phone, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await api.patch("/notifications/preferences", {
        email: notifications.email,
        sms: notifications.sms,
        push: notifications.push,
      });
      toast.success("Notification settings saved successfully!");
    } catch (error: any) {
      console.error("Failed to save notification settings:", error);
      toast.error(error?.response?.data?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('NearZro_user');
      router.push('/login');
    }
  };

  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  const handleEnable2FA = () => {
    toast.info("Two-factor authentication will be available soon", {
      description: "We're working on adding this security feature"
    });
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion requires admin approval", {
      description: "Please contact support to delete your account"
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Settings</h1>
          <p className="text-neutral-600">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle className="text-black">
                <Bell className="h-5 w-5 text-neutral-800" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-neutral-600" />
                  <div>
                    <p className="font-medium text-black">Email Notifications</p>
                    <p className="text-sm text-neutral-600">Receive updates via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-neutral-600" />
                  <div>
                    <p className="font-medium text-black">SMS Notifications</p>
                    <p className="text-sm text-neutral-600">Receive updates via SMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.sms}
                  onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-neutral-600" />
                  <div>
                    <p className="font-medium text-black">Push Notifications</p>
                    <p className="text-sm text-neutral-600">Receive browser notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <Button
                variant="premium"
                onClick={handleSaveNotifications}
                disabled={loading}
                className="w-full h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle className="text-black">
                <Lock className="h-5 w-5 text-neutral-800" />
                Security
              </CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <p className="font-medium text-black mb-1">Password</p>
                <p className="text-sm text-neutral-600 mb-4">Change your password regularly to keep your account secure</p>
                <Button variant="silver" onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <p className="font-medium text-black mb-1">Two-Factor Authentication</p>
                <p className="text-sm text-neutral-600 mb-4">Add an extra layer of security to your account</p>
                <Button variant="silver" onClick={handleEnable2FA}>
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle className="text-black">
                <Settings className="h-5 w-5 text-neutral-800" />
                Account
              </CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="font-medium text-red-900 mb-1">Delete Account</p>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
