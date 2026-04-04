"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useAuth, UserRole } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, User, Building, Phone, MapPin, CheckCircle2, AlertCircle, Chrome, Loader2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { PasswordStrength } from "@/components/ui/password-strength";
import { compressImage } from "@/lib/image-utils";

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

export default function VenueOwnerRegisterPage() {
  const router = useRouter();
  const { login, googleLogin, facebookLogin, user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(() => {
    if (typeof window === 'undefined') return 1;
    const urlStep = new URLSearchParams(window.location.search).get('step');
    return urlStep === '3' ? 3 : 1;
  });
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    if (token) {
      setIsProcessingOAuth(true);
      setTimeout(() => {
        try {
          const userData = userStr ? JSON.parse(decodeURIComponent(userStr)) : null;
          if (userData) {
            const authenticatedUser = {
              id: String(userData.id),
              name: userData.name,
              email: userData.email,
              role: userData.role || "VENUE_OWNER",
              token: token,
            };
            // Fix Interceptor Sabotage: Hydrate ALL expected keys
            localStorage.setItem("token", token);
            localStorage.setItem("NearZro_user", JSON.stringify(authenticatedUser));
            localStorage.setItem("user", JSON.stringify(userData));
            if (setUserFromOAuth) setUserFromOAuth(authenticatedUser);
          }
          
          if (params.get('step') === '3') setStep(3);
          window.history.replaceState(null, '', window.location.pathname);
          toast.success("Google login successful! Please complete your details.");
        } catch (error) {
          console.error("OAuth processing failed:", error);
          toast.error("Failed to process login data.");
        } finally {
          setIsProcessingOAuth(false);
        }
      }, 50);
    }
  }, []);

  // Auto-advance to Step 3 if user is already logged in (e.g., after Google OAuth)
  useEffect(() => {
    if (user && user.role === "VENUE_OWNER") { 
      const searchString = window.location.search;
      
      // If the URL contains step 2 or 3, or if they just have an ID, force them to Venue Details
      if (searchString.includes("step=3") || searchString.includes("step=2") || user.id) {
        // Pre-fill name and email from user data
        setFormData(prev => ({
          ...prev,
          name: prev.name || user.name || "",
          email: prev.email || user.email || "",
        }));
        
        setStep(3); // Jump to Venue details
        
        // Clean up the messy URL quietly in the browser
        window.history.replaceState(null, '', window.location.pathname + '?step=3');
      }
    }
  }, [user]);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    venueName: "",
    venueType: "",
    description: "",
    city: "",
    area: "",
    address: "",
    pincode: "",
    capacityMin: "",
    capacityMax: "",
    basePriceMorning: "",
    basePriceEvening: "",
    basePriceFullDay: "",
    phone: "",
    venueImages: [] as File[],
    kycDocFiles: [] as File[],
    kycDocType: "AADHAAR",
    kycDocNumber: "",
    venueGovtCertificateFiles: [] as File[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<{
    exists: boolean;
    canRegisterAsVenue: boolean;
    message: string;
  } | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const { setUserFromOAuth } = useAuth();

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDraft = localStorage.getItem("registration_draft_venue");
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Draft hydration failed", e);
        }
      }
    }
  }, []);

  // Save to localStorage whenever formData changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (typeof window !== "undefined") {
        const { password, confirmPassword, venueImages, kycDocFiles, venueGovtCertificateFiles, ...safeData } = formData;
        if (safeData.email || safeData.name || safeData.venueName) {
          localStorage.setItem("registration_draft_venue", JSON.stringify(safeData));
        }
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [formData]);

  // Handle Phone Verification state for OAuth bypass
  useEffect(() => {
    if (user && 'phone' in user && user.phone && (user.phone as string).length > 0 && !isPhoneVerified) {
      setIsPhoneVerified(true);
      setFormData(prev => ({ ...prev, phone: prev.phone || (user.phone as string) }));
    }
  }, [user, isPhoneVerified]);

  const handleGoogleLogin = () => {
    const state = encodeURIComponent(JSON.stringify({
      intendedRole: "VENUE_OWNER",
      callbackUrl: "/register/venue-owner?step=3"
    }));
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google?state=${state}`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/facebook`;
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
    } else if (emailExists?.exists && !emailExists.canRegisterAsVenue) {
      newErrors.email = "This email is already registered. Please login or use a different email.";
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

    if (!formData.venueName.trim()) {
      newErrors.venueName = "Venue name is required";
    }

    if (!formData.venueType) {
      newErrors.venueType = "Please select a venue type";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Venue description is required";
    } else if (formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.area.trim()) {
      newErrors.area = "Area is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Street address is required";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be a valid 6-digit number";
    }

    if (!formData.capacityMin) {
      newErrors.capacityMin = "Minimum capacity is required";
    } else if (parseInt(formData.capacityMin) <= 0) {
      newErrors.capacityMin = "Minimum capacity must be greater than 0";
    }

    if (!formData.capacityMax) {
      newErrors.capacityMax = "Maximum capacity is required";
    } else if (parseInt(formData.capacityMax) <= 0) {
      newErrors.capacityMax = "Maximum capacity must be greater than 0";
    }

    if (formData.capacityMin && formData.capacityMax && parseInt(formData.capacityMin) > parseInt(formData.capacityMax)) {
      newErrors.capacityMax = "Maximum capacity must be greater than or equal to minimum capacity";
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
    if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      setErrors(prev => ({ ...prev, phone: "Please enter a valid 10-digit Indian mobile number first" }));
      return;
    }
    setErrors(prev => ({ ...prev, phone: "" }));
    setIsLoading(true);
    try {
      await api.post("/otp/send-phone", { phone: formData.phone });
      setShowPhoneOTP(true);
      toast.success("OTP sent to your phone");
    } catch (error: any) {
      console.error("Failed to send phone OTP:", error);
      toast.error(error?.response?.data?.message || "Failed to send OTP. Please try again.");
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
      toast.error(error?.response?.data?.message || error?.message || "Invalid OTP. Please try again.");
      // Do NOT set isPhoneVerified true or hide OTP input on error
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    if (formData.venueImages.length === 0) {
      newErrors.venueImages = "Please upload at least 1 venue image (maximum 5 allowed)";
    } else if (formData.venueImages.length > 5) {
      newErrors.venueImages = "Maximum 5 images allowed";
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

    if (formData.venueGovtCertificateFiles.length === 0) {
      newErrors.venueGovtCertificateFiles = "Original Government Certified Document (Trade License/Registration) is strictly required.";
    }

    if (!acceptedTerms) {
      newErrors.terms = "You must agree to the Terms and Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = async () => {
    if (step === 1 && validateStep1()) {
      setIsLoading(true);
      try {
        await api.post("/otp/send", { email: formData.email });
        toast.success("OTP sent to your email!", { description: "Check your inbox." });
        setStep(2);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to send OTP.");
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3 && validateStep2()) {
      setStep(4);
    } else if (step === 4 && validateStep3()) {
      setStep(5);
    } else if (step === 5 && validateStep4()) {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);

    try {
      // Fix Hijack: Only enter OAuth flow if they actually skipped the password step
      const isOAuthFlow = !formData.password; 
      const token = localStorage.getItem('token');

      if (isOAuthFlow && token) {
        // --- OAUTH USER FLOW ---
        const formDataObj = new FormData();
        formDataObj.append("name", formData.venueName);
        formDataObj.append("type", formData.venueType);
        formDataObj.append("description", formData.description);
        formDataObj.append("city", formData.city);
        formDataObj.append("area", formData.area);
        formDataObj.append("address", formData.address);
        formDataObj.append("pincode", formData.pincode);
        formDataObj.append("capacityMin", formData.capacityMin?.toString() || '');
        formDataObj.append("capacityMax", formData.capacityMax?.toString() || '');
        if (formData.basePriceMorning) formDataObj.append("basePriceMorning", formData.basePriceMorning?.toString() || '');
        if (formData.basePriceEvening) formDataObj.append("basePriceEvening", formData.basePriceEvening?.toString() || '');
        if (formData.basePriceFullDay) formDataObj.append("basePriceFullDay", formData.basePriceFullDay?.toString() || '');
        formDataObj.append("phone", formData.phone);
        formDataObj.append("kycDocNumber", formData.kycDocNumber || '');
        formDataObj.append("kycDocType", formData.kycDocType || 'AADHAAR');
        
        formData.venueImages.forEach((image) => formDataObj.append("venueImages", image));
        formData.kycDocFiles.forEach((file) => formDataObj.append("kycDocFiles", file));
        formData.venueGovtCertificateFiles.forEach((file) => formDataObj.append("venueGovtCertificateFiles", file));

        // Check if they already have a venue
        const venuesResponse = await api.get("/venues/my");
        const venues = venuesResponse.data;

        if (!venues || venues.length === 0) {
          // New Google user: Create their venue
          await api.post('/venues', formDataObj);
        } else {
          // Returning Google user: Update their venue
          await api.patch('/venues/my', formDataObj);
        }

        toast.success("Profile completed successfully!", { description: "Redirecting to dashboard..." });
        setTimeout(() => router.push("/dashboard/venue"), 500);
        return;
      }

      // --- STANDARD USER FLOW ---
      const formDataObj = new FormData();
      formDataObj.append("name", formData.name);
      formDataObj.append("email", formData.email);
      formDataObj.append("password", formData.password);
      formDataObj.append("venueName", formData.venueName);
      formDataObj.append("venueType", formData.venueType);
      formDataObj.append("description", formData.description);
      formDataObj.append("city", formData.city);
      formDataObj.append("area", formData.area);
      formDataObj.append("address", formData.address);
      formDataObj.append("pincode", formData.pincode);
      formDataObj.append("capacityMin", formData.capacityMin?.toString() || '');
      formDataObj.append("capacityMax", formData.capacityMax?.toString() || '');
      if (formData.basePriceMorning) formDataObj.append("basePriceMorning", formData.basePriceMorning?.toString() || '');
      if (formData.basePriceEvening) formDataObj.append("basePriceEvening", formData.basePriceEvening?.toString() || '');
      if (formData.basePriceFullDay) formDataObj.append("basePriceFullDay", formData.basePriceFullDay?.toString() || '');
      formDataObj.append("phone", formData.phone);
      formDataObj.append("kycDocNumber", formData.kycDocNumber || '');
      formDataObj.append("kycDocType", formData.kycDocType || 'AADHAAR');

      formData.venueImages.forEach((image) => {
        formDataObj.append("venueImages", image);
      });

      formData.kycDocFiles.forEach((file) => {
        formDataObj.append("kycDocFiles", file);
      });

      formData.venueGovtCertificateFiles.forEach((file) => {
        formDataObj.append("venueGovtCertificateFiles", file);
      });

      const response = await api.post("/auth/register-venue-owner", formDataObj, {
        // Let Axios auto-set Content-Type for FormData
      });

      const createdUser = response.data.user;
      setUserId(createdUser.id);

      // Authenticate directly to retrieve fresh tokens
      const loginRes = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const newToken = loginRes.data.token || loginRes.data.accessToken;
      if (newToken) {
        // 1. Flatten the payload exactly as AuthContext expects it for native routing bypass
        const authenticatedUser = {
          id: String(loginRes.data.user.id),
          name: loginRes.data.user.name,
          email: loginRes.data.user.email,
          role: loginRes.data.user.role,
          token: newToken,
        };

        // 2. Hydrate local storage cleanly
        localStorage.setItem("token", newToken);
        localStorage.setItem("NearZro_user", JSON.stringify(authenticatedUser)); 
        localStorage.setItem("user", JSON.stringify(loginRes.data.user)); 
        
        // 3. Force-sync the live React Context immediately
        if (setUserFromOAuth) {
          setUserFromOAuth(authenticatedUser);
        }
      }

      toast.success("Account created and authenticated!", {
        description: "Preparing your dashboard...",
      });

      // 4. Use a soft redirect (router.push) now that live context is fully hydrated
      setTimeout(() => {
        router.push("/dashboard/venue");
      }, 500);
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
      await api.post("/otp/verify", {
        email: formData.email,
        otp: otp,
      });

      toast.success("Email verified successfully!", {
        description: "Continuing to venue details...",
      });

      setStep(3); // Move to Venue Details after OTP verification
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

    if (field === "email") {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }

      setEmailExists(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });

      if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        const timeout = setTimeout(() => {
          checkEmailExists(value);
        }, 1000);
        setEmailCheckTimeout(timeout);
      }
    }
  };

  const checkEmailExists = async (email: string) => {
    setIsCheckingEmail(true);
    try {
      const response = await api.post("/auth/check-email", { email });
      const data = response.data;

      setEmailExists({
        exists: data.exists,
        canRegisterAsVenue: data.canRegisterAsVenue,
        message: data.message,
      });

      if (data.exists && !data.canRegisterAsVenue) {
        setErrors(prev => ({
          ...prev,
          email: "This email is already registered. Please login or use a different email.",
        }));
      }
    } catch (error) {
      console.error("Email check error:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  if (isProcessingOAuth) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-zinc-400 font-medium">Securing your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-center">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                    step >= stepNumber
                      ? "bg-white text-zinc-950"
                      : "bg-zinc-800 text-zinc-400"
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
                    className={`w-12 sm:w-16 h-0.5 mx-1.5 ${
                      step > stepNumber ? "bg-white" : "bg-zinc-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-zinc-500 px-1">
            <span>Account</span>
            <span>Verify</span>
            <span>Venue</span>
            <span>Contact</span>
            <span>KYC</span>
          </div>
        </div>

        <Card className="border-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-zinc-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 rounded-2xl p-8">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-12 w-12 rounded-xl bg-zinc-900 border border-white/10 mx-auto mb-3 flex items-center justify-center">
              <Building className="h-6 w-6 text-zinc-200" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-50">
              {step === 1 && "Create Your Venue Owner Account"}
              {step === 2 && "Verify Email"}
              {step === 3 && "Venue Details"}
              {step === 4 && "Contact Information"}
              {step === 5 && "Images & KYC"}
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              {step === 1 && "Enter your personal details to get started"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Tell us about your venue"}
              {step === 4 && "How can we reach you?"}
              {step === 5 && "Upload venue photos and KYC documents"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Account Details */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-zinc-300">
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={`pl-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.name ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={`pl-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.email ? "border-red-500" : ""
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

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`pl-10 pr-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.password ? "border-red-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder="Re-enter password"
                      className={`pl-10 pr-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.confirmPassword ? "border-red-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                    <span className="bg-zinc-900/40 px-2 text-zinc-500">Or continue with</span>
                  </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 bg-transparent border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-3 py-2.5 rounded-lg"
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

                <Button
                  type="button"
                  variant="default"
                  className="w-full h-12 text-base font-semibold text-zinc-100 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-600 rounded-lg hover:from-zinc-600 hover:to-zinc-800 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-[0.99]"
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Continue to Verify Email"}
                </Button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="space-y-5">
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

                <div className="space-y-2">
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
                    className="h-12 text-center text-xl tracking-widest bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                  />
                </div>

                <Button
                  type="button"
                  variant="default"
                  className="w-full h-12 text-base font-semibold text-zinc-100 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-600 rounded-lg hover:from-zinc-600 hover:to-zinc-800 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-[0.99]"
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    Didn't receive the OTP? Resend
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 bg-zinc-800 text-white hover:bg-zinc-700 transition-all duration-300"
                    onClick={() => setStep(4)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Venue Details */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="venueName" className="text-sm font-medium text-zinc-300">
                    Venue Name *
                  </Label>
                  <Input
                    id="venueName"
                    placeholder="Grand Ballroom ITC"
                    value={formData.venueName}
                    onChange={(e) => handleInputChange("venueName", e.target.value)}
                    className={`h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                      errors.venueName ? "border-red-500" : ""
                    }`}
                  />
                  {errors.venueName && <p className="text-xs text-red-400">{errors.venueName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venueType" className="text-sm font-medium text-zinc-300">
                    Venue Type *
                  </Label>
                  <select
                    id="venueType"
                    value={formData.venueType}
                    onChange={(e) => handleInputChange("venueType", e.target.value)}
                    className={`flex h-12 w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                      errors.venueType ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Select venue type</option>
                    <option value="BANQUET_HALL">Banquet Hall</option>
                    <option value="MARRIAGE_HALL">Marriage Hall</option>
                    <option value="BEACH_VENUE">Beach Venue</option>
                    <option value="RESORT">Resort</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="LAWN">Open Lawn</option>
                    <option value="COMMUNITY_HALL">Community Hall</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.venueType && <p className="text-xs text-red-400">{errors.venueType}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-zinc-300">
                    Venue Description *
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your venue, amenities, capacity, and what makes it special... (min. 20 characters)"
                    rows={4}
                    className={`flex min-h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                      errors.description ? "border-red-500" : ""
                    }`}
                  />
                  {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
                </div>

                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* City Dropdown */}
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium text-zinc-300">
                        City *
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
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
                          className={`pl-10 h-12 w-full appearance-none bg-zinc-900/50 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all rounded-md ${
                            errors.city ? "border-red-500" : ""
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
                    <div className={`space-y-2 ${formData.city !== "Chennai" ? "opacity-50 pointer-events-none" : ""}`}>
                      <Label htmlFor="area" className="text-sm font-medium text-zinc-300">
                        Area *
                      </Label>
                      <select
                        id="area"
                        value={formData.area}
                        onChange={(e) => handleInputChange("area", e.target.value)}
                        disabled={formData.city !== "Chennai"}
                        className={`h-12 w-full appearance-none px-3 bg-zinc-900/50 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all rounded-md ${
                          errors.area ? "border-red-500" : ""
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
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-200">
                        Currently, we only operate in Chennai. Services in <strong className="text-amber-400">{formData.city}</strong> will be launching in the near future!
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="address" className="text-sm font-medium text-zinc-300">
                      Street Address *
                    </Label>
                    <textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Complete street address"
                      rows={2}
                      className={`flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.address ? "border-red-500" : ""
                      }`}
                    />
                    {errors.address && <p className="text-xs text-red-400">{errors.address}</p>}
                  </div>
                  <div>
                    <Label htmlFor="pincode" className="text-sm font-medium text-zinc-300">
                      Pincode *
                    </Label>
                    <Input
                      id="pincode"
                      type="text"
                      placeholder="e.g. 600001"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange("pincode", e.target.value)}
                      className={`h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.pincode ? "border-red-500" : ""
                      }`}
                    />
                    {errors.pincode && <p className="text-xs text-red-400">{errors.pincode}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacityMin" className="text-sm font-medium text-zinc-300">
                      Min Capacity *
                    </Label>
                    <Input
                      id="capacityMin"
                      type="number"
                      placeholder="e.g. 50"
                      value={formData.capacityMin}
                      onChange={(e) => handleInputChange("capacityMin", e.target.value)}
                      className={`h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.capacityMin ? "border-red-500" : ""
                      }`}
                    />
                    {errors.capacityMin && <p className="text-xs text-red-400">{errors.capacityMin}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacityMax" className="text-sm font-medium text-zinc-300">
                      Max Capacity *
                    </Label>
                    <Input
                      id="capacityMax"
                      type="number"
                      placeholder="e.g. 500"
                      value={formData.capacityMax}
                      onChange={(e) => handleInputChange("capacityMax", e.target.value)}
                      className={`h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                        errors.capacityMax ? "border-red-500" : ""
                      }`}
                    />
                    {errors.capacityMax && <p className="text-xs text-red-400">{errors.capacityMax}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="basePriceMorning" className="text-sm font-medium text-zinc-300">
                      Morning Price (₹)
                    </Label>
                    <Input
                      id="basePriceMorning"
                      type="number"
                      placeholder="e.g. 25000"
                      value={formData.basePriceMorning}
                      onChange={(e) => handleInputChange("basePriceMorning", e.target.value)}
                      className="h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basePriceEvening" className="text-sm font-medium text-zinc-300">
                      Evening Price (₹)
                    </Label>
                    <Input
                      id="basePriceEvening"
                      type="number"
                      placeholder="e.g. 40000"
                      value={formData.basePriceEvening}
                      onChange={(e) => handleInputChange("basePriceEvening", e.target.value)}
                      className="h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basePriceFullDay" className="text-sm font-medium text-zinc-300">
                      Full Day Price (₹)
                    </Label>
                    <Input
                      id="basePriceFullDay"
                      type="number"
                      placeholder="e.g. 60000"
                      value={formData.basePriceFullDay}
                      onChange={(e) => handleInputChange("basePriceFullDay", e.target.value)}
                      className="h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 bg-zinc-800 text-white hover:bg-zinc-700 transition-all duration-300"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-12 text-base font-semibold text-zinc-100 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-600 rounded-lg hover:from-zinc-600 hover:to-zinc-800 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-[0.99]"
                    onClick={handleNextStep}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Continue to Contact"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-zinc-300">
                    Phone Number *
                  </Label>
                  <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                      <Input
                        id="phone"
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => {
                          handleInputChange("phone", e.target.value);
                          setIsPhoneVerified(false);
                        }}
                        disabled={isPhoneVerified}
                        className={`pl-10 h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                          errors.phone ? "border-red-500" : ""
                        }`}
                        maxLength={10}
                      />
                    </div>
                    {!isPhoneVerified ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={sendPhoneOTP}
                        disabled={isLoading || formData.phone.length !== 10}
                        className="bg-white/5 border-zinc-800 text-white h-12 shrink-0 px-6"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    ) : (
                      <div className="h-12 px-4 flex items-center justify-center bg-green-500/10 border border-green-500/20 rounded-lg shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      </div>
                    )}
                  </div>
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}

                  {showPhoneOTP && !isPhoneVerified && (
                    <div className="mt-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="phoneOtp" className="text-sm font-medium text-zinc-300">Enter Phone OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="phoneOtp"
                          placeholder="123456"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          maxLength={6}
                          className="h-12 text-center tracking-widest text-lg bg-zinc-950 border-zinc-800 focus:border-zinc-600 text-white"
                        />
                        <Button 
                          type="button" 
                          onClick={verifyPhoneOTP}
                          disabled={isLoading || phoneOtp.length < 4}
                          className="bg-zinc-700 hover:bg-zinc-600 text-white h-12 px-6"
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  )}
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 bg-zinc-800 text-white hover:bg-zinc-700 transition-all duration-300"
                    onClick={() => setStep(3)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-12 text-base font-semibold text-zinc-100 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-600 rounded-lg hover:from-zinc-600 hover:to-zinc-800 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-[0.99]"
                    onClick={handleNextStep}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Continue to Images & KYC"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Images & KYC */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-200">Venue Photos & KYC Required</p>
                      <p className="text-xs text-blue-300/80 mt-0.5">
                        Upload photos of your venue and a valid KYC document for verification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Venue Images Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-300">
                    Venue Photos * (Minimum 1, Maximum 5)
                  </Label>
                  <div className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setIsCompressing(true);
                          const compressedFiles = await Promise.all(files.map(compressImage));
                          setFormData(prev => ({ ...prev, venueImages: [...prev.venueImages, ...compressedFiles].slice(0, 5) }));
                          setIsCompressing(false);
                        }
                      }}
                      className="hidden"
                      id="venue-images-upload"
                    />
                    <label htmlFor="venue-images-upload" className="cursor-pointer text-center">
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
                    {formData.venueImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {formData.venueImages.map((image, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Venue ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  venueImages: prev.venueImages.filter((_, i) => i !== index)
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
                  {errors.venueImages && <p className="text-xs text-red-400">{errors.venueImages}</p>}
                </div>

                {/* KYC Document Type */}
                <div className="space-y-2">
                  <Label htmlFor="kycDocType" className="text-sm font-medium text-zinc-300">
                    KYC Document Type *
                  </Label>
                  <select
                    id="kycDocType"
                    value={formData.kycDocType}
                    onChange={(e) => handleInputChange("kycDocType", e.target.value)}
                    className={`flex h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                      errors.kycDocType ? "border-red-500" : ""
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
                <div className="space-y-2">
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
                    className={`h-12 bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all ${
                      errors.kycDocNumber ? "border-red-500" : ""
                    }`}
                  />
                  {errors.kycDocNumber && <p className="text-xs text-red-400">{errors.kycDocNumber}</p>}
                </div>

                {/* KYC Document Files Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-300">
                    KYC Document Images * (Minimum 1, Maximum 5 - Clear images of {formData.kycDocType === "AADHAAR" ? "Aadhar" : formData.kycDocType === "PAN" ? "PAN" : formData.kycDocType === "PASSPORT" ? "Passport" : "Driving License"})
                  </Label>
                  <div className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors">
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
                    <label htmlFor="kyc-doc-upload" className="cursor-pointer text-center">
                      <div className="flex flex-col items-center">
                        {isCompressing ? (
                          <Loader2 className="w-10 h-10 text-zinc-500 mb-2 animate-spin" />
                        ) : (
                          <svg className="w-10 h-10 text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <p className="text-sm text-zinc-400">
                          <span className="font-semibold text-white">{isCompressing ? "Processing documents..." : "Click to upload KYC images"}</span> or drag and drop
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">PNG, JPG, PDF up to 5MB each (1-5 images)</p>
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

                {/* Venue Government Certificate (Trade License) */}
                <div className="space-y-2 mt-6 p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Label className="text-sm font-medium text-amber-300">
                    Original Venue Government Certification * (Trade License / Registration)
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
                          setFormData(prev => ({ ...prev, venueGovtCertificateFiles: [...prev.venueGovtCertificateFiles, ...compressedFiles].slice(0, 5) }));
                          setIsCompressing(false);
                        }
                      }}
                      className="hidden"
                      id="venue-govt-cert-upload"
                    />
                    <label htmlFor="venue-govt-cert-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        {isCompressing ? (
                          <Loader2 className="w-10 h-10 text-amber-500 mb-2 animate-spin" />
                        ) : (
                          <svg className="w-10 h-10 text-amber-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <p className="text-sm text-amber-300/80">
                          <span className="font-semibold text-amber-400">{isCompressing ? "Processing..." : "Click to upload Trade License"}</span> or drag and drop
                        </p>
                        <p className="text-xs text-amber-500/60 mt-1">PNG, JPG, PDF up to 5MB each</p>
                      </div>
                    </label>
                    {formData.venueGovtCertificateFiles.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {formData.venueGovtCertificateFiles.map((file, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-amber-500/30">
                            {file.type === "application/pdf" ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800">
                                <FileText className="w-8 h-8 text-amber-400 mb-1" />
                                <span className="text-[10px] text-amber-300/80 text-center px-1 truncate w-full">{file.name}</span>
                              </div>
                            ) : (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Govt Cert ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  venueGovtCertificateFiles: prev.venueGovtCertificateFiles.filter((_, i) => i !== index)
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
                  {errors.venueGovtCertificateFiles && <p className="text-xs text-red-400">{errors.venueGovtCertificateFiles}</p>}
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-zinc-100 focus:ring-zinc-600 focus:ring-offset-zinc-950"
                      />
                    </div>
                    <Label htmlFor="terms" className="text-sm text-zinc-400 leading-snug cursor-pointer">
                      I agree to the <Link href="/terms" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-white transition-colors">DPDP Privacy Policy</Link>.
                    </Label>
                  </div>
                  {errors.terms && <p className="text-xs text-red-400 mb-4">{errors.terms}</p>}
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-12 bg-zinc-800 text-white hover:bg-zinc-700 transition-all duration-300"
                      onClick={() => setStep(4)}
                      disabled={isLoading || isCompressing}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      className="flex-1 h-12 text-base font-semibold text-zinc-100 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-zinc-600 rounded-lg hover:from-zinc-600 hover:to-zinc-800 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-[0.99]"
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
      </div>
    </div>
  );
}
