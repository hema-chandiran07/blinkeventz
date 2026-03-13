"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setIsSubmitted(true);
      toast.success("Password reset link sent!", {
        description: "Check your email for the reset link.",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error(error?.response?.data?.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 bg-transparent">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <Card className="border-0 shadow-2xl bg-transparent backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-blue-50 items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-black">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-neutral-600">
              No worries! We'll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 h-12 border-neutral-200 focus:border-blue-600 focus:ring-blue-600 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            ) : (
              <motion.div
                className="text-center py-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="inline-flex h-20 w-20 rounded-full bg-green-100 items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">Check Your Email</h3>
                <p className="text-neutral-600 mb-6">
                  We've sent a password reset link to <strong className="text-black">{email}</strong>
                </p>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800 text-left">
                      <p className="font-semibold mb-1">Didn't receive the email?</p>
                      <ul className="text-yellow-700 space-y-1">
                        <li>• Check your spam folder</li>
                        <li>• Make sure you entered the correct email</li>
                        <li>• For demo: Check the backend console logs</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => router.push("/login")}
                >
                  Back to Login
                </Button>
              </motion.div>
            )}
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
