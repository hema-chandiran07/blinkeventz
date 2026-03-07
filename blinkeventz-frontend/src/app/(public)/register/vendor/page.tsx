"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, User, Store, Phone, MapPin, CheckCircle2, ArrowLeft, AlertCircle, Chrome } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { PasswordStrength } from "@/components/ui/password-strength";

export default function VendorRegisterPage() {
  const router = useRouter();
  const { login, googleLogin, facebookLogin } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null); // For development only
  
  const [formData, setFormData] = useState({
    // Account Details
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Business Details
    businessName: "",
    businessType: "",
    description: "",
    city: "",
    area: "",
    // Contact Details
    phone: "",
    serviceRadiusKm: 50,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoogleLogin = () => {
    toast.info("Redirecting to Google...");
    googleLogin();
  };

  const handleFacebookLogin = () => {
    toast.info("Facebook login coming soon!", {
      description: "This feature is currently under development."
    });
  };

  const validateStep1 = () => {
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

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }

    if (!formData.businessType) {
      newErrors.businessType = "Please select a business type";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Business description is required";
    } else if (formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.area.trim()) {
      newErrors.area = "Area is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit Indian mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);

    try {
      // Create vendor account with ALL business details
      const response = await api.post("/auth/register-vendor", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        businessType: formData.businessType,
        description: formData.description,
        city: formData.city,
        area: formData.area,
        phone: formData.phone,
        serviceRadiusKm: formData.serviceRadiusKm,
      });

      const user = response.data.user;
      setUserId(user.id);

      // Send OTP for email verification
      await api.post("/otp/send", { email: formData.email });

      // DEV ONLY: Fetch OTP for development/testing
      if (process.env.NODE_ENV === 'development') {
        try {
          const debugRes = await api.get(`/otp/debug?email=${formData.email}`);
          if (debugRes.data.otp) {
            setDevOtp(debugRes.data.otp);
          }
        } catch (e) {
          console.log('Dev OTP fetch failed (expected in production)');
        }
      }

      toast.success("Account created successfully!", {
        description: "Check your email for the 6-digit OTP code.",
      });

      setStep(4);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP
      await api.post("/otp/verify", {
        email: formData.email,
        otp: otp,
      });

      // Auto-login after verification
      const loginResponse = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      // Store auth data
      localStorage.setItem("NearZro_user", JSON.stringify(loginResponse.data));

      toast.success("Email verified successfully!", {
        description: "Welcome to NearZro! Redirecting to your dashboard...",
      });

      // Redirect to vendor dashboard
      setTimeout(() => {
        router.push("/dashboard/vendor");
      }, 1000);
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error?.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await api.post("/otp/send", { email: formData.email });
      toast.success("OTP resent successfully", {
        description: "Check your email for the new code.",
      });
    } catch (error: any) {
      toast.error("Failed to resend OTP");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-silver-50 via-white to-silver-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    step >= stepNumber
                      ? "bg-black text-white"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {step > stepNumber ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-16 sm:w-24 h-1 mx-2 ${
                      step > stepNumber ? "bg-black" : "bg-neutral-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-neutral-600">
            <span>Account</span>
            <span>Business</span>
            <span>Contact</span>
            <span>Verify</span>
          </div>
        </div>

        <Card className="border-2 border-black shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-black to-neutral-800 mx-auto mb-4 shadow-lg shadow-black/20 flex items-center justify-center">
              <Store className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-black">
              {step === 1 && "Create Your Vendor Account"}
              {step === 2 && "Business Details"}
              {step === 3 && "Contact Information"}
              {step === 4 && "Verify Email"}
            </CardTitle>
            <CardDescription className="text-neutral-600">
              {step === 1 && "Enter your personal details to get started"}
              {step === 2 && "Tell us about your business"}
              {step === 3 && "How can we reach you?"}
              {step === 4 && "Enter the OTP sent to your email"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Account Details */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-black">
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={`pl-10 h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                        errors.name ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-black">
                    Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={`pl-10 h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                        errors.email ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-black">
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`pl-10 pr-10 h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                        errors.password ? "border-red-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-black">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder="Re-enter password"
                      className={`pl-10 pr-10 h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                        errors.confirmPassword ? "border-red-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>

                {/* OAuth Buttons */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-neutral-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-neutral-300"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-neutral-300"
                    onClick={handleFacebookLogin}
                    disabled={isLoading}
                  >
                    Facebook
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="default"
                  className="w-full h-12 text-base font-semibold bg-black hover:bg-neutral-800"
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Continue to Business Details"}
                </Button>
              </div>
            )}

            {/* Step 2: Business Details */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-sm font-medium text-black">
                    Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Elite Photography Services"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    className={`h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                      errors.businessName ? "border-red-500" : ""
                    }`}
                  />
                  {errors.businessName && <p className="text-xs text-red-500">{errors.businessName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType" className="text-sm font-medium text-black">
                    Business Type *
                  </Label>
                  <select
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => handleInputChange("businessType", e.target.value)}
                    className={`flex h-12 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-black focus:ring-black ${
                      errors.businessType ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Select business type</option>
                    <option value="PHOTOGRAPHY">Photography</option>
                    <option value="CATERING">Catering</option>
                    <option value="DECOR">Decoration</option>
                    <option value="DJ">DJ & Music</option>
                    <option value="MAKEUP">Makeup Artist</option>
                    <option value="VIDEOGRAPHY">Videography</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.businessType && <p className="text-xs text-red-500">{errors.businessType}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-black">
                    Business Description *
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your services, experience, and what makes you unique... (min. 20 characters)"
                    rows={4}
                    className={`flex min-h-[120px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-black focus:ring-black ${
                      errors.description ? "border-red-500" : ""
                    }`}
                  />
                  {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-black">
                      City *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                      <Input
                        id="city"
                        placeholder="Chennai"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        className={`pl-10 h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                          errors.city ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area" className="text-sm font-medium text-black">
                      Area *
                    </Label>
                    <Input
                      id="area"
                      placeholder="T Nagar"
                      value={formData.area}
                      onChange={(e) => handleInputChange("area", e.target.value)}
                      className={`h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                        errors.area ? "border-red-500" : ""
                      }`}
                    />
                    {errors.area && <p className="text-xs text-red-500">{errors.area}</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 border-black"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-12 text-base font-semibold bg-black hover:bg-neutral-800"
                    onClick={handleNextStep}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Continue to Contact"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-black">
                    Phone Number *
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="phone"
                      placeholder="9876543210"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className={`pl-10 h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black ${
                        errors.phone ? "border-red-500" : ""
                      }`}
                      maxLength={10}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceRadiusKm" className="text-sm font-medium text-black">
                    Service Radius (km)
                  </Label>
                  <Input
                    id="serviceRadiusKm"
                    type="number"
                    value={formData.serviceRadiusKm}
                    onChange={(e) => handleInputChange("serviceRadiusKm", e.target.value)}
                    className="h-12 border-neutral-300 bg-white text-black focus:border-black focus:ring-black"
                  />
                  <p className="text-xs text-neutral-600">How far are you willing to travel for events?</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Email Verification Required</p>
                      <p className="text-sm text-blue-700 mt-1">
                        After submitting, you'll receive a 6-digit OTP on your email ({formData.email}) for verification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 border-black"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-12 text-base font-semibold bg-black hover:bg-neutral-800"
                    onClick={handleRegister}
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account & Verify"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: OTP Verification */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Check Your Email</p>
                      <p className="text-sm text-blue-700 mt-1">
                        We've sent a 6-digit verification code to <strong>{formData.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* DEV ONLY: Show OTP in development mode */}
                {devOtp && process.env.NODE_ENV === 'development' && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">Development Mode - OTP Display</p>
                        <p className="text-sm text-amber-700 mt-1 mb-2">
                          Email sending is disabled in development. Use this OTP:
                        </p>
                        <div className="bg-white border border-amber-300 rounded-md py-3 px-4 text-center">
                          <span className="text-3xl font-bold tracking-widest text-amber-600">{devOtp}</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-2">
                          Click the OTP to copy • This will not work in production
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-black">
                    Enter OTP *
                  </Label>
                  <Input
                    id="otp"
                    placeholder="000000"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 border-neutral-300 bg-white text-black text-center text-2xl tracking-widest focus:border-black focus:ring-black"
                    maxLength={6}
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm text-neutral-600">Didn't receive the code?</p>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm font-semibold text-black underline"
                    onClick={handleResendOTP}
                  >
                    Resend OTP
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="default"
                  className="w-full h-12 text-base font-semibold bg-black hover:bg-neutral-800"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify & Continue to Dashboard"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-12 text-neutral-600"
                  onClick={() => router.push("/login")}
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-neutral-600">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-black underline hover:text-neutral-800">
              Sign in
            </Link>
          </p>
          <p className="mt-2">
            By registering, you agree to our{" "}
            <Link href="/terms" className="font-semibold text-black underline hover:text-neutral-800">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-black underline hover:text-neutral-800">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
