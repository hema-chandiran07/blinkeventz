"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, googleLogin, facebookLogin } = useAuth();

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
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || "Login failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Redirecting to Google...");
    googleLogin();
  };

  const handleFacebookLogin = () => {
    facebookLogin();
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <motion.div
        className="w-full max-w-6xl grid md:grid-cols-2 gap-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Side - Branding */}
        <motion.div
          className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-black via-silver-950 to-black text-white p-12 rounded-l-2xl relative overflow-hidden"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-silver-700/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-silver-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="text-center space-y-6 relative z-10">
            <motion.div
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-silver-400 to-silver-600 mx-auto shadow-2xl shadow-silver-500/30 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Sparkles className="h-10 w-10 text-black" />
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-silver-200 to-silver-400 bg-clip-text text-transparent">
              BlinkEventz
            </h1>
            <p className="text-silver-300 text-lg max-w-sm">
              India&apos;s Premium Event Management Platform. Connect with top venues, vendors, and event planners.
            </p>
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-silver-800/50 flex items-center justify-center border border-silver-700">
                  <Mail className="h-5 w-5 text-silver-300" />
                </div>
                <span className="text-silver-300">support@blinkeventz.com</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-silver-800/50 flex items-center justify-center border border-silver-700">
                  <Lock className="h-5 w-5 text-silver-300" />
                </div>
                <span className="text-silver-300">Secure & Encrypted</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          className="flex items-center justify-center p-8 bg-white"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="w-full max-w-md border-0 shadow-2xl shadow-black/10 bg-white">
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="md:hidden">
                <motion.div
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-black to-silver-800 mx-auto mb-4 shadow-lg shadow-black/20 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-black">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-neutral-600">
                Sign in to your BlinkEventz account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus:border-black focus:ring-black"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-12 border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus:border-black focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="premium"
                  className="w-full h-12 text-base font-medium shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
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
                  <span className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-neutral-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="silver"
                  className="w-full h-12 border-neutral-300 hover:bg-neutral-50 transition-colors"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button variant="silver" className="w-full h-12 border-silver-700 hover:bg-silver-800/50 transition-colors" type="button" onClick={handleFacebookLogin} disabled={isLoading}>
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>
              </div>

              <motion.div 
                className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-800/50"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-semibold mb-1">Demo Credentials</p>
                    <p className="text-blue-400">Use any email and password to test the login flow.</p>
                  </div>
                </div>
              </motion.div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 text-center border-t border-silver-800 pt-6">
              <div className="text-sm text-silver-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-white hover:underline transition-all">
                  Create Account
                </Link>
              </div>
              <div className="text-xs text-silver-500">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-silver-300">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-silver-300">Privacy Policy</Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
