"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings, ToggleLeft, Link, Bell, Shield, Save, AlertTriangle,
  CheckCircle2, Database, Mail, MessageSquare, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api-endpoints";

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    // Feature Flags
    enableNewDashboard: true,
    enableAiPlanning: true,
    enableExpressBooking: false,
    enableVendorMessaging: true,
    enableAutoApprove: false,
    enableMaintenanceMode: false,
    
    // Integrations
    razorpayEnabled: true,
    sendgridEnabled: true,
    twilioEnabled: false,
    googleOAuthEnabled: true,
    facebookOAuthEnabled: false,
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Security
    requireMfa: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
  });

  const handleSave = async () => {
    try {
      console.log("Saving settings:", settings);
      toast.success("Settings saved successfully!");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleToggle = async (key: string) => {
    try {
      const newValue = !settings[key as keyof typeof settings];
      setSettings(prev => ({ ...prev, [key]: newValue }));
      console.log(`Toggled ${key} to ${newValue}`);
      toast.success("Setting updated");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error("Toggle error:", error);
      toast.error("Failed to update setting");
    }
  };

  const handleInputChange = async (key: string, value: any) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      console.log(`Changed ${key} to ${value}`);
      toast.success("Setting updated");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error("Input change error:", error);
      toast.error("Failed to update setting");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">System Settings</h1>
          <p className="text-neutral-600">Configure feature flags, integrations, and system preferences</p>
        </div>
        <Button className="bg-black hover:bg-neutral-800" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Save Changes
        </Button>
      </motion.div>

      {/* Alert Banner */}
      {settings.enableMaintenanceMode && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Maintenance Mode Active</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    The platform is currently in maintenance mode. Users cannot access the platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Settings Grid */}
      <div className="grid gap-6">
        {/* Feature Flags */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription className="text-neutral-600">Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">New Dashboard</p>
                  <p className="text-sm text-neutral-600">Enable the new dashboard design for all users</p>
                </div>
              </div>
              <Switch checked={settings.enableNewDashboard} onCheckedChange={() => handleToggle("enableNewDashboard")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">AI Event Planning</p>
                  <p className="text-sm text-neutral-600">Enable AI-powered event planning assistant</p>
                </div>
              </div>
              <Switch checked={settings.enableAiPlanning} onCheckedChange={() => handleToggle("enableAiPlanning")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Express Booking</p>
                  <p className="text-sm text-neutral-600">Allow instant booking without approval</p>
                </div>
              </div>
              <Switch checked={settings.enableExpressBooking} onCheckedChange={() => handleToggle("enableExpressBooking")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Auto-Approve Venues</p>
                  <p className="text-sm text-neutral-600">Automatically approve new venue submissions</p>
                </div>
              </div>
              <Switch checked={settings.enableAutoApprove} onCheckedChange={() => handleToggle("enableAutoApprove")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Maintenance Mode</p>
                  <p className="text-sm text-neutral-600">Take the entire platform offline for maintenance</p>
                </div>
              </div>
              <Switch checked={settings.enableMaintenanceMode} onCheckedChange={() => handleToggle("enableMaintenanceMode")} />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <Link className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription className="text-neutral-600">Configure third-party service integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Razorpay Payments</p>
                  <p className="text-sm text-neutral-600">Enable Razorpay payment gateway</p>
                </div>
              </div>
              <Switch checked={settings.razorpayEnabled} onCheckedChange={() => handleToggle("razorpayEnabled")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">SendGrid Email</p>
                  <p className="text-sm text-neutral-600">Enable SendGrid for transactional emails</p>
                </div>
              </div>
              <Switch checked={settings.sendgridEnabled} onCheckedChange={() => handleToggle("sendgridEnabled")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Twilio SMS</p>
                  <p className="text-sm text-neutral-600">Enable Twilio for SMS notifications</p>
                </div>
              </div>
              <Switch checked={settings.twilioEnabled} onCheckedChange={() => handleToggle("twilioEnabled")} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Google OAuth</p>
                  <p className="text-sm text-neutral-600">Enable Google sign-in</p>
                </div>
              </div>
              <Switch checked={settings.googleOAuthEnabled} onCheckedChange={() => handleToggle("googleOAuthEnabled")} />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-neutral-600">Configure security and authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-black">Require MFA</p>
                  <p className="text-sm text-neutral-600">Require multi-factor authentication for all admin accounts</p>
                </div>
              </div>
              <Switch checked={settings.requireMfa} onCheckedChange={() => handleToggle("requireMfa")} />
            </div>

            <div className="p-4 rounded-lg border border-neutral-200">
              <div className="space-y-2">
                <Label className="text-black">Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleInputChange("sessionTimeout", parseInt(e.target.value))}
                  className="border-neutral-300 w-32"
                />
                <p className="text-xs text-neutral-600">Users will be logged out after this period of inactivity</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-neutral-200">
              <div className="space-y-2">
                <Label className="text-black">Max Login Attempts</Label>
                <Input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleInputChange("maxLoginAttempts", parseInt(e.target.value))}
                  className="border-neutral-300 w-32"
                />
                <p className="text-xs text-neutral-600">Account will be locked after this many failed attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
