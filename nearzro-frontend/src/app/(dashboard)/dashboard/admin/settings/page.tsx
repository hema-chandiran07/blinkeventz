"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  User, Lock, Bell, Shield, Mail, Phone, MapPin, Camera, Save, X,
  Eye, EyeOff, Key, Globe, Moon, Sun, AlertTriangle, CheckCircle2,
  RefreshCw, LogOut, Trash2, Download, Upload
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "preferences">("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    username: "admin",
    email: "admin@NearZro.com",
    name: "Admin User",
    phone: "+91 9876543210",
    location: "Chennai, Tamil Nadu",
    bio: "Platform Administrator",
    avatar: "",
  });

  // Security State
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
    sessionTimeout: 30,
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    eventAlerts: true,
    paymentAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
  });

  // Preferences State
  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    darkMode: false,
    compactMode: false,
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Profile updated successfully");
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (security.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Password changed successfully");
    setSecurity({ ...security, currentPassword: "", newPassword: "", confirmPassword: "" });
    setLoading(false);
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Notification preferences saved");
    setLoading(false);
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Preferences saved successfully");
    setLoading(false);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "preferences", label: "Preferences", icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Settings</h1>
          <p className="text-black mt-1">Manage your account settings and preferences</p>
        </div>
        <Button variant="outline" className="border-black text-black">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Warning Banner for Default Credentials */}
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Default Credentials Active</p>
              <p className="text-sm text-yellow-800 mt-1">
                You are using default username and password. Please change your password immediately for security.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-neutral-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-0.5 ${
                activeTab === tab.id
                  ? "border-black text-black"
                  : "border-transparent text-neutral-600 hover:text-black"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black">Profile Information</CardTitle>
              <CardDescription className="text-black">Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-black flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name.charAt(0)}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-black text-black">
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <Button variant="ghost" className="text-black">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-black font-medium">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      className="pl-10 border-neutral-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="border-neutral-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="pl-10 border-neutral-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="pl-10 border-neutral-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="pl-10 border-neutral-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Bio</Label>
                  <Input
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="border-neutral-300"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveProfile} disabled={loading} className="bg-black hover:bg-neutral-800">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="ghost" className="text-black">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password */}
          <Card className="border-2 border-black">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-black">Update your password regularly for security</CardDescription>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Required
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-black font-medium">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={security.currentPassword}
                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                    className="pl-10 pr-10 border-neutral-300"
                  />
                  <button
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black font-medium">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                    className="pl-10 pr-10 border-neutral-300"
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black font-medium">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                    className="pl-10 border-neutral-300"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleChangePassword} disabled={loading} className="bg-black hover:bg-neutral-800">
                  <Save className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="border-2 border-black">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription className="text-black">Add an extra layer of security</CardDescription>
                </div>
                <Switch
                  checked={security.twoFactorEnabled}
                  onCheckedChange={(checked) => setSecurity({ ...security, twoFactorEnabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent>
              {security.twoFactorEnabled ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">2FA is enabled</span>
                </div>
              ) : (
                <p className="text-sm text-neutral-600">Enable 2FA to protect your account with an authenticator app</p>
              )}
            </CardContent>
          </Card>

          {/* Session Management */}
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black">Session Settings</CardTitle>
              <CardDescription className="text-black">Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Session Timeout</p>
                  <p className="text-xs text-neutral-600">Automatically log out after inactivity</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) })}
                    className="w-20 border-neutral-300"
                  />
                  <span className="text-sm text-black">minutes</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="border-black text-black">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  View Active Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-2 border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-red-800">Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-900">Delete Account</p>
                  <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-black">Choose how you want to be notified</CardDescription>
              </div>
              <Button onClick={handleSaveNotifications} disabled={loading} className="bg-black hover:bg-neutral-800">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Channels */}
            <div className="space-y-4">
              <h3 className="font-semibold text-black">Notification Channels</h3>
              
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-black">Email Notifications</p>
                    <p className="text-sm text-neutral-600">Receive updates via email</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-black">SMS Notifications</p>
                    <p className="text-sm text-neutral-600">Receive text messages</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.smsNotifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, smsNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-black">Push Notifications</p>
                    <p className="text-sm text-neutral-600">Browser notifications</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                />
              </div>
            </div>

            {/* Alert Types */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold text-black">Alert Types</h3>
              
              <div className="flex items-center justify-between p-3 rounded-lg">
                <div>
                  <p className="font-medium text-black">Event Alerts</p>
                  <p className="text-sm text-neutral-600">New event bookings and updates</p>
                </div>
                <Switch
                  checked={notifications.eventAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, eventAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg">
                <div>
                  <p className="font-medium text-black">Payment Alerts</p>
                  <p className="text-sm text-neutral-600">Payment confirmations and failures</p>
                </div>
                <Switch
                  checked={notifications.paymentAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, paymentAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg">
                <div>
                  <p className="font-medium text-black">Security Alerts</p>
                  <p className="text-sm text-neutral-600">Login attempts and password changes</p>
                </div>
                <Switch
                  checked={notifications.securityAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, securityAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg">
                <div>
                  <p className="font-medium text-black">Marketing Emails</p>
                  <p className="text-sm text-neutral-600">Promotional content and updates</p>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <Card className="border-2 border-black">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Preferences
                </CardTitle>
                <CardDescription className="text-black">Customize your experience</CardDescription>
              </div>
              <Button onClick={handleSavePreferences} disabled={loading} className="bg-black hover:bg-neutral-800">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Regional Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-black">Regional Settings</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-black font-medium">Language</Label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Timezone</Label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="America/New_York">New York (EST)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Currency</Label>
                  <select
                    value={preferences.currency}
                    onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Date Format</Label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold text-black">Display Settings</h3>
              
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center">
                    {preferences.darkMode ? <Moon className="h-5 w-5 text-black" /> : <Sun className="h-5 w-5 text-black" />}
                  </div>
                  <div>
                    <p className="font-medium text-black">Dark Mode</p>
                    <p className="text-sm text-neutral-600">Switch to dark theme</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, darkMode: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200">
                <div>
                  <p className="font-medium text-black">Compact Mode</p>
                  <p className="text-sm text-neutral-600">Show more content on screen</p>
                </div>
                <Switch
                  checked={preferences.compactMode}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, compactMode: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
