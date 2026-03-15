"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Store, Mail, Phone, MapPin, DollarSign, Edit2, Save, X, CheckCircle2, Upload, Utensils, Palette, Camera, Film, Scissors, Music, Cake, ClipboardList, Car, MoreHorizontal } from "lucide-react";

const SERVICE_CATEGORIES = [
  { value: "CATERING", label: "Catering", icon: Utensils },
  { value: "DECOR", label: "Decoration", icon: Palette },
  { value: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { value: "VIDEGRAPHY", label: "Videography", icon: Film },
  { value: "MAKEUP", label: "Makeup & Hair", icon: Scissors },
  { value: "DJ", label: "DJ & Music", icon: Music },
  { value: "MEHENDI", label: "Mehendi Artist", icon: Palette },
  { value: "BAKERY", label: "Bakery & Desserts", icon: Cake },
  { value: "EVENT_PLANNING", label: "Event Planning", icon: ClipboardList },
  { value: "TRANSPORTATION", label: "Transportation", icon: Car },
  { value: "OTHER", label: "Other", icon: MoreHorizontal }
];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: user?.name || "",
    email: user?.email || "",
    phone: "",
    description: "",
    serviceCategory: "",
    city: "",
    area: "",
    serviceRadiusKm: "10",
    basePrice: "",
    pricingModel: "PER_EVENT",
    experience: "",
    verified: false,
    verificationStatus: "PENDING"
  });

  const handleSave = async () => {
    // Validation
    if (!formData.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!formData.serviceCategory) {
      toast.error("Please select a service category");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Business description is required");
      return;
    }
    if (!formData.city || !formData.area) {
      toast.error("Please enter your location");
      return;
    }

    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Save to localStorage (in real app, this would be an API call)
    const vendorProfile = {
      userId: user?.id,
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem("NearZro_vendor_profile", JSON.stringify(vendorProfile));
    
    toast.success("Profile saved successfully!");
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form logic here if needed
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Vendor Profile</h1>
          <p className="text-neutral-600">Create and manage your business identity</p>
        </div>
        <div className="flex gap-2">
          {formData.verified && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          {!formData.verified && formData.verificationStatus === "PENDING" && (
            <Badge className="bg-yellow-100 text-yellow-700">
              Pending Verification
            </Badge>
          )}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleSave} 
                className="bg-green-600 hover:bg-green-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Establish your presence in the marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-silver-300" />
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Elegant Decor Studio"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Describe your services, experience, and what makes you unique..."
                  rows={5}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceCategory">Service Category *</Label>
                  <select
                    id="serviceCategory"
                    value={formData.serviceCategory}
                    onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    disabled={!isEditing}
                    placeholder="5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-silver-300" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-silver-300" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location & Pricing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Location</CardTitle>
              <CardDescription>Where you operate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-silver-300" />
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Chennai"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area *</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g., Adyar, T Nagar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceRadius">Service Radius (km)</Label>
                <Input
                  id="serviceRadius"
                  type="number"
                  value={formData.serviceRadiusKm}
                  onChange={(e) => setFormData({ ...formData, serviceRadiusKm: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Your base pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (₹)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-silver-300" />
                  <Input
                    id="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    disabled={!isEditing}
                    placeholder="35000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model</Label>
                <select
                  id="pricingModel"
                  value={formData.pricingModel}
                  onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value })}
                  disabled={!isEditing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PER_EVENT">Per Event</option>
                  <option value="PER_PERSON">Per Person</option>
                  <option value="PER_DAY">Per Day</option>
                  <option value="PACKAGE">Package</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    formData.verificationStatus === "VERIFIED" ? "bg-green-500" :
                    formData.verificationStatus === "PENDING" ? "bg-yellow-500" :
                    "bg-red-500"
                  }`} />
                  <span className="text-sm font-medium">
                    {formData.verificationStatus === "VERIFIED" ? "Verified" :
                     formData.verificationStatus === "PENDING" ? "Pending Review" :
                     "Not Submitted"}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Our team will verify your profile within 24-48 hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
