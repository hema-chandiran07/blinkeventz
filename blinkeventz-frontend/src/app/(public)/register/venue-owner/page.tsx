"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Loader2, ArrowLeft, CheckCircle2, Building2, Upload, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SignupStep = "account" | "property" | "documents" | "complete";

interface FormData {
  // Account Details
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  
  // Property Details
  venueName: string;
  venueType: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: string;
  capacityMax: string;
  basePriceMorning: string;
  basePriceEvening: string;
  basePriceFullDay: string;
  description: string;
  amenities: string;
  
  // Documents
  panNumber: string;
  gstNumber: string;
  ownershipProofFile: File | null;
  fireSafetyFile: File | null;
  licenseFile: File | null;
}

const VENUE_TYPES = [
  { id: "HALL", label: "Banquet Hall" },
  { id: "MANDAPAM", label: "Mandapam" },
  { id: "LAWN", label: "Open Lawn" },
  { id: "RESORT", label: "Resort" },
  { id: "BANQUET", label: "Banquet" },
];

const AMENITIES = [
  "AC", "Non-AC", "Parking", "Catering", "Decoration", 
  "Sound System", "Projector", "Stage", "Green Room", 
  "Power Backup", "Security", "Wheelchair Access",
  "Valet Parking", "Outdoor Space", "In-house Catering"
];

export default function VenueOwnerRegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [currentStep, setCurrentStep] = useState<SignupStep>("account");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    // Account Details
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    
    // Property Details
    venueName: "",
    venueType: "HALL",
    address: "",
    city: "",
    area: "",
    pincode: "",
    capacityMin: "",
    capacityMax: "",
    basePriceMorning: "",
    basePriceEvening: "",
    basePriceFullDay: "",
    description: "",
    amenities: "",
    
    // Documents
    panNumber: "",
    gstNumber: "",
    ownershipProofFile: null,
    fireSafetyFile: null,
    licenseFile: null,
  });

  const ownershipInputRef = useRef<HTMLInputElement>(null);
  const fireSafetyInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { id: "account", label: "Account", icon: UserIcon },
    { id: "property", label: "Property", icon: Building2 },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "complete", label: "Complete", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const validateAccountStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Minimum 6 characters";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) newErrors.phone = "Invalid 10-digit mobile number";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePropertyStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.venueName.trim()) newErrors.venueName = "Venue name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.area.trim()) newErrors.area = "Area is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(formData.pincode.replace(/\s/g, ""))) newErrors.pincode = "Invalid 6-digit pincode";
    if (!formData.capacityMin || !formData.capacityMax) {
      newErrors.capacity = "Capacity range is required";
    }
    if (!formData.basePriceFullDay) newErrors.basePriceFullDay = "Base price is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDocumentsStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.panNumber.trim()) newErrors.panNumber = "PAN number is required";
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) newErrors.panNumber = "Invalid PAN format";
    if (!formData.ownershipProofFile) newErrors.ownershipProofFile = "Ownership proof required";
    if (!formData.fireSafetyFile) newErrors.fireSafetyFile = "Fire safety certificate required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === "account" && validateAccountStep()) {
      setCurrentStep("property");
    } else if (currentStep === "property" && validatePropertyStep()) {
      setCurrentStep("documents");
    } else if (currentStep === "documents" && validateDocumentsStep()) {
      setCurrentStep("complete");
    }
  };

  const handleBack = () => {
    if (currentStep === "property") setCurrentStep("account");
    else if (currentStep === "documents") setCurrentStep("property");
    else if (currentStep === "complete") setCurrentStep("documents");
  };

  const handleRegister = async () => {
    setIsLoading(true);

    try {
      // Step 1: Create user account
      await register(formData.name, formData.email, formData.password, "VENUE_OWNER");
      toast.success("Venue Owner registration successful!", {
        description: "Account created. You can now add your venue details in the dashboard."
      });
      // Redirect to venue dashboard to complete profile
      router.push("/dashboard/venue/details?setup=true");
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || "Registration failed";
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (field: keyof FormData, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 5MB" });
      return;
    }
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const renderFileUpload = (
    label: string,
    file: File | null,
    onChange: (file: File | null) => void,
    accept: string,
    error?: string
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-neutral-700">{label}</Label>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          file 
            ? 'border-green-300 bg-green-50' 
            : error 
              ? 'border-red-300 bg-red-50 hover:border-red-400' 
              : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-red-600" />
            </button>
          </div>
        ) : (
          <div>
            <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600">Click to upload {label}</p>
            <p className="text-xs text-neutral-500">PNG, JPG, PDF up to 5MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-emerald-50 via-white to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link href="/register" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to role selection
        </Link>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-emerald-600' : isCompleted ? 'text-green-600' : 'text-neutral-400'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-emerald-600 bg-emerald-600 text-white' :
                      isCompleted ? 'border-green-600 bg-green-600 text-white' :
                      'border-neutral-300 bg-white'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-neutral-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-4">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-emerald-50 items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-black">
              {currentStep === "account" && "Create Venue Owner Account"}
              {currentStep === "property" && "Property Details"}
              {currentStep === "documents" && "Upload Documents"}
              {currentStep === "complete" && "Review & Submit"}
            </CardTitle>
            <CardDescription className="text-neutral-600">
              {currentStep === "account" && "Start listing your venue on BlinkEventz"}
              {currentStep === "property" && "Tell us about your venue"}
              {currentStep === "documents" && "Upload required documents for verification"}
              {currentStep === "complete" && "Review your information before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Account Details */}
            {currentStep === "account" && (
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-neutral-700">Full Name *</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`pl-10 h-12 ${errors.name ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-700">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`pl-10 h-12 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-neutral-700">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={10}
                    className={`h-12 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-neutral-700">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`pl-10 pr-10 h-12 ${errors.password ? 'border-red-500' : ''}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`pl-10 pr-10 h-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <Button type="submit" variant="premium" className="w-full h-12">
                  Next: Property Details
                </Button>
              </form>
            )}

            {/* Step 2: Property Details */}
            {currentStep === "property" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="venueName" className="text-sm font-medium text-neutral-700">Venue Name *</Label>
                  <Input
                    id="venueName"
                    placeholder="e.g., Grand Ballroom Convention Center"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    className={`h-12 ${errors.venueName ? 'border-red-500' : ''}`}
                  />
                  {errors.venueName && <p className="text-xs text-red-500">{errors.venueName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venueType" className="text-sm font-medium text-neutral-700">Venue Type *</Label>
                  <select
                    id="venueType"
                    value={formData.venueType}
                    onChange={(e) => setFormData({ ...formData, venueType: e.target.value })}
                    className="flex h-12 w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-sm"
                  >
                    {VENUE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-neutral-700">Complete Address *</Label>
                  <textarea
                    id="address"
                    rows={3}
                    placeholder="Street address, landmark..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.address ? 'border-red-500' : 'border-neutral-200'}`}
                  />
                  {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-neutral-700">City *</Label>
                    <Input
                      id="city"
                      placeholder="Chennai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`h-12 ${errors.city ? 'border-red-500' : ''}`}
                    />
                    {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area" className="text-sm font-medium text-neutral-700">Area *</Label>
                    <Input
                      id="area"
                      placeholder="T Nagar"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className={`h-12 ${errors.area ? 'border-red-500' : ''}`}
                    />
                    {errors.area && <p className="text-xs text-red-500">{errors.area}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-sm font-medium text-neutral-700">Pincode *</Label>
                    <Input
                      id="pincode"
                      placeholder="600017"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '')})}
                      maxLength={6}
                      className={`h-12 ${errors.pincode ? 'border-red-500' : ''}`}
                    />
                    {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacityMin" className="text-sm font-medium text-neutral-700">Min Capacity *</Label>
                    <Input
                      id="capacityMin"
                      type="number"
                      placeholder="100"
                      value={formData.capacityMin}
                      onChange={(e) => setFormData({ ...formData, capacityMin: e.target.value })}
                      className={`h-12 ${errors.capacity ? 'border-red-500' : ''}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacityMax" className="text-sm font-medium text-neutral-700">Max Capacity *</Label>
                    <Input
                      id="capacityMax"
                      type="number"
                      placeholder="2000"
                      value={formData.capacityMax}
                      onChange={(e) => setFormData({ ...formData, capacityMax: e.target.value })}
                      className={`h-12 ${errors.capacity ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.capacity && <p className="text-xs text-red-500 col-span-2">{errors.capacity}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700">Base Pricing (₹)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="morning" className="text-xs text-neutral-600">Morning</Label>
                      <Input
                        id="morning"
                        type="number"
                        placeholder="50000"
                        value={formData.basePriceMorning}
                        onChange={(e) => setFormData({ ...formData, basePriceMorning: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="evening" className="text-xs text-neutral-600">Evening</Label>
                      <Input
                        id="evening"
                        type="number"
                        placeholder="100000"
                        value={formData.basePriceEvening}
                        onChange={(e) => setFormData({ ...formData, basePriceEvening: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullDay" className="text-xs text-neutral-600">Full Day *</Label>
                      <Input
                        id="fullDay"
                        type="number"
                        placeholder="150000"
                        value={formData.basePriceFullDay}
                        onChange={(e) => setFormData({ ...formData, basePriceFullDay: e.target.value })}
                        className={`h-10 ${errors.basePriceFullDay ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>
                  {errors.basePriceFullDay && <p className="text-xs text-red-500">{errors.basePriceFullDay}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-neutral-700">Venue Description</Label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Describe your venue's unique features..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-700">Amenities</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {AMENITIES.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                          selectedAmenities.includes(amenity)
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-12">Back</Button>
                  <Button type="button" variant="premium" onClick={handleNext} className="flex-1 h-12">Next: Documents</Button>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === "documents" && (
              <div className="space-y-5">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">Required Documents</p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• PAN Card of Owner/Company (Mandatory)</li>
                    <li>• Property Ownership Proof (Mandatory)</li>
                    <li>• Fire Safety Certificate (Mandatory)</li>
                    <li>• Business License/Trade License</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panNumber" className="text-sm font-medium text-neutral-700">PAN Number *</Label>
                  <Input
                    id="panNumber"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    maxLength={10}
                    className={`h-12 uppercase ${errors.panNumber ? 'border-red-500' : ''}`}
                  />
                  {errors.panNumber && <p className="text-xs text-red-500">{errors.panNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="text-sm font-medium text-neutral-700">GST Number (Optional)</Label>
                  <Input
                    id="gstNumber"
                    placeholder="33ABCDE1234F1Z5"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    maxLength={15}
                    className="h-12 uppercase"
                  />
                </div>

                {renderFileUpload(
                  "Ownership Proof (Sale Deed/Lease)",
                  formData.ownershipProofFile,
                  (file) => handleFileUpload("ownershipProofFile", file),
                  "image/*,.pdf",
                  errors.ownershipProofFile
                )}

                {renderFileUpload(
                  "Fire Safety Certificate",
                  formData.fireSafetyFile,
                  (file) => handleFileUpload("fireSafetyFile", file),
                  "image/*,.pdf",
                  errors.fireSafetyFile
                )}

                {renderFileUpload(
                  "Business/Trade License",
                  formData.licenseFile,
                  (file) => handleFileUpload("licenseFile", file),
                  "image/*,.pdf"
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-12">Back</Button>
                  <Button type="button" variant="premium" onClick={handleNext} className="flex-1 h-12">Next: Review</Button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === "complete" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-black mb-2">Account Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-neutral-600">Name:</span> <span className="font-medium">{formData.name}</span></div>
                      <div><span className="text-neutral-600">Email:</span> <span className="font-medium">{formData.email}</span></div>
                      <div><span className="text-neutral-600">Phone:</span> <span className="font-medium">{formData.phone}</span></div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-black mb-2">Property Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-neutral-600">Venue:</span> <span className="font-medium">{formData.venueName}</span></div>
                      <div><span className="text-neutral-600">Type:</span> <span className="font-medium">{formData.venueType}</span></div>
                      <div><span className="text-neutral-600">Location:</span> <span className="font-medium">{formData.area}, {formData.city}</span></div>
                      <div><span className="text-neutral-600">Capacity:</span> <span className="font-medium">{formData.capacityMin}-{formData.capacityMax}</span></div>
                      <div><span className="text-neutral-600">Base Price:</span> <span className="font-medium">₹{parseInt(formData.basePriceFullDay).toLocaleString()}</span></div>
                      <div><span className="text-neutral-600">PAN:</span> <span className="font-medium">{formData.panNumber}</span></div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-black mb-2">Uploaded Documents</h4>
                    <div className="space-y-2 text-sm">
                      {formData.ownershipProofFile && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Ownership Proof: {formData.ownershipProofFile.name}</span>
                        </div>
                      )}
                      {formData.fireSafetyFile && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Fire Safety: {formData.fireSafetyFile.name}</span>
                        </div>
                      )}
                      {formData.licenseFile && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>License: {formData.licenseFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{errors.submit}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-12">Back</Button>
                  <Button 
                    type="button" 
                    variant="premium" 
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="flex-1 h-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Registration"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 text-center border-t pt-6">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Your venue will be verified within 24-48 hours</span>
            </div>
            <div className="text-xs text-neutral-500">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-neutral-900">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline hover:text-neutral-900">Privacy Policy</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
