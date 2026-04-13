"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, KeyRound, Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOtp = () => {
    const newErrors: Record<string, string> = {};
    if (!otp.trim()) {
      newErrors.otp = "OTP is required";
    } else if (!/^\d{6}$/.test(otp)) {
      newErrors.otp = "Please enter a valid 6-digit OTP";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
      newErrors.newPassword = "Password must contain uppercase, lowercase, number, and special character";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    // Prevent default FIRST - stop any duplicate form submissions
    e.preventDefault();
    
    // EARLY RETURN if already loading - double-submit prevention
    if (isLoading) return;
    
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setStep('otp');
      toast.success("OTP sent!", {
        description: `Check your email for the 6-digit OTP.`,
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      const data = error.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          setErrors(prev => ({ ...prev, [err.field]: err.message }));
        });
        return;
      }
      const message =
        data?.message ||
        data?.error?.message ||
        error.message ||
        "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    // Prevent default FIRST - stop any duplicate form submissions
    e.preventDefault();
    
    // EARLY RETURN if already loading - double-submit prevention
    if (isLoading) return;
    
    if (!validateOtp()) return;

    setIsLoading(true);
    try {
      const response = await api.post("/auth/verify-reset-otp", { email, otp });
      if (response.data.valid) {
        setStep('reset');
        toast.success("OTP verified!", {
          description: "Now set your new password.",
        });
      } else {
        throw new Error(response.data.message || "Invalid OTP.");
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      const data = error.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          setErrors(prev => ({ ...prev, [err.field]: err.message }));
        });
        return;
      }
      const message =
        data?.message ||
        data?.error?.message ||
        error.message ||
        "Invalid OTP. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    // Prevent default FIRST - stop any duplicate form submissions
    e.preventDefault();
    
    // EARLY RETURN if already loading - double-submit prevention
    if (isLoading) return;
    
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword, confirmPassword });
      toast.success("Password reset successful!", {
        description: "You can now login with your new password.",
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Reset password error:", error);
      setNewPassword("");
      setConfirmPassword("");
      const data = error.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          setErrors(prev => ({ ...prev, [err.field]: err.message }));
        });
        return;
      }
      const message =
        data?.message ||
        data?.error?.message ||
        error.message ||
        "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const steps = [
    { id: 'email', label: 'Email' },
    { id: 'otp', label: 'Verify OTP' },
    { id: 'reset', label: 'New Password' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 bg-zinc-950">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        {/* Main Card - Premium Dark Theme */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    step === s.id
                      ? "bg-white text-black"
                      : steps.findIndex(st => st.id === step) > index
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {steps.findIndex(st => st.id === step) > index ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${steps.findIndex(st => st.id === step) > index ? "bg-green-600" : "bg-zinc-800"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              {step === 'email' && "Forgot Password"}
              {step === 'otp' && "Verify OTP"}
              {step === 'reset' && "Set New Password"}
            </h1>
            <p className="text-zinc-400 text-sm mt-2">
              {step === 'email' && "Enter your email to receive a reset OTP"}
              {step === 'otp' && "Enter the 6-digit code sent to your email"}
              {step === 'reset' && "Create a strong new password"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: Email Input */}
            {step === 'email' && (
              <motion.form
                key="email-form"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                onSubmit={handleEmailSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-400">
                      Enter your email address and we&apos;ll send you a 6-digit OTP to reset your password.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-neutral-200 border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </motion.form>
            )}

            {/* STEP 2: OTP Input */}
            {step === 'otp' && (
              <motion.form
                key="otp-form"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                onSubmit={handleOtpSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-zinc-300">
                    6-Digit OTP
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className={`pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 text-center text-2xl tracking-widest ${errors.otp ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.otp && <p className="text-xs text-red-500">{errors.otp}</p>}
                  <p className="text-xs text-zinc-500">OTP sent to <span className="text-white">{email}</span></p>
                </div>

                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-400">
                      Enter the 6-digit OTP sent to your email. Valid for 15 minutes.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-neutral-200 border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                  className="w-full text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Resend OTP
                </button>
              </motion.form>
            )}

            {/* STEP 3: New Password */}
            {step === 'reset' && (
              <motion.form
                key="reset-form"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-zinc-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`pl-10 pr-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 ${errors.newPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>

                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-400">
                    Password must contain: uppercase, lowercase, number, and special character (@$!%*?&)
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-neutral-200 border-0"
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
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-sm text-zinc-500">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-white hover:text-zinc-300">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}