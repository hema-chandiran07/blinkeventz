"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Building2, Mail, Phone, MapPin, DollarSign, Users, Edit2, Save, X, CheckCircle2, Upload, Image as ImageIcon, Trash2, Hotel, Trees, PartyPopper } from "lucide-react";

const VENUE_TYPES = [
  { value: "HALL", label: "Hall", icon: Building2 },
  { value: "MANDAPAM", label: "Mandapam", icon: Building2 },
  { value: "LAWN", label: "Lawn", icon: Trees },
  { value: "RESORT", label: "Resort", icon: Hotel },
  { value: "BANQUET", label: "Banquet", icon: PartyPopper }
];

const AMENITIES = [
  "WiFi", "Parking", "Valet Parking", "AC", "Catering",
  "AV Equipment", "Stage", "Lighting", "Sound System",
  "Green Room", "Security", "Wheelchair Accessible",
  "Outdoor Space", "Indoor Space", "Generator Backup",
  "Bridal Room", "Kids Play Area", "Dance Floor"
];

export default function VenueDetailsPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    venueName: "",
    ownerName: user?.name || "",
    email: user?.email || "",
    phone: "",
    description: "",
    venueType: "",
    city: "",
    area: "",
    address: "",
    pincode: "",
    capacityMin: "",
    capacityMax: "",
    basePriceMorning: "",
    basePriceEvening: "",
    basePriceFullDay: "",
    selectedAmenities: [] as string[],
    verified: false,
    status: "PENDING_APPROVAL"
  });
  const [images, setImages] = useState<{ url: string; isCover: boolean }[]>([]);

  const handleSave = async () => {
    // Validation
    if (!formData.venueName.trim()) {
      toast.error("Venue name is required");
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
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.venueType) {
      toast.error("Please select a venue type");
      return;
    }
    if (!formData.capacityMax || parseInt(formData.capacityMax) <= 0) {
      toast.error("Please enter a valid capacity");
      return;
    }
    if (!formData.basePriceFullDay || parseInt(formData.basePriceFullDay) <= 0) {
      toast.error("Please enter a valid base price");
      return;
    }
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save venue data
    const venueData = {
      ownerId: user?.id,
      ...formData,
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem("blinkeventz_venue_profile", JSON.stringify(venueData));
    
    toast.success("Venue details saved successfully! Pending admin approval.");
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      isCover: images.length === 0
    }));

    setImages([...images, ...newImages]);
    toast.success(`${files.length} image(s) uploaded`);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const setCoverImage = (index: number) => {
    setImages(images.map((img, i) => ({
      ...img,
      isCover: i === index
    })));
  };

  const toggleAmenity = (amenity: string) => {
    if (formData.selectedAmenities.includes(amenity)) {
      setFormData({ ...formData, selectedAmenities: formData.selectedAmenities.filter(a => a !== amenity) });
    } else {
      setFormData({ ...formData, selectedAmenities: [...formData.selectedAmenities, amenity] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venue Details</h1>
          <p className="text-gray-500">Manage your venue information and availability</p>
        </div>
        <div className="flex gap-2">
          {formData.status === "ACTIVE" && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
          {formData.status === "PENDING_APPROVAL" && (
            <Badge className="bg-yellow-100 text-yellow-700">
              Pending Approval
            </Badge>
          )}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Details
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
              <CardTitle>Venue Information</CardTitle>
              <CardDescription>Basic details about your venue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venueName">Venue Name *</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <Input
                    id="venueName"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Grand Ballroom Convention Center"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Venue Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Describe your venue's unique features, ambiance, and capacity..."
                  rows={5}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venueType">Venue Type *</Label>
                  <select
                    id="venueType"
                    value={formData.venueType}
                    onChange={(e) => setFormData({ ...formData, venueType: e.target.value })}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select type</option>
                    {VENUE_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacityMax">Maximum Capacity *</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <Input
                      id="capacityMax"
                      type="number"
                      value={formData.capacityMax}
                      onChange={(e) => setFormData({ ...formData, capacityMax: e.target.value })}
                      disabled={!isEditing}
                      placeholder="2000"
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label>Upload Images *</Label>
                  <div className="border-2 border-dashed border-purple-200 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
                       onClick={() => fileInputRef.current?.click()}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <ImageIcon className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">Click to upload images</p>
                    <p className="text-sm text-gray-500">Supports: JPG, PNG, WebP</p>
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Images ({images.length})</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {images.map((image, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img
                          src={image.url}
                          alt={`Venue ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {image.isCover && (
                          <Badge className="absolute top-2 left-2 bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Cover
                          </Badge>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCoverImage(index)}
                            className="h-8 px-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeImage(index)}
                            className="h-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((amenity) => (
                    <button
                      key={amenity}
                      onClick={() => isEditing && toggleAmenity(amenity)}
                      disabled={!isEditing}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        formData.selectedAmenities.includes(amenity)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } ${!isEditing ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Configuration</CardTitle>
              <CardDescription>Set prices for different time slots</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePriceMorning">Morning (6 AM - 12 PM)</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <Input
                      id="basePriceMorning"
                      type="number"
                      value={formData.basePriceMorning}
                      onChange={(e) => setFormData({ ...formData, basePriceMorning: e.target.value })}
                      disabled={!isEditing}
                      placeholder="90000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePriceEvening">Evening (4 PM - 10 PM)</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <Input
                      id="basePriceEvening"
                      type="number"
                      value={formData.basePriceEvening}
                      onChange={(e) => setFormData({ ...formData, basePriceEvening: e.target.value })}
                      disabled={!isEditing}
                      placeholder="120000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePriceFullDay">Full Day (6 AM - 12 AM) *</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <Input
                      id="basePriceFullDay"
                      type="number"
                      value={formData.basePriceFullDay}
                      onChange={(e) => setFormData({ ...formData, basePriceFullDay: e.target.value })}
                      disabled={!isEditing}
                      placeholder="150000"
                    />
                  </div>
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
                  <Mail className="h-4 w-4 text-gray-400" />
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
                  <Phone className="h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location & Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>Venue address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area *</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Your venue metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">4.8</p>
                <p className="text-sm text-gray-500">Average Rating</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">24</p>
                <p className="text-sm text-gray-500">Total Bookings</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">₹42.5L</p>
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
