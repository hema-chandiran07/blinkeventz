"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Store, Mail, Phone, MapPin, DollarSign, Edit2, Save, X, CheckCircle2,
  Upload, Utensils, Palette, Camera, Film, Scissors, Music, Cake,
  ClipboardList, Car, MoreHorizontal, RefreshCw, Loader2, AlertCircle, Clock, XCircle,
  Plus, Image
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { getImageUrl } from "@/lib/utils";

// ==================== Types ====================
interface VendorProfile {
  id?: number;
  userId?: number;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  description: string;
  serviceCategory: string;
  city: string;
  area: string;
  serviceRadiusKm: number;
  basePrice: number;
  pricingModel: "PER_EVENT" | "PER_PERSON" | "PER_DAY" | "PACKAGE";
  experience?: number;
  verified: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "NOT_SUBMITTED";
  createdAt?: string;
  updatedAt?: string;
  businessImages?: string[];
}

// ==================== Constants ====================
const SERVICE_CATEGORIES = [
  { value: "CATERING", label: "Catering", icon: Utensils },
  { value: "DECOR", label: "Decoration", icon: Palette },
  { value: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { value: "VIDEOGRAPHY", label: "Videography", icon: Film },
  { value: "MAKEUP", label: "Makeup & Hair", icon: Scissors },
  { value: "DJ", label: "DJ & Music", icon: Music },
  { value: "MEHENDI", label: "Mehendi Artist", icon: Palette },
  { value: "BAKERY", label: "Bakery & Desserts", icon: Cake },
  { value: "EVENT_PLANNING", label: "Event Planning", icon: ClipboardList },
  { value: "TRANSPORTATION", label: "Transportation", icon: Car },
  { value: "OTHER", label: "Other", icon: MoreHorizontal }
];

const PRICING_MODELS = [
  { value: "PER_EVENT", label: "Per Event" },
  { value: "PER_PERSON", label: "Per Person" },
  { value: "PER_DAY", label: "Per Day" },
  { value: "PACKAGE", label: "Package" },
];

// ==================== Main Component ====================
export default function VendorProfilePage() {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<VendorProfile | null>(null);

  // Form state with string values for easy editing
  const [formData, setFormData] = useState<VendorProfile>({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    description: "",
    serviceCategory: "",
    city: "",
    area: "",
    serviceRadiusKm: 10,
    basePrice: 0,
    pricingModel: "PER_EVENT",
    experience: 0,
    verified: false,
    verificationStatus: "NOT_SUBMITTED",
    businessImages: [],
  });

  // New images to upload
  const [newImages, setNewImages] = useState<File[]>([]);

  // Separate string state for number fields to allow empty input
  const [experienceStr, setExperienceStr] = useState("");
  const [serviceRadiusStr, setServiceRadiusStr] = useState("10");
  const [basePriceStr, setBasePriceStr] = useState("0");

  // Load vendor profile
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/vendors/me");

      if (response.data) {
        const vendorData = response.data;
        setProfile(vendorData);
        setFormData({
          businessName: vendorData.businessName || "",
          ownerName: vendorData.user?.name || user?.name || "",
          email: vendorData.user?.email || user?.email || "",
          phone: vendorData.phone || "",
          description: vendorData.description || "",
          serviceCategory: vendorData.serviceCategory || "",
          city: vendorData.city || "",
          area: vendorData.area || "",
          serviceRadiusKm: vendorData.serviceRadiusKm || 10,
          basePrice: vendorData.basePrice || 0,
          pricingModel: vendorData.pricingModel || "PER_EVENT",
          experience: vendorData.experience || 0,
          verified: vendorData.verified || false,
          verificationStatus: vendorData.verificationStatus || "NOT_SUBMITTED",
          businessImages: vendorData.businessImages || [],
        });
        // Set string values for number fields
        setExperienceStr(vendorData.experience?.toString() || "");
        setServiceRadiusStr(vendorData.serviceRadiusKm?.toString() || "10");
        setBasePriceStr(vendorData.basePrice?.toString() || "");
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // Profile doesn't exist yet - user needs to create it
        setFormData(prev => ({
          ...prev,
          ownerName: user?.name || "",
          email: user?.email || "",
        }));
      } else {
        console.error("Failed to load profile:", error);
        toast.error("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Validation
  const validateForm = (): boolean => {
    if (!formData.businessName.trim()) {
      toast.error("Business name is required");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid email");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!formData.serviceCategory) {
      toast.error("Please select a service category");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Business description is required");
      return false;
    }
    if (!formData.city || !formData.area) {
      toast.error("Please enter your location");
      return false;
    }
    if (!formData.basePrice || formData.basePrice <= 0) {
      toast.error("Please enter a valid base price");
      return false;
    }
    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Prepare submission data
      const hasNewImages = newImages.length > 0;
      
      if (hasNewImages) {
        // Use FormData for file uploads (/vendors/me)
        const formDataObj = new FormData();
        formDataObj.append("businessName", formData.businessName);
        formDataObj.append("ownerName", formData.ownerName);
        formDataObj.append("email", formData.email);
        formDataObj.append("phone", formData.phone);
        formDataObj.append("description", formData.description);
        formDataObj.append("serviceCategory", formData.serviceCategory);
        formDataObj.append("city", formData.city);
        formDataObj.append("area", formData.area);
        formDataObj.append("serviceRadiusKm", formData.serviceRadiusKm.toString());
        formDataObj.append("basePrice", formData.basePrice.toString());
        formDataObj.append("pricingModel", formData.pricingModel);
        formDataObj.append("experience", (formData.experience || 0).toString());
        
        // Add existing images to keep
        formData.businessImages?.forEach(url => {
          formDataObj.append("businessImages", url);
        });
        
        // Add new image files
        newImages.forEach(file => {
          formDataObj.append("businessImages", file);
        });
        
        await api.patch("/vendors/me", formDataObj, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Use JSON for simple updates (/vendors/me/profile)
        const payload = {
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          description: formData.description,
          serviceCategory: formData.serviceCategory,
          city: formData.city,
          area: formData.area,
          serviceRadiusKm: formData.serviceRadiusKm,
          basePrice: formData.basePrice,
          pricingModel: formData.pricingModel,
          experience: formData.experience,
          businessImages: formData.businessImages, // Send list of existing images to keep
        };
        await api.patch("/vendors/me/profile", payload);
      }

      toast.success("Profile updated successfully!");
      setNewImages([]);

      // Reload profile
      await loadProfile();
      setIsEditing(false);
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast.error(error?.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB for database storage");
      return;
    }

    try {
      setUploadingAvatar(true);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;
        try {
          // Update user profile picture (stored in database as Base64)
          await api.patch('/users/me', { image: base64String });
          toast.success("Profile picture updated!");
          
          // Refresh user in auth context to update avatar across the app
          await refreshUser();
          await loadProfile();
        } catch (error: any) {
          console.error("Failed to update profile picture:", error);
          toast.error("Failed to update profile picture");
        } finally {
          setUploadingAvatar(false);
          if (e.target) e.target.value = '';
        }
      };
      
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setUploadingAvatar(false);
      };
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to process image");
      setUploadingAvatar(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Reset form to loaded profile data
    if (profile) {
      setFormData({
        businessName: profile.businessName || "",
        ownerName: profile.ownerName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        description: profile.description || "",
        serviceCategory: profile.serviceCategory || "",
        city: profile.city || "",
        area: profile.area || "",
        serviceRadiusKm: profile.serviceRadiusKm || 10,
        basePrice: profile.basePrice || 0,
        pricingModel: profile.pricingModel || "PER_EVENT",
        experience: profile.experience || 0,
        verified: profile.verified || false,
        verificationStatus: profile.verificationStatus || "NOT_SUBMITTED",
        businessImages: profile.businessImages || [],
      });
      setExperienceStr(profile.experience?.toString() || "");
      setServiceRadiusStr(profile.serviceRadiusKm?.toString() || "10");
      setBasePriceStr(profile.basePrice?.toString() || "");
    }
    setIsEditing(false);
  };

  // Get verification badge
  const getVerificationBadge = () => {
    switch (formData.verificationStatus) {
      case "VERIFIED":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Verification Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-neutral-600">
            Not Submitted
          </Badge>
        );
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const cat = SERVICE_CATEGORIES.find(c => c.value === category);
    const Icon = cat?.icon || Store;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          {/* Avatar Widget */}
          <div className="relative group">
            <div className="h-24 w-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-neutral-100 flex items-center justify-center relative">
              {uploadingAvatar ? (
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              ) : user?.image ? (
                <img 
                  src={getImageUrl(user.image)} 
                  alt="Profile" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-8 w-8 text-neutral-400" />
              )}
              
              <Label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Update</span>
              </Label>
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-black">Vendor Profile</h1>
            <p className="text-neutral-600">Create and manage your business identity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getVerificationBadge()}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {!profile && !isEditing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Complete Your Profile</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Create your vendor profile to start receiving bookings. Fill in your business details, services, and pricing.
                </p>
                <Button onClick={() => setIsEditing(true)} className="mt-3 gap-2">
                  <Edit2 className="h-4 w-4" />
                  Create Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Business Information</CardTitle>
              <CardDescription>Establish your presence in the marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-black font-medium">
                  Business Name *
                </Label>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Elegant Decor Studio"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-black font-medium">
                  Business Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Describe your services, experience, and what makes you unique..."
                  rows={5}
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 resize-none focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceCategory" className="text-black font-medium">
                    Service Category *
                  </Label>
                  <select
                    id="serviceCategory"
                    value={formData.serviceCategory}
                    onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                  >
                    <option value="">Select category</option>
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-black font-medium">
                    Years of Experience
                  </Label>
                  <Input
                    id="experience"
                    type="number"
                    value={experienceStr}
                    onChange={(e) => {
                      setExperienceStr(e.target.value);
                      setFormData({ ...formData, experience: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 });
                    }}
                    disabled={!isEditing}
                    placeholder="Enter years (e.g., 5)"
                    min="0"
                    max="50"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Contact Information</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName" className="text-black font-medium">
                  Owner Name
                </Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Your full name"
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-black font-medium">
                  Email Address *
                </Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    placeholder="your@email.com"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-black font-medium">
                  Phone Number *
                </Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91 98765 43210"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Photos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-black">Business Photos</CardTitle>
                <CardDescription>Main photos displayed on your profile (Max 5)</CardDescription>
              </div>
              {isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="relative pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                  disabled={((formData.businessImages?.length || 0) + newImages.length) >= 5}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Photo
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Image size must be less than 5MB");
                          return;
                        }
                        setNewImages(prev => [...prev, file]);
                      }
                    }}
                  />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Existing Images */}
                {formData.businessImages?.map((url: string, idx: number) => (
                  <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 group border border-neutral-200">
                    <img src={getImageUrl(url)} alt={`Business ${idx}`} className="w-full h-full object-cover" />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const updated = [...(formData.businessImages || [])];
                          updated.splice(idx, 1);
                          setFormData({ ...formData, businessImages: updated });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                {/* New Images previews */}
                {newImages.map((file, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 border-2 border-blue-500 group">
                    <img src={URL.createObjectURL(file)} alt="New" className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Badge className="bg-blue-600 text-[10px]">NEW</Badge>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const updated = [...newImages];
                          updated.splice(idx, 1);
                          setNewImages(updated);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {((formData.businessImages?.length || 0) + newImages.length) === 0 && (
                  <div className="col-span-full py-8 text-center border-2 border-dashed border-neutral-200 rounded-xl">
                    <Image className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">No photos uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location & Pricing */}
        <div className="space-y-6">
          {/* Service Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Service Location</CardTitle>
              <CardDescription>Where you operate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-black font-medium">
                  City *
                </Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Chennai"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area" className="text-black font-medium">
                  Area *
                </Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g., Adyar, T Nagar"
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceRadius" className="text-black font-medium">
                  Service Radius (km)
                </Label>
                <Input
                  id="serviceRadius"
                  type="number"
                  value={serviceRadiusStr}
                  onChange={(e) => {
                    setServiceRadiusStr(e.target.value);
                    setFormData({ ...formData, serviceRadiusKm: e.target.value === "" ? 10 : parseInt(e.target.value) || 10 });
                  }}
                  disabled={!isEditing}
                  placeholder="Distance in kilometers"
                  min="1"
                  max="100"
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Pricing</CardTitle>
              <CardDescription>Your base pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-black font-medium">
                  Base Price (₹) *
                </Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="basePrice"
                    type="number"
                    value={basePriceStr}
                    onChange={(e) => {
                      setBasePriceStr(e.target.value);
                      setFormData({ ...formData, basePrice: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 });
                    }}
                    disabled={!isEditing}
                    placeholder="Enter amount (e.g., 35000)"
                    min="0"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricingModel" className="text-black font-medium">
                  Pricing Model
                </Label>
                <select
                  id="pricingModel"
                  value={formData.pricingModel}
                  onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value as any })}
                  disabled={!isEditing}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black disabled:bg-neutral-100 disabled:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  {PRICING_MODELS.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    formData.verificationStatus === "VERIFIED" ? "bg-green-500" :
                    formData.verificationStatus === "PENDING" ? "bg-yellow-500" :
                    formData.verificationStatus === "REJECTED" ? "bg-red-500" :
                    "bg-neutral-300"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    formData.verificationStatus === "VERIFIED" ? "text-green-700" :
                    formData.verificationStatus === "PENDING" ? "text-yellow-700" :
                    formData.verificationStatus === "REJECTED" ? "text-red-700" :
                    "text-neutral-700"
                  )}>
                    {formData.verificationStatus === "VERIFIED" ? "Verified" :
                     formData.verificationStatus === "PENDING" ? "Pending Review" :
                     formData.verificationStatus === "REJECTED" ? "Rejected" :
                     "Not Submitted"}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  {formData.verificationStatus === "VERIFIED"
                    ? "Your profile has been verified by our team"
                    : formData.verificationStatus === "PENDING"
                    ? "Our team will verify your profile within 24-48 hours"
                    : formData.verificationStatus === "REJECTED"
                    ? "Please update your profile and resubmit for verification"
                    : "Complete your profile to submit for verification"}
                </p>
                {formData.verified && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified vendor badge displayed on profile</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
