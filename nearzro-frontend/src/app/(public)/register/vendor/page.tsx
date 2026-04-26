"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, User, Store, Phone, MapPin, CheckCircle2, AlertCircle, Chrome, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { PasswordStrength } from "@/components/ui/password-strength";
import { compressImage } from "@/lib/image-utils";

const sanitizeErrorMessage = (
  message: string,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
): boolean => {
  // Last safety net — if somehow a Prisma error leaks through
  const isPrismaError =
    message.toLowerCase().includes('prisma') ||
    message.toLowerCase().includes('unique constraint') ||
    message.toLowerCase().includes('invocation') ||
    message.toLowerCase().includes('p2002') ||
    message.toLowerCase().includes('failed on the fields');

  if (!isPrismaError) return false;

  // Map to friendly message based on field mentioned
  if (message.toLowerCase().includes('phone')) {
    setErrors((prev: any) => ({
      ...prev,
      phone: "This mobile number is already registered. Please use a different number."
    }));
  } else if (message.toLowerCase().includes('email')) {
    setErrors((prev: any) => ({
      ...prev,
      email: "This email is already registered. Please use a different email."
    }));
  } else if (message.toLowerCase().includes('username')) {
    setErrors((prev: any) => ({
      ...prev,
      username: "This username is already taken. Please choose a different username."
    }));
  } else {
    toast.error("An account with these details already exists. Please try with different information.");
  }

  return true;
};

const chennaiAreas = [
  "Adyar", "Alwarpet", "Ambattur", "Ambattur OT", "Anna Nagar", "Annanur",
  "Athipattu", "Avadi", "Besant Nagar", "Chengalpattu", "Chromepet", "ECR",
  "Ennore", "Guduvanchery", "Gummidipoondi", "Iyyapanthangal", "Karapakkam",
  "Kelambakkam", "Kilpauk", "Kolathur", "Kotturpuram", "Koyambedu", "Madipakkam",
  "Manali", "Manivakkam", "Maraimalai Nagar", "Medavakkam", "Minjur", "Mogappair",
  "Mylapore", "Navalur", "Nettukupam", "Nungambakkam", "Oragadam", "Pallavaram",
  "Pallikaranai", "Perambur", "Perungalathur", "Perungudi", "Poonamallee", "Porur",
  "RA Puram", "Red Hills", "Semmancheri", "Sholinganallur", "Sriperumbudur",
  "T. Nagar", "Tambaram", "Thirumazhisai", "Thirumullaivoyal", "Thiruvanmiyur",
  "Thoraipakkam", "Tiruvallur", "Urapakkam", "Vanagaram", "Vandalur", "Velachery",
  "Villivakkam"
];

export default function VendorRegisterPage() {
  const router = useRouter();
  const { login, googleLogin, facebookLogin, user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null); // For development only

  const [isCompressing, setIsCompressing] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
    // Business Images
    businessImages: [] as File[],
    // KYC Details
    kycDocType: "AADHAAR",
    kycDocNumber: "",
    kycDocFiles: [] as File[], // Changed from single file to array
    foodLicenseFiles: [] as File[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<{
    exists: boolean;
    canRegisterAsVendor: boolean;
    canRegisterAsVenue: boolean;
    message: string;
  } | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Local storage draft tracking removed for security

  // Handle Phone Verification state for OAuth bypass
  useEffect(() => {
    // Only auto-verify if user exists, has a phone string, and we haven't already verified them
    if (user && 'phone' in user && user.phone && (user.phone as string).length > 0 && !isPhoneVerified) {
      setIsPhoneVerified(true);
      setFormData(prev => ({ ...prev, phone: prev.phone || (user.phone as string) }));
    }
  }, [user, isPhoneVerified]);

  // Auto-advance to Step 3 if user is already logged in (e.g., after Google OAuth)
  useEffect(() => {
    if (user && user.role === "VENDOR") {
      const searchString = window.location.search;

      // If the URL contains step 2 or 3, or if they just have an ID, force them to Business Details
      if (searchString.includes("step=3") || searchString.includes("step=2") || user.id) {
        // Pre-fill name and email from user data
        setFormData(prev => ({
          ...prev,
          name: prev.name || user.name || "",
          email: prev.email || user.email || "",
        }));

        setStep(3); // Jump to Business details

        // Clean up the messy URL quietly in the browser
        window.history.replaceState(null, '', window.location.pathname + '?step=3');
      }
    }
  }, [user]);

  const handleGoogleLogin = () => {
    toast.info("Redirecting to Google...");
    // Pass vendor role metadata to auth provider
    googleLogin({ role: "VENDOR", callbackUrl: "/register/vendor?step=3" });
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
    } else if (emailExists?.exists && !emailExists.canRegisterAsVendor) {
      newErrors.email = "This email is already registered. Please login or use a different email..";
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
    } else if (!isPhoneVerified) {
      newErrors.phone = "Please verify your phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendPhoneOTP = async () => {
    // GUARD 1 - block if there is already a phone error showing
    if (errors.phone) {
      toast.error("Please fix the phone number error before verifying.");
      return;
    }

    // Check if phone already exists FIRST before sending OTP
    if (!formData.phone) {
      setErrors(prev => ({ ...prev, phone: "Please enter your phone number." }));
      return;
    }

    const digitsOnly = /^\d+$/;
    if (!digitsOnly.test(formData.phone)) {
      setErrors(prev => ({ ...prev, phone: "Mobile number must contain digits only." }));
      return;
    }

    if (formData.phone.length < 10) {
      setErrors(prev => ({ ...prev, phone: "Please enter a valid 10-digit mobile number." }));
      return;
    }

    // Check backend if phone already registered
    try {
      const checkResponse = await api.post("/auth/check-phone", { phone: formData.phone });
      if (checkResponse.data.exists) {
        setErrors(prev => ({ 
          ...prev, 
          phone: "This mobile number is already registered. Please use a different number." 
        }));
        return; // Stop here — do not send OTP
      }
    } catch (error: any) {
      console.error("Phone check failed:", error);
      // Silent fail — continue to OTP send
    }

    setErrors(prev => ({ ...prev, phone: "" }));
    setIsLoading(true);
    try {
      await api.post("/otp/send-phone", { phone: formData.phone });
      setShowPhoneOTP(true);
      toast.success("OTP sent to your phone");
    } catch (error: any) {
      console.error("Failed to send phone OTP:", error);
      const data = error.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          setErrors(prev => ({ ...prev, [err.field]: err.message }));
        });
        return;
      }
      const message = data?.message || data?.error?.message || error.message || "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOTP = async () => {
    setIsLoading(true);
    try {
      const response = await api.post("/otp/verify-phone", { phone: formData.phone, otp: phoneOtp });

      // Check if the API returned a success response
      if (response.data?.success) {
        setIsPhoneVerified(true);
        setShowPhoneOTP(false);
        toast.success("Phone verified successfully!");
      } else {
        // API returned success:false - throw to trigger catch block
        throw new Error(response.data?.message || "Verification failed");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const data = error.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          setErrors(prev => ({ ...prev, [err.field]: err.message }));
        });
        return;
      }
      const message = data?.message || data?.error?.message || error.message || "Something went wrong. Please try again.";
      toast.error(message);
      // Do NOT set isPhoneVerified true or hide OTP input on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1 && validateStep1()) {
      // Send OTP before moving to step 2 (OTP verification)
      setIsLoading(true);
      try {
        await api.post("/otp/send", { email: formData.email });

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

        toast.success("OTP sent to your email!", {
          description: "Check your inbox to verify your email.",
        });
        setStep(2);
      } catch (error: any) {
        const data = error.response?.data;
        const message =
          data?.message ||
          data?.error?.message ||
          error.message ||
          "Something went wrong. Please try again.";
        toast.error(message);
        return;
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3 && validateStep2()) {
      setStep(4);
    } else if (step === 4 && validateStep3()) {
      // GUARD - block if there is already a phone error showing
      if (errors.phone) {
        toast.error("Please fix the phone number error before continuing.");
        return;
      }
      // GUARD - block if phone is not verified
      if (!isPhoneVerified) {
        toast.error("Please verify your phone number before continuing.");
        return;
      }
      setStep(5); // Move to Images & KYC step
    } else if (step === 5 && validateStep4()) {
      handleRegister();
    }
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    if (formData.businessImages.length === 0) {
      newErrors.businessImages = "Please upload at least 1 business image (maximum 5 allowed)";
    } else if (formData.businessImages.length > 5) {
      newErrors.businessImages = "Maximum 5 images allowed";
    }

    if (formData.kycDocFiles.length === 0) {
      newErrors.kycDocFiles = "Please upload at least 1 KYC document image (maximum 5 allowed)";
    } else if (formData.kycDocFiles.length > 5) {
      newErrors.kycDocFiles = "Maximum 5 KYC images allowed";
    }

    const docNum = formData.kycDocNumber;
    if (!docNum) {
      newErrors.kycDocNumber = "KYC document number is required";
    } else {
      switch (formData.kycDocType) {
        case "AADHAAR":
          if (!/^\d{12}$/.test(docNum)) newErrors.kycDocNumber = "Aadhaar must be exactly 12 digits";
          break;
        case "PAN":
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(docNum)) newErrors.kycDocNumber = "Invalid PAN format (e.g., ABCDE1234F)";
          break;
        case "PASSPORT":
          if (!/^[A-Z][0-9]{7}$/.test(docNum)) newErrors.kycDocNumber = "Invalid Passport format";
          break;
        case "DRIVING_LICENSE":
          if (!/^[A-Z]{2}[0-9]{13}$/.test(docNum)) newErrors.kycDocNumber = "Invalid DL format (e.g., TN0120230000123)";
          break;
      }
    }

    if (formData.businessType === "CATERING" && formData.foodLicenseFiles.length === 0) {
      newErrors.foodLicenseFiles = "Government Food License (e.g., FSSAI) is strictly required for food services.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setIsLoading(true);

    try {
      // Create FormData for file upload
      const formDataObj = new FormData();
      formDataObj.append("name", formData.name);
      formDataObj.append("email", formData.email);
      if (formData.password) formDataObj.append("password", formData.password);
      formDataObj.append("businessName", formData.businessName);
      formDataObj.append("businessType", formData.businessType);
      formDataObj.append("description", formData.description);
      formDataObj.append("city", formData.city);
      formDataObj.append("area", formData.area);
      formDataObj.append("phone", formData.phone);
      formDataObj.append("serviceRadiusKm", formData.serviceRadiusKm.toString());
      formDataObj.append("kycDocType", formData.kycDocType);
      formDataObj.append("kycDocNumber", formData.kycDocNumber);

      formData.businessImages.forEach((image) => { if (image.size > 0) formDataObj.append("businessImages", image); });
      formData.kycDocFiles.forEach((file) => { if (file.size > 0) formDataObj.append("kycDocFiles", file); });
      formData.foodLicenseFiles.forEach((file) => { if (file.size > 0) formDataObj.append("foodLicenseFiles", file); });

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // OAUTH USER FLOW (User already logged in via Google/Facebook)
      if ((token || user?.id) && !formData.password) {
        // Only use OAuth flow if there's no password (pure OAuth user)
        await api.patch("/vendors/me", formDataObj, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        localStorage.removeItem("registration_draft_vendor");
        toast.success("Profile completed successfully!", { description: "Redirecting to your dashboard..." });
        setTimeout(() => router.push("/dashboard/vendor"), 1000);
        return; // Exit function early
      }

      // STANDARD USER FLOW (New email/password registration)
      const response = await api.post("/auth/register-vendor", formDataObj, {
        headers: { "Content-Type": "multipart/form-data" },
        // @ts-expect-error - skipAuth is a custom property handled in interceptor
        skipAuth: true,
      });

      localStorage.removeItem("registration_draft_vendor");

      const tokenStr = response.data?.token || response.data?.access_token;
      const userObj = response.data?.user;

      if (tokenStr && userObj) {
        localStorage.setItem("NearZro_user", JSON.stringify({ ...userObj, token: tokenStr }));
        toast.success("Registration successful! Welcome to NearZro.");
        router.push('/dashboard/vendor');
        return;
      }

      try {
        await login(formData.email, formData.password);
        toast.success("Registration successful! Welcome to NearZro.");
        router.push('/dashboard/vendor');
      } catch (loginError: any) {
        toast.success("Registration successful! Please login to continue.");
        router.push('/login');
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
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
        "Registration failed. Please try again.";

      // Last safety net for any Prisma leak
      if (sanitizeErrorMessage(message, setErrors)) return;

      // Clean backend messages — route to correct field or toast
      if (message.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: message }));
      } else if (message.toLowerCase().includes('phone') || message.toLowerCase().includes('mobile')) {
        setErrors(prev => ({ ...prev, phone: message }));
      } else if (message.toLowerCase().includes('username')) {
        setErrors(prev => ({ ...prev, username: message }));
      } else if (message.toLowerCase().includes('password')) {
        setErrors(prev => ({ ...prev, password: message }));
      } else {
        toast.error(message);
      }
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

      toast.success("Email verified successfully!", {
        description: "Continue to complete your business details.",
      });

      // Move to business details step (step 3)
      setStep(3);
      setOtp("");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const data = error.response?.data;
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

  const handleResendOTP = async () => {
    try {
      await api.post("/otp/send", { email: formData.email });
      toast.success("OTP resent successfully", {
        description: "Check your email for the new code.",
      });
    } catch (error: any) {
      const data = error.response?.data;
      const message =
        data?.message ||
        data?.error?.message ||
        error.message ||
        "Something went wrong. Please try again.";
      toast.error(message);
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

    // Check email with debounce when email field changes
    if (field === "email") {
      // Clear previous timeout
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }

      // Reset email status
      setEmailExists(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });

      // Only check if email looks valid
      if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        // Wait 1 second after user stops typing before checking
        const timeout = setTimeout(() => {
          checkEmailExists(value);
        }, 1000);
        setEmailCheckTimeout(timeout);
      }
    }
  };

  const checkEmailExists = async (email: string) => {
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
      return;
    }

    try {
      const response = await api.post("/auth/check-email", { email });
      // FIXED: now correctly reads response.data.exists
      if (response.data.exists) {
        setErrors(prev => ({ 
          ...prev, 
          email: "This email is already registered. Please use a different email or login instead." 
        }));
      } else {
        setErrors(prev => ({ ...prev, email: "" }));
      }
    } catch (error: any) {
      // Silent fail — do not confuse user with "unable to verify" message
      console.error("Email check failed silently:", error);
    }
  };

  const checkPhoneExists = async (phone: string) => {
    if (!phone) return;

    const digitsOnly = /^\d+$/;
    if (!digitsOnly.test(phone)) {
      setErrors(prev => ({ ...prev, phone: "Mobile number must contain digits only." }));
      return;
    }

    if (phone.length < 10) {
      setErrors(prev => ({ ...prev, phone: "Please enter a valid 10-digit mobile number." }));
      return;
    }

    // Clear previous phone error before checking
    setErrors(prev => ({ ...prev, phone: "" }));

    try {
      const response = await api.post("/auth/check-phone", { phone });
      if (response.data.exists) {
        setErrors(prev => ({ 
          ...prev, 
          phone: "This mobile number is already registered. Please use a different number." 
        }));
      } else {
        setErrors(prev => ({ ...prev, phone: "" }));
      }
    } catch (error: any) {
      // Silent fail — do not confuse user
      console.error("Phone check failed silently:", error);
    }
  };

  const checkPassword = (password: string) => {
    if (!password) return;
    if (password.length < 8) {
      setErrors(prev => ({ ...prev, password: "Password must be at least 8 characters." }));
    } else if (!/[A-Z]/.test(password)) {
      setErrors(prev => ({ ...prev, password: "Password must contain at least one uppercase letter." }));
    } else if (!/[0-9]/.test(password)) {
      setErrors(prev => ({ ...prev, password: "Password must contain at least one number." }));
    } else if (!/[@$!%*?&]/.test(password)) {
      setErrors(prev => ({ ...prev, password: "Password must contain at least one special character." }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.password; return newErrors; });
    }
  };

  const checkConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) return;
    if (formData.password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match." }));
    } else {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.confirmPassword; return newErrors; });
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-center">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${step >= stepNumber
                      ? "bg-white text-zinc-950"
                      : "bg-zinc-800 text-zinc-500"
                    }`}
                >
                  {step > stepNumber ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 5 && (
                  <div
                    className={`w-12 sm:w-16 h-0.5 mx-1.5 ${step > stepNumber ? "bg-white" : "bg-zinc-800"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-zinc-400">
            <span>Account</span>
            <span>Verify</span>
            <span>Business</span>
            <span>Contact</span>
            <span>KYC</span>
          </div>
        </div>

        <Card className="border-0 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-12 w-12 rounded-xl bg-zinc-900 border border-white/10 mx-auto mb-3 flex items-center justify-center">
              <Store className="h-6 w-6 text-zinc-200" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-50">
              {step === 1 && "Create Your Vendor Account"}
              {step === 2 && "Verify Email"}
              {step === 3 && "Business Details"}
              {step === 4 && "Contact Information"}
              {step === 5 && "Images & KYC"}
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              {step === 1 && "Enter your personal details to get started"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Tell us about your business"}
              {step === 4 && "How can we reach you?"}
              {step === 5 && "Upload business photos and KYC documents"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Step 1: Account Details */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-zinc-300">
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={`pl-9 h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.name ? "border-red-500" : ""
                        }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      onBlur={(e) => checkEmailExists(e.target.value)}
                      className={`pl-9 h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.email ? "border-red-500" : ""
                        }`}
                      disabled={isCheckingEmail}
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-zinc-600 border-t-white rounded-full" />
                      </div>
                    )}
                  </div>
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      onBlur={(e) => checkPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`pl-9 pr-9 h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.password ? "border-red-500" : ""
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      onBlur={(e) => checkConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`pl-9 pr-9 h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.confirmPassword ? "border-red-500" : ""
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
                </div>

                {/* OAuth Buttons */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-950/60 px-2 text-zinc-500">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>

                <Button
                  type="button"
                  variant="default"
                  className="w-full h-10 text-sm font-semibold bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Continue to Business Details"}
                </Button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-200">Check Your Email</p>
                      <p className="text-xs text-blue-300/80 mt-0.5">
                        We've sent a 6-digit verification code to <strong>{formData.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {devOtp && process.env.NODE_ENV === 'development' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-200">Development Mode - OTP Display</p>
                        <p className="text-sm text-amber-300/80 mt-1 mb-2">
                          Email sending is disabled in development. Use this OTP:
                        </p>
                        <div className="bg-zinc-900/50 border border-amber-500/20 rounded-md py-3 px-4 text-center">
                          <span className="text-3xl font-bold tracking-widest text-amber-400">{devOtp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="otp" className="text-sm font-medium text-zinc-300">
                    Enter OTP *
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className={`h-12 text-center text-xl tracking-widest bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.otp ? "border-red-500" : ""
                      }`}
                  />
                  {errors.otp && <p className="text-xs text-red-400">{errors.otp}</p>}
                </div>

                <Button
                  type="button"
                  variant="default"
                  className="w-full h-10 text-sm font-semibold text-zinc-100 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-600 rounded-lg hover:from-zinc-600 hover:to-zinc-800 hover:border-zinc-400 transition-all duration-300 active:scale-[0.99]"
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-sm text-zinc-400 hover:text-white"
                  >
                    Didn't receive the OTP? Resend
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 text-sm bg-white/5 border border-white/20 text-white font-semibold backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/40 active:scale-95"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Business Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-sm font-medium text-zinc-300">
                    Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Elite Photography Services"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    className={`h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.businessName ? "border-red-500" : ""
                      }`}
                  />
                  {errors.businessName && <p className="text-xs text-red-400">{errors.businessName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessType" className="text-sm font-medium text-zinc-300">
                    Business Type *
                  </Label>
                  <select
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => handleInputChange("businessType", e.target.value)}
                    className={`flex h-10 w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.businessType ? "border-red-500" : ""
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
                  {errors.businessType && <p className="text-xs text-red-400">{errors.businessType}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium text-zinc-300">
                    Business Description *
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your services, experience, and what makes you unique... (min. 20 characters)"
                    rows={3}
                    className={`flex min-h-[80px] w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.description ? "border-red-500" : ""
                      }`}
                  />
                  {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
                </div>

                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* City Dropdown */}
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-sm font-medium text-zinc-300">
                        City *
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <select
                          id="city"
                          value={formData.city}
                          onChange={(e) => {
                            handleInputChange("city", e.target.value);
                            // Auto-clear area selection if a non-Chennai city is selected
                            if (e.target.value !== "Chennai") {
                              handleInputChange("area", "");
                            }
                          }}
                          className={`pl-9 h-10 w-full appearance-none bg-zinc-900/50 border border-white/10 text-white focus:outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all rounded-lg text-sm ${errors.city ? "border-red-500" : ""
                            }`}
                        >
                          <option className="bg-zinc-900 text-white" value="" disabled>Select City</option>
                          <option className="bg-zinc-900 text-white" value="Chennai">Chennai</option>
                          <option className="bg-zinc-900 text-white" value="Coimbatore">Coimbatore</option>
                          <option className="bg-zinc-900 text-white" value="Madurai">Madurai</option>
                          <option className="bg-zinc-900 text-white" value="Trichy">Trichy</option>
                          <option className="bg-zinc-900 text-white" value="Salem">Salem</option>
                          <option className="bg-zinc-900 text-white" value="Tirunelveli">Tirunelveli</option>
                          <option className="bg-zinc-900 text-white" value="Tiruppur">Tiruppur</option>
                        </select>
                      </div>
                      {errors.city && <p className="text-xs text-red-400">{errors.city}</p>}
                    </div>

                    {/* Area Dropdown */}
                    <div className={`space-y-1.5 ${formData.city !== "Chennai" ? "opacity-50 pointer-events-none" : ""}`}>
                      <Label htmlFor="area" className="text-sm font-medium text-zinc-300">
                        Area *
                      </Label>
                      <select
                        id="area"
                        value={formData.area}
                        onChange={(e) => handleInputChange("area", e.target.value)}
                        disabled={formData.city !== "Chennai"}
                        className={`h-10 w-full appearance-none px-3 bg-zinc-900/50 border border-white/10 text-white focus:outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all rounded-lg text-sm ${errors.area ? "border-red-500" : ""
                          }`}
                      >
                        <option className="bg-zinc-900 text-white" value="" disabled>Select Area</option>
                        {chennaiAreas.sort().map((area) => (
                          <option className="bg-zinc-900 text-white" key={area} value={area}>{area}</option>
                        ))}
                      </select>
                      {errors.area && <p className="text-xs text-red-400">{errors.area}</p>}
                    </div>
                  </div>

                  {/* Geofence Expansion Warning Banner */}
                  {formData.city && formData.city !== "Chennai" && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-200">
                        Currently, we only operate in Chennai. Services in <strong className="text-amber-400">{formData.city}</strong> will be launching in the near future!
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 text-sm bg-white/5 border border-white/20 text-white font-semibold backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/40 active:scale-95"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-10 text-sm font-semibold bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                    onClick={() => {
                      if (validateStep2()) setStep(4);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Continue to Contact"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-zinc-300">
                    Phone Number *
                  </Label>
                  <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="phone"
                        placeholder="9876543210"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, phone: e.target.value }));
                          setIsPhoneVerified(false);
                          // Do NOT clear error on typing - only clear on valid verification
                        }}
                        onBlur={(e) => checkPhoneExists(e.target.value)}
                        disabled={isPhoneVerified}
                        className={`pl-9 h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.phone ? "border-red-500" : ""
                          }`}
                        maxLength={10}
                      />
                    </div>
                    {!isPhoneVerified ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={sendPhoneOTP}
                        disabled={isLoading || !!errors.phone || formData.phone.length !== 10}
                        className="bg-white/5 border-white/20 text-white h-10 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    ) : (
                      <div className="h-10 px-4 flex items-center justify-center bg-green-500/10 border border-green-500/20 rounded-lg shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      </div>
                    )}
                  </div>
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}

                  {showPhoneOTP && !isPhoneVerified && (
                    <div className="mt-3 p-4 bg-zinc-900/50 border border-white/10 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="phoneOtp" className="text-sm font-medium text-zinc-300">Enter Phone OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="phoneOtp"
                          placeholder="123456"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          maxLength={6}
                          className="h-10 text-center tracking-widest text-lg bg-zinc-950 border-white/20 focus:border-emerald-500 text-white"
                        />
                        <Button
                          type="button"
                          onClick={verifyPhoneOTP}
                          disabled={isLoading || phoneOtp.length < 4}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white h-10"
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="serviceRadiusKm" className="text-sm font-medium text-zinc-300">
                    Service Radius (km)
                  </Label>
                  <Input
                    id="serviceRadiusKm"
                    type="number"
                    value={formData.serviceRadiusKm}
                    onChange={(e) => handleInputChange("serviceRadiusKm", e.target.value)}
                    className="h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all"
                  />
                  <p className="text-xs text-zinc-500">How far are you willing to travel for events?</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 text-sm bg-white/5 border border-white/20 text-white font-semibold backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/40 active:scale-95"
                    onClick={() => setStep(3)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-10 text-sm font-semibold bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 hover:border-white/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleNextStep}
                    disabled={isLoading || !!errors.phone || !isPhoneVerified}
                  >
                    {isLoading ? "Saving..." : "Continue to Images & KYC"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Business Images & KYC */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-200">Business Photos & KYC Required</p>
                      <p className="text-xs text-blue-300/80 mt-0.5">
                        Upload photos of your business and a valid KYC document for verification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Images Upload */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-300">
                    Business Photos * (Minimum 1, Maximum 5)
                  </Label>
                  <div className="border-2 border-dashed border-zinc-600 hover:border-zinc-400 bg-zinc-900/30 rounded-lg p-4 text-center transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setIsCompressing(true);
                          const compressedFiles = await Promise.all(files.map(compressImage));
                          setFormData(prev => ({ ...prev, businessImages: [...prev.businessImages, ...compressedFiles].slice(0, 5) }));
                          setIsCompressing(false);
                        }
                      }}
                      className="hidden"
                      id="business-images-upload"
                    />
                    <label htmlFor="business-images-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        {isCompressing ? (
                          <Loader2 className="w-10 h-10 text-zinc-500 mb-2 animate-spin" />
                        ) : (
                          <svg className="w-10 h-10 text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        <p className="text-sm text-zinc-400">
                          <span className="font-semibold text-white">{isCompressing ? "Processing images..." : "Click to upload"}</span> or drag and drop
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">PNG, JPG up to 5MB each</p>
                      </div>
                    </label>
                    {formData.businessImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {formData.businessImages.map((image, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Business ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  businessImages: prev.businessImages.filter((_, i) => i !== index)
                                }));
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.businessImages && <p className="text-xs text-red-400">{errors.businessImages}</p>}
                </div>

                {/* KYC Document Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="kycDocType" className="text-sm font-medium text-zinc-300">
                    KYC Document Type *
                  </Label>
                  <select
                    id="kycDocType"
                    value={formData.kycDocType}
                    onChange={(e) => handleInputChange("kycDocType", e.target.value)}
                    className={`flex h-10 w-full rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.kycDocType ? "border-red-500" : ""
                      }`}
                  >
                    <option value="AADHAAR">Aadhar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                  </select>
                  {errors.kycDocType && <p className="text-xs text-red-400">{errors.kycDocType}</p>}
                </div>

                {/* KYC Document Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="kycDocNumber" className="text-sm font-medium text-zinc-300">
                    KYC Document Number *
                  </Label>
                  <Input
                    id="kycDocNumber"
                    placeholder={
                      formData.kycDocType === "AADHAAR" ? "XXXX-XXXX-XXXX" :
                        formData.kycDocType === "PAN" ? "ABCDE1234F" :
                          formData.kycDocType === "PASSPORT" ? "A1234567" :
                            "DL Number"
                    }
                    value={formData.kycDocNumber}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (formData.kycDocType === "AADHAAR") {
                        val = val.replace(/\D/g, '').slice(0, 12);
                      } else {
                        val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      }
                      handleInputChange("kycDocNumber", val);
                    }}
                    className={`h-10 text-sm bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-all ${errors.kycDocNumber ? "border-red-500" : ""
                      }`}
                  />
                  {errors.kycDocNumber && <p className="text-xs text-red-400">{errors.kycDocNumber}</p>}
                </div>

                {/* KYC Document Files Upload (1-5 images) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-300">
                    KYC Document Images * (Minimum 1, Maximum 5 - Clear images of {formData.kycDocType === "AADHAAR" ? "Aadhar" : formData.kycDocType === "PAN" ? "PAN" : formData.kycDocType === "PASSPORT" ? "Passport" : "Driving License"})
                  </Label>
                  <div className="border-2 border-dashed border-zinc-600 hover:border-zinc-400 bg-zinc-900/30 rounded-lg p-4 text-center transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setIsCompressing(true);
                          const compressedFiles = await Promise.all(files.map(compressImage));
                          setFormData(prev => ({ ...prev, kycDocFiles: [...prev.kycDocFiles, ...compressedFiles].slice(0, 5) }));
                          setIsCompressing(false);
                        }
                      }}
                      className="hidden"
                      id="kyc-doc-upload"
                    />
                    <label htmlFor="kyc-doc-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        {isCompressing ? (
                          <Loader2 className="w-10 h-10 text-zinc-500 mb-2 animate-spin" />
                        ) : (
                          <svg className="w-10 h-10 text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <p className="text-sm text-zinc-400">
                          <span className="font-semibold text-white">{isCompressing ? "Processing documents..." : "Click to upload KYC documents"}</span> or drag and drop
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">PNG, JPG, PDF up to 5MB each (1-5 files)</p>
                      </div>
                    </label>
                    {formData.kycDocFiles.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {formData.kycDocFiles.map((file, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                            {file.type === "application/pdf" ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800">
                                <FileText className="w-8 h-8 text-blue-400 mb-1" />
                                <span className="text-[10px] text-zinc-400 text-center px-1 truncate w-full">{file.name}</span>
                              </div>
                            ) : (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`KYC ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  kycDocFiles: prev.kycDocFiles.filter((_, i) => i !== index)
                                }));
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.kycDocFiles && <p className="text-xs text-red-400">{errors.kycDocFiles}</p>}
                </div>

                {formData.businessType === "CATERING" && (
                  <div className="space-y-2 mt-6 p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Label className="text-sm font-medium text-amber-300">
                      Government Food License (FSSAI) *
                    </Label>
                    <div className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-zinc-900/30 rounded-lg p-4 text-center transition-colors">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setIsCompressing(true);
                            const compressedFiles = await Promise.all(files.map(compressImage));
                            setFormData(prev => ({ ...prev, foodLicenseFiles: [...prev.foodLicenseFiles, ...compressedFiles].slice(0, 5) }));
                            setIsCompressing(false);
                          }
                        }}
                        className="hidden"
                        id="food-license-upload"
                      />
                      <label htmlFor="food-license-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          {isCompressing ? (
                            <Loader2 className="w-10 h-10 text-amber-500 mb-2 animate-spin" />
                          ) : (
                            <svg className="w-10 h-10 text-amber-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          <p className="text-sm text-amber-300/80">
                            <span className="font-semibold text-amber-400">{isCompressing ? "Processing..." : "Click to upload FSSAI License"}</span> or drag and drop
                          </p>
                          <p className="text-xs text-amber-500/60 mt-1">PNG, JPG, PDF up to 5MB each</p>
                        </div>
                      </label>
                      {formData.foodLicenseFiles.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {formData.foodLicenseFiles.map((file, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-amber-500/30">
                              {file.type === "application/pdf" ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800">
                                  <FileText className="w-8 h-8 text-amber-400 mb-1" />
                                  <span className="text-[10px] text-amber-300/80 text-center px-1 truncate w-full">{file.name}</span>
                                </div>
                              ) : (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Food License ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    foodLicenseFiles: prev.foodLicenseFiles.filter((_, i) => i !== index)
                                  }));
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.foodLicenseFiles && <p className="text-xs text-red-400">{errors.foodLicenseFiles}</p>}
                  </div>
                )}

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-900/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950"
                      />
                    </div>
                    <Label htmlFor="terms" className="text-sm text-zinc-400 leading-snug cursor-pointer">
                      I agree to the <Link href="/terms" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-white transition-colors">DPDP Privacy Policy</Link>.
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-10 text-sm bg-white/5 border border-white/20 text-white font-semibold backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/40 active:scale-95"
                      onClick={() => setStep(4)}
                      disabled={isLoading || isCompressing}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      className="flex-1 h-10 text-sm font-semibold bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                      onClick={handleNextStep}
                      disabled={isLoading || isCompressing || !acceptedTerms}
                    >
                      {isLoading ? "Creating Account..." : "Submit for Verification"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-zinc-400">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white underline hover:text-zinc-300">
              Sign in
            </Link>
          </p>
          <p className="mt-2">
            By registering, you agree to our{" "}
            <Link href="/terms" className="font-semibold text-white underline hover:text-zinc-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-white underline hover:text-zinc-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}