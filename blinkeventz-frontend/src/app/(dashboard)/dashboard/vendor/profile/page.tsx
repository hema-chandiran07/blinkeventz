"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { 
  Store, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Save,
  Edit2,
  Award,
  Star,
  Briefcase,
  TrendingUp,
  Instagram,
  Facebook,
  Twitter,
  User,
  Calendar,
  Users,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

// Mock data for vendor profile
const MOCK_VENDOR_PROFILE = {
  id: "1",
  businessName: "Elite Catering Services",
  name: "Elite Catering",
  description: "Premium catering services for weddings, corporate events, and private parties. Specializing in South Indian, North Indian, Chinese, and Continental cuisines with over 15 years of experience.",
  email: "contact@elitecatering.com",
  phone: "+91 98765 43210",
  address: "123, Anna Salai",
  city: "Chennai",
  area: "T Nagar",
  state: "Tamil Nadu",
  pincode: "600017",
  website: "https://www.elitecatering.com",
  socialLinks: {
    instagram: "elitecatering_chennai",
    facebook: "EliteCateringChennai",
    twitter: "elitecatering"
  },
  businessHours: {
    opening: "09:00",
    closing: "21:00",
    days: "Mon-Sun"
  },
  serviceCategories: ["Catering", "Event Planning", "Venue Styling"],
  primaryCategory: "Catering",
  yearsOfExperience: 15,
  teamSize: 25,
  certifications: ["FSSAI Certified", "ISO 22000:2018", "Best Caterer Chennai 2023"],
  images: [
    "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
    "https://images.unsplash.com/photo-1576867732037-4f808a0cc484?w=800&q=80"
  ],
  logo: "https://images.unsplash.com/photo-1555244162-803834f70033?w=200&q=80",
  bannerImage: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80",
  verificationStatus: "verified" as const,
  rating: 4.8,
  totalReviews: 156,
  totalBookings: 342
};

const SERVICE_CATEGORIES = [
  "Catering",
  "Photography",
  "Videography",
  "Decoration",
  "DJ & Music",
  "Makeup & Hair",
  "Bakery & Sweets",
  "Mehendi Artist",
  "Live Band",
  "Event Planning",
  "Transportation",
  "Venue Styling",
  "Lighting & Sound",
  "Entertainment",
  "Other"
];

interface VendorProfile {
  id: string;
  businessName: string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  state?: string;
  pincode?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  businessHours?: {
    opening: string;
    closing: string;
    days: string;
  };
  serviceCategories?: string[];
  primaryCategory?: string;
  yearsOfExperience?: number;
  teamSize?: number;
  certifications?: string[];
  images?: string[];
  logo?: string;
  bannerImage?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  rating?: number;
  totalReviews?: number;
  totalBookings?: number;
}

export default function VendorProfilePage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<VendorProfile>({
    id: "",
    businessName: "",
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    area: "",
    state: "",
    pincode: "",
    website: "",
    socialLinks: { instagram: "", facebook: "", twitter: "" },
    businessHours: { opening: "09:00", closing: "18:00", days: "Mon-Sat" },
    serviceCategories: [],
    primaryCategory: "",
    yearsOfExperience: 0,
    teamSize: 0,
    certifications: [],
    images: [],
    logo: "",
    bannerImage: "",
    verificationStatus: "pending",
    rating: 0,
    totalReviews: 0,
    totalBookings: 0
  });

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      setVendor(MOCK_VENDOR_PROFILE);
      setFormData(MOCK_VENDOR_PROFILE);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleInputChange = (field: keyof VendorProfile, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (platform: keyof NonNullable<VendorProfile["socialLinks"]>, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value }
    }));
  };

  const handleBusinessHoursChange = (field: keyof NonNullable<VendorProfile["businessHours"]>, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessHours: { ...(prev.businessHours || { opening: "09:00", closing: "18:00", days: "Mon-Sat" }), [field]: value }
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => {
      const categories = prev.serviceCategories || [];
      if (categories.includes(category)) {
        return { ...prev, serviceCategories: categories.filter(c => c !== category) };
      }
      return { ...prev, serviceCategories: [...categories, category] };
    });
  };

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsEditing(false);
      setVendor(formData);
      toast.success("Profile updated successfully!", {
        description: "Your business profile has been updated and is pending review."
      });
    }, 1000);
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  const stats = [
    { label: "Total Bookings", value: vendor?.totalBookings || 0, icon: Briefcase, color: "text-blue-500" },
    { label: "Average Rating", value: vendor?.rating?.toFixed(1) || "—", icon: Star, color: "text-yellow-500" },
    { label: "Total Reviews", value: vendor?.totalReviews || 0, icon: TrendingUp, color: "text-green-500" },
    { label: "Years Experience", value: vendor?.yearsOfExperience ? `${vendor.yearsOfExperience}+ yrs` : "—", icon: Award, color: "text-purple-500" }
  ];

  if (isLoading && !vendor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Vendor Profile</h1>
            {vendor && getVerificationBadge(vendor.verificationStatus)}
          </div>
          <p className="text-gray-500">Manage your business information and showcase your services</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                if (vendor) {
                  setFormData(vendor);
                }
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-gray-50 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner & Logo Section */}
      <Card className="overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-pink-500 to-purple-600">
          {vendor?.bannerImage && (
            <Image
              src={vendor.bannerImage}
              alt="Banner"
              fill
              className="object-cover"
            />
          )}
          {isEditing && (
            <button
              onClick={() => toast.info("Image upload coming soon")}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="text-white flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <span>Change Banner</span>
              </div>
            </button>
          )}
        </div>
        <div className="relative px-6 -mt-16">
          <div className="flex items-end justify-between">
            <div className="relative">
              <div className="h-32 w-32 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
                {vendor?.logo ? (
                  <Image
                    src={vendor.logo}
                    alt={vendor.businessName}
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Store className="h-16 w-16 text-white" />
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => toast.info("Image upload coming soon")}
                  className="absolute -bottom-2 -right-2 p-2 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{vendor?.businessName || "Your Business"}</h2>
                {vendor?.primaryCategory && (
                  <Badge variant="secondary">{vendor.primaryCategory}</Badge>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {vendor?.area && vendor?.city ? `${vendor.area}, ${vendor.city}` : vendor?.city || "Location not set"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Business Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-600" />
                Basic Information
              </CardTitle>
              <CardDescription>Essential details about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Short name for display"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Describe your services, expertise, and what makes you unique..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.yearsOfExperience || 0}
                    onChange={(e) => handleInputChange("yearsOfExperience", parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    value={formData.teamSize || 0}
                    onChange={(e) => handleInputChange("teamSize", parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryCategory">Primary Category</Label>
                  <select
                    id="primaryCategory"
                    value={formData.primaryCategory}
                    onChange={(e) => handleInputChange("primaryCategory", e.target.value)}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-full border border-purple-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="">Select category</option>
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                Service Categories
              </CardTitle>
              <CardDescription>Select all categories that apply to your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((category) => {
                  const isSelected = formData.serviceCategories?.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => isEditing && handleCategoryToggle(category)}
                      disabled={!isEditing}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } ${!isEditing ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Location & Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                Location & Address
              </CardTitle>
              <CardDescription>Where your business is located</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  disabled={!isEditing}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Chennai"
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area / Locality</Label>
                  <Input
                    id="area"
                    value={formData.area || ""}
                    onChange={(e) => handleInputChange("area", e.target.value)}
                    disabled={!isEditing}
                    placeholder="T Nagar"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ""}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tamil Nadu"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode || ""}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  disabled={!isEditing}
                  placeholder="600001"
                  maxLength={6}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Contact & Additional Info */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                Contact Information
              </CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={!isEditing}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={!isEditing}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Media Links</CardTitle>
              <CardDescription>Connect with your audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={formData.socialLinks?.instagram || ""}
                  onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                  disabled={!isEditing}
                  placeholder="@yourhandle"
                />
              </div>
              <div>
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={formData.socialLinks?.facebook || ""}
                  onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Your page URL"
                />
              </div>
              <div>
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-blue-400" />
                  Twitter / X
                </Label>
                <Input
                  id="twitter"
                  value={formData.socialLinks?.twitter || ""}
                  onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                  disabled={!isEditing}
                  placeholder="@yourhandle"
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-purple-600" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="days">Working Days</Label>
                <Input
                  id="days"
                  value={formData.businessHours?.days || ""}
                  onChange={(e) => handleBusinessHoursChange("days", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Mon-Sat"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opening">Opening Time</Label>
                  <Input
                    id="opening"
                    type="time"
                    value={formData.businessHours?.opening || "09:00"}
                    onChange={(e) => handleBusinessHoursChange("opening", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="closing">Closing Time</Label>
                  <Input
                    id="closing"
                    type="time"
                    value={formData.businessHours?.closing || "18:00"}
                    onChange={(e) => handleBusinessHoursChange("closing", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5 text-purple-600" />
                Certifications
              </CardTitle>
              <CardDescription>Add any professional certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Add certification"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        handleInputChange("certifications", [...(formData.certifications || []), e.currentTarget.value.trim()]);
                        e.currentTarget.value = "";
                      }
                    }}
                    disabled={!isEditing}
                  />
                  <p className="text-xs text-gray-500">Press Enter to add</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.certifications?.length ? (
                    formData.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary">{cert}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No certifications added</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Actions */}
      {isEditing && (
        <Card className="sticky bottom-4 border-purple-200 bg-gradient-to-r from-pink-50 to-purple-50 shadow-lg">
          <CardFooter className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Make sure all information is accurate before saving
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save All Changes"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
