"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Loader2, CheckCircle2, ArrowLeft, Phone, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import OtpVerification from "@/components/ui/otp-verification";
import { PasswordStrength } from "@/components/ui/password-strength";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredCity: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoogleLogin = () => {
    toast.info("Redirecting to Google...");
    googleLogin();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit Indian mobile number";
    }

    if (!formData.preferredCity.trim()) {
      newErrors.preferredCity = "Preferred city is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase, number, and special character";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Register user (creates account, requires OTP verification)
      await api.post("/auth/register", { 
        name: formData.name, 
        email: formData.email,
        phone: formData.phone,
        preferredCity: formData.preferredCity,
        password: formData.password 
      });

      // Step 2: Send OTP to email
      await api.post("/otp/send", { email: formData.email });

      // Move to OTP verification step
      setStep('otp');

      toast.success("Successfully registered!", {
        description: "Check your email for the 6-digit OTP.",
      });

      // Log OTP to console for testing (remove in production)
      console.log('📧 Check backend logs for OTP code');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Registration failed";
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    try {
      toast.success("Email verified! Logging you in...", {
        description: "Redirecting to home page...",
      });

      // Login with the credentials
      await login(formData.email, formData.password);
      
      // Redirect to home page with timeout
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: any) {
      toast.error("Verification successful, but login failed. Please login manually.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {step === 'register' && (
          <Link href="/register" className="inline-flex items-center gap-2 text-sm text-zinc-200 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to role selection
          </Link>
        )}

        {step === 'register' ? (
          <Card className="border-0 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-zinc-900 border border-white/10 items-center justify-center mx-auto mb-4">
                <UserIcon className="h-8 w-8 text-zinc-200" />
              </div>
              <CardTitle className="text-3xl font-bold text-zinc-50">
                Create Customer Account
              </CardTitle>
              <CardDescription className="text-zinc-200">
                Start planning your dream events today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-zinc-200">
                    Full Name
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`pl-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.name ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-200">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`pl-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-zinc-200">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="phone"
                      placeholder="9876543210"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`pl-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.phone ? 'border-red-500' : ''}`}
                      maxLength={10}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredCity" className="text-sm font-medium text-zinc-200">
                    Preferred City
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <select
                      id="preferredCity"
                      value={formData.preferredCity}
                      onChange={(e) => setFormData({ ...formData, preferredCity: e.target.value })}
                      className={`pl-10 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.preferredCity ? 'border-red-500' : ''}`}
                    >
                      <option value="" className="bg-zinc-900">Select your city</option>
                      <option value="Chennai" className="bg-zinc-900">Chennai</option>
                      <option value="Coimbatore" className="bg-zinc-900">Coimbatore</option>
                      <option value="Madurai" className="bg-zinc-900">Madurai</option>
                      <option value="Trichy" className="bg-zinc-900">Trichy</option>
                      <option value="Salem" className="bg-zinc-900">Salem</option>
                    </select>
                  </div>
                  {errors.preferredCity && <p className="text-xs text-red-400">{errors.preferredCity}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-200">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 8 characters"
                      className={`pl-10 pr-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                  {/* Password Strength Indicator */}
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-200">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className={`pl-10 pr-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
                </div>

                {errors.submit && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{errors.submit}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-200 font-semibold backdrop-blur-md transition-all duration-300 ease-out hover:text-white hover:bg-white/10 hover:border-white/40 active:scale-95 active:translate-y-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-950/60 px-3 text-zinc-400">Or continue with</span>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-200 font-semibold backdrop-blur-md transition-all duration-300 ease-out hover:text-white hover:bg-white/10 hover:border-white/40 active:scale-95 active:translate-y-0 relative group overflow-hidden"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {/* Multi-colored aura on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#4285F4,#34A853,#FBBC05,#EA4335,#4285F4)] opacity-20 blur-xl" />
                  </div>
                  {/* Multi-colored Google G logo */}
                  <svg className="mr-2 h-5 w-5 relative z-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="relative z-10">Google</span>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 text-center border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 text-xs text-zinc-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Free to get started</span>
              </div>
              <div className="text-xs text-zinc-200">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>
              </div>
            </CardFooter>
          </Card>
        ) : (
          // OTP Verification Step
          <OtpVerification
            email={formData.email}
            phone={undefined}
            onVerified={handleOtpVerified}
            onBack={() => setStep('register')}
          />
        )}
      </div>
    </div>
  );
}
