"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin, Calendar, Settings, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    // Load user data
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: "",
        city: "",
      });
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update user profile
      await api.put("/users/profile", formData);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
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

  const handleNotificationSettings = () => {
    router.push('/dashboard/settings');
  };

  const handle2FA = () => {
    toast.info("Two-factor authentication will be available soon", {
      description: "We're working on adding this security feature"
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Profile Settings</h1>
          <p className="text-neutral-600">Manage your personal information and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card className="border-silver-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-white text-3xl font-bold mb-4">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <h3 className="font-semibold text-black text-lg">{user?.name}</h3>
                  <p className="text-sm text-neutral-600">{user?.email}</p>
                  <div className="mt-4 px-3 py-1 rounded-full bg-neutral-100 text-xs font-medium">
                    {user?.role?.replace("_", " ")}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => router.push("/dashboard/customer")}>
                    <Calendar className="h-4 w-4" />
                    My Events
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => router.push("/dashboard/customer/bookings")}>
                    <User className="h-4 w-4" />
                    My Bookings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => router.push("/dashboard/customer/notifications")}>
                    <Mail className="h-4 w-4" />
                    Notifications
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-red-600 hover:text-red-700" onClick={handleLogout}>
                    <User className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-silver-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-neutral-800" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        id="city"
                        placeholder="e.g., Chennai"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" variant="premium" className="flex-1 h-12" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="silver" className="flex-1 h-12" onClick={handleChangePassword}>
                      Change Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-silver-200 bg-gradient-to-br from-neutral-50 to-white">
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200">
                  <div>
                    <p className="font-medium text-black">Email Notifications</p>
                    <p className="text-sm text-neutral-600">Receive updates about your events and bookings</p>
                  </div>
                  <Button variant="silver" size="sm" onClick={handleNotificationSettings}>
                    Manage
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200">
                  <div>
                    <p className="font-medium text-black">Two-Factor Authentication</p>
                    <p className="text-sm text-neutral-600">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="silver" size="sm" onClick={handle2FA}>
                    Enable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
