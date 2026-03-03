"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, Loader2, Shield, AlertCircle, CheckCircle } from "lucide-react";

import { toast } from "sonner";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    // Basic validation for admin email format
    if (!email.includes('@')) {
      toast.error("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      toast.success("Login successful! Redirecting...");
      // Login will auto-redirect based on role
      // If not admin, user will be redirected away in useEffect
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || "Login failed";
      
      // Show specific help based on error message
      if (errorMessage.includes("Google or Facebook")) {
        toast.error("This account uses social login. Please use the regular login page.");
      } else if (errorMessage.includes("connect to server")) {
        toast.error("Cannot connect to server. Please ensure the backend is running.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="border-2 border-red-200 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-red-100 items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-black">
              Admin Access
            </CardTitle>
            <CardDescription className="text-neutral-600">
              Authorized personnel only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                  Admin Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <Input
                    id="email"
                    placeholder="admin@NearZro.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-neutral-200 focus:border-red-600 focus:ring-red-600"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="pl-10 pr-10 h-12 border-neutral-200 focus:border-red-600 focus:ring-red-600"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold">Restricted Access</p>
                    <p className="text-red-700">This portal is for authorized NearZro administrators only.</p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access Admin Panel"
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Security Notice</p>
                  <p className="text-amber-700">
                    All admin activities are monitored and logged. Unauthorized access attempts will be recorded and may result in legal action.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Default Admin Credentials</p>
                  <p className="text-green-700">
                    Email: <code className="bg-green-100 px-2 py-0.5 rounded">admin@NearZro.com</code>
                  </p>
                  <p className="text-green-700">
                    Password: <code className="bg-green-100 px-2 py-0.5 rounded">admin123</code>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 text-center border-t pt-6">
            <div className="text-xs text-neutral-500">
              Protected by NearZro Security System
            </div>
            <div className="text-xs text-neutral-400">
              IP Address and device information are logged for security purposes
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
