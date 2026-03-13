"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      toast.error("Invalid reset link", {
        description: "Please request a new password reset link.",
      });
    }
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain uppercase, lowercase, number, and special character";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      toast.success("Password reset successful!", {
        description: "You can now login with your new password.",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      const errorMessage = error?.response?.data?.message || "Failed to reset password. The link may have expired.";
      
      if (errorMessage.includes("expired")) {
        setIsValidToken(false);
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 bg-gradient-to-br from-red-50 via-white to-red-100">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-red-100 items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-black">
                Invalid or Expired Link
              </CardTitle>
              <CardDescription className="text-neutral-600">
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-neutral-700 mb-6">
                Please request a new password reset link.
              </p>
              <Link href="/forgot-password">
                <Button variant="premium" className="w-full h-12">
                  Request New Reset Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 bg-gradient-to-br from-silver-50 via-white to-silver-100">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-blue-50 items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-black">
              Reset Password
            </CardTitle>
            <CardDescription className="text-neutral-600">
              Create a new strong password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-neutral-700">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Min. 8 characters"
                    className={`pl-10 pr-10 h-12 border-neutral-200 focus:border-blue-600 focus:ring-blue-600 ${errors.newPassword ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
                {formData.newPassword.length > 0 && !errors.newPassword && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Password meets requirements</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className={`pl-10 pr-10 h-12 border-neutral-200 focus:border-blue-600 focus:ring-blue-600 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold mb-1">Password Requirements:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase letter (A-Z)</li>
                  <li>• Contains lowercase letter (a-z)</li>
                  <li>• Contains number (0-9)</li>
                  <li>• Contains special character (@$!%*?&)</li>
                </ul>
              </div>

              <Button
                type="submit"
                variant="premium"
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 text-center border-t pt-6">
            <p className="text-sm text-neutral-600">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
