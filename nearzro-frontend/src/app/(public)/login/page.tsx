"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, googleLogin } = useAuth();

  const setError = (field: string, error: { message: string }) => {
    setErrors((prev) => ({ ...prev, [field]: error.message }));
  };

  const validateEmail = (value: string) => {
    if (!value) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("email", { message: "Please enter a valid email address." });
    } else {
      setErrors((prev) => { const newErrors = { ...prev }; delete newErrors.email; return newErrors; });
    }
  };

  const validatePassword = (value: string) => {
    if (!value) return;
    if (value.length < 8) {
      setError("password", { message: "Password must be at least 8 characters." });
    } else {
      setErrors((prev) => { const newErrors = { ...prev }; delete newErrors.password; return newErrors; });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      toast.success("Welcome back!");
    } catch (error: any) {
      setPassword(""); // Clear password field on failed login
      const data = error.response?.data;

      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          setError(err.field, { message: err.message });
        });
        return;
      }

      let message = data?.message || data?.error?.message || error.message || "Something went wrong. Please try again.";

      if (message.includes("Invalid email") || message.includes("password")) {
        message = "Invalid email or password. Please try again.";
      } else if (message.includes("inactive")) {
        message = "Your account is inactive. Please contact support.";
      } else if (message.includes("locked")) {
        message = "Your account has been locked. Please contact support.";
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Redirecting to Google...");
    googleLogin();
  };



  // Listen for auth notice events (for unconfigured OAuth providers)
  useEffect(() => {
    const handleAuthNotice = (event: CustomEvent) => {
      const { message, type } = event.detail;
      if (type === 'info') {
        toast.info(message);
      }
    };

    window.addEventListener('auth-notice' as any, handleAuthNotice as any);
    return () => window.removeEventListener('auth-notice' as any, handleAuthNotice as any);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950">
      <motion.div
        className="w-full max-w-6xl grid md:grid-cols-2 gap-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Side - Branding */}
        <motion.div
          className="hidden md:flex flex-col justify-center items-center bg-transparent text-white p-12 rounded-l-2xl relative overflow-hidden"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-silver-400/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen" />
            <div className="absolute -bottom-32 -left-20 w-[30rem] h-[30rem] bg-white/5 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
          </div>

          {/* NearZro Logo - Centered Above Text */}
          <motion.div
            className="relative mb-8 flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative h-32 w-32 overflow-hidden rounded-2xl border-2 border-silver-300 mb-6">
              <Image
                src="/logo.jpeg"
                alt="NearZro Logo"
                fill
                className="object-cover brightness-110 contrast-110"
              />
            </div>
            
            <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-silver-200 to-white bg-clip-text text-transparent text-center">
              Welcome to NearZro
            </h2>
          </motion.div>

          <motion.p
            className="text-center text-silver-300 mb-8 max-w-xs"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            Your trusted event management platform
          </motion.p>

          <div className="text-center space-y-6 relative z-10">
            <motion.div
              className="flex items-center justify-center gap-3 text-silver-300 text-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <span>✨ Premium Event Planning</span>
              <span>•</span>
              <span>🎯 Trusted by 1000+</span>
            </motion.div>
            
            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="h-8 w-8 rounded-full bg-silver-800/50 flex items-center justify-center border border-silver-700">
                  <Mail className="h-4 w-4 text-silver-300" />
                </div>
                <span className="text-silver-300 text-sm">support@NearZro.com</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="h-8 w-8 rounded-full bg-silver-800/50 flex items-center justify-center border border-silver-700">
                  <Lock className="h-4 w-4 text-silver-300" />
                </div>
                <span className="text-silver-300 text-sm">Secure & Encrypted</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          className="flex items-center justify-center p-8"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="md:hidden">
                <motion.div
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-black to-silver-800 mx-auto mb-4 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-white">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Sign in to your NearZro account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-white">
                    Email or Username
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="email"
                      placeholder="name@example.com or username"
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => { const newErrors = { ...prev }; delete newErrors.email; return newErrors; });
                      }}
                      onBlur={(e) => validateEmail(e.target.value)}
                      className={`pl-10 h-12 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.email ? 'border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                  <p className="text-xs text-zinc-500">You can use either your email address or username to login</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-white">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((prev) => { const newErrors = { ...prev }; delete newErrors.password; return newErrors; });
                      }}
                      onBlur={(e) => validatePassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`pl-10 pr-10 h-12 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  </div>

                <Button
                  type="submit"
                  variant="premium"
                  className="w-full h-12 text-base font-semibold bg-white text-black hover:scale-[1.02] transition-transform duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900/50 px-3 text-zinc-500">Or continue with</span>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 h-12 bg-transparent border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all rounded-lg"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
              </div>

            </CardContent>
            <CardFooter className="flex flex-col space-y-3 text-center border-t border-zinc-800 pt-6">
              <div className="text-sm text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-white hover:text-zinc-300 hover:underline transition-all">
                  Create Account
                </Link>
              </div>
              


              <div className="text-xs text-zinc-500">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
