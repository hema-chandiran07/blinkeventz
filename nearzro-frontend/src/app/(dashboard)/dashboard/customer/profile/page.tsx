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

    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        const response = await api.get("/auth/me", { signal: controller.signal });
        const data = response.data;
        setFormData({
          name: data.name || user?.name || "",
          email: data.email || user?.email || "",
          phone: data.phone || "",
          city: data.city || "",
        });
      } catch (error: any) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
        // Fallback to auth context data
        if (user) {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            phone: "",
            city: "",
          });
        }
      }
    };

    loadProfile();
    return () => controller.abort();
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update user profile using PATCH /users/me
      await api.patch("/users/me", {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
      });
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
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Profile Settings</h1>
          <p className="text-zinc-400">Manage your personal information and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 text-3xl font-bold mb-4">
                    {(user?.name || "U").charAt(0)}
                  </div>
                  <h3 className="font-semibold text-zinc-100 text-lg">{user?.name || "Unknown User"}</h3>
                  <p className="text-sm text-zinc-400">{user?.email || "No email"}</p>
                  <div className="mt-4 px-3 py-1 rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                    {(user?.role || "CUSTOMER").replace("_", " ")}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Button variant="ghost" className="w-full justify-start gap-2 text-zinc-300 hover:text-zinc-100" onClick={() => router.push("/dashboard/customer")}>
                    <Calendar className="h-4 w-4" />
                    My Events
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-zinc-300 hover:text-zinc-100" onClick={() => router.push("/dashboard/customer/bookings")}>
                    <User className="h-4 w-4" />
                    My Bookings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-zinc-300 hover:text-zinc-100" onClick={() => router.push("/dashboard/customer/notifications")}>
                    <Mail className="h-4 w-4" />
                    Notifications
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={handleLogout}>
                    <User className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-zinc-400" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-zinc-400">Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-zinc-300">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-zinc-300">City</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="city"
                        placeholder="e.g., Chennai"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
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

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-100">Account Security</CardTitle>
                <CardDescription className="text-zinc-400">Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div>
                    <p className="font-medium text-zinc-100">Email Notifications</p>
                    <p className="text-sm text-zinc-400">Receive updates about your events and bookings</p>
                  </div>
                  <Button variant="silver" size="sm" onClick={handleNotificationSettings}>
                    Manage
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div>
                    <p className="font-medium text-zinc-100">Two-Factor Authentication</p>
                    <p className="text-sm text-zinc-400">Add an extra layer of security to your account</p>
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
