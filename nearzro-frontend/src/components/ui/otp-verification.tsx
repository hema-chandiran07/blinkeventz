"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Shield, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

interface OtpVerificationProps {
  email: string;
  phone?: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OtpVerification({ email, phone, onVerified, onBack }: OtpVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState(30);

  // Countdown for resend OTP
  useState(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!otp.trim()) {
      newErrors.otp = "OTP is required";
    } else if (!/^\d{6}$/.test(otp)) {
      newErrors.otp = "OTP must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/otp/verify", { email, otp });
      toast.success("Email verified successfully!", {
        description: "Your account is now active.",
      });
      onVerified();
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error?.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setIsResending(true);

    try {
      await api.post("/otp/send", { email, phone });
      toast.success("OTP resent successfully!", {
        description: "Check your email for the new OTP.",
      });
      setCountdown(30); // Reset countdown
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast.error(error?.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="border-0 shadow-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 rounded-2xl p-8">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-zinc-800/50 items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-zinc-300" />
          </div>
          <CardTitle className="text-3xl font-bold text-zinc-50">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter the 6-digit OTP sent to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium text-zinc-300">
                One-Time Password (OTP)
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  className={`pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white text-center text-2xl tracking-widest focus:border-zinc-600 focus:ring-zinc-600 placeholder-zinc-500 ${errors.otp ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.otp && <p className="text-xs text-red-400">{errors.otp}</p>}
            </div>

            <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-zinc-300">
                  <p className="font-semibold mb-1">Didn't receive the OTP?</p>
                  <ul className="text-zinc-400 space-y-1">
                    <li>• Check your email inbox</li>
                    <li>• Check your spam/junk folder</li>
                  </ul>
                </div>
              </div>
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
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Verify Email
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isResending}
                className="text-sm"
              >
                {countdown > 0
                  ? `Resend OTP in ${countdown}s`
                  : isResending
                  ? "Resending..."
                  : "Resend OTP"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
