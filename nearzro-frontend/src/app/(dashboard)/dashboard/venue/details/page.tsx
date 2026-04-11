"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building, Calendar, DollarSign, Plus, Search, CheckCircle2, Clock, Star,
  MapPin, Edit2, Save, X, Upload, RefreshCw, Loader2, AlertCircle, Image
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Helper to get full image URL (handles both file paths and base64 data URLs)
const getImageUrl = (path: string): string => {
  if (!path) return '';
  // Base64 data URLs from database - use directly
  if (path.startsWith('data:')) return path;
  // External URLs
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Blob URLs for new uploads
  if (path.startsWith('blob:')) return path;
  // File paths - prepend API base URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

// ==================== Types ====================
interface Venue {
  id?: number;
  name: string;
  type: string;
  description: string;
  city: string;
  area: string;
  address: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning: number;
  basePriceEvening: number;
  basePriceFullDay: number;
  images: string[];
  amenities: string[];
  status: "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELISTED";
  verified: boolean;
  ownerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Constants ====================
const VENUE_TYPES = [
  { value: "BANQUET_HALL", label: "Banquet Hall" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "RESORT", label: "Resort" },
  { value: "HOTEL", label: "Hotel" },
  { value: "OPEN_AIR", label: "Open Air" },
  { value: "COMMUNITY_CENTER", label: "Community Center" },
  { value: "FARMHOUSE", label: "Farmhouse" },
  { value: "OTHER", label: "Other" },
];

const AMENITIES_OPTIONS = [
  "Parking", "AC", "WiFi", "Catering", "Decoration", "Sound System",
  "Projector", "Stage", "Green Room", "Valet Parking", "Wheelchair Access",
  "Power Backup", "Security", "Changing Rooms", "Outdoor Space",
];

// ==================== Main Component ====================
export default function VenueDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState<Venue>({
    name: "",
    type: "BANQUET_HALL",
    description: "",
    city: "",
    area: "",
    address: "",
    pincode: "",
    capacityMin: 50,
    capacityMax: 200,
    basePriceMorning: 0,
    basePriceEvening: 0,
    basePriceFullDay: 0,
    images: [],
    amenities: [],
    status: "PENDING_APPROVAL",
    verified: false,
  });

  // Load venues
  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/venues/my");
      const venueList = response.data || [];
      setVenues(venueList);

      // Check if there's a venue ID or 'new' in the URL query params
      const venueId = searchParams?.get('id');
      const isNew = searchParams?.get('new') === 'true';

      console.log('Loading venues, venueList:', venueList);

      if (isNew) {
        // Explicitly adding a new venue - clear selection
        setSelectedVenue(null);
        setFormData({
          name: "",
          type: "BANQUET_HALL",
          description: "",
          city: "",
          area: "",
          address: "",
          pincode: "",
          capacityMin: 50,
          capacityMax: 200,
          basePriceMorning: 0,
          basePriceEvening: 0,
          basePriceFullDay: 0,
          images: [],
          amenities: [],
          status: "PENDING_APPROVAL",
          verified: false,
        });
        setImagePreviews([]);
        setImageFiles([]);
        setIsEditing(true);
      } else if (venueList.length > 0) {
        let venueToSelect: Venue;

        if (venueId) {
          // Find the venue with the matching ID from query params
          venueToSelect = venueList.find((v: any) => v.id === parseInt(venueId)) || venueList[0];
        } else {
          // Default to first venue
          venueToSelect = venueList[0];
        }

        setSelectedVenue(venueToSelect);
        // Parse amenities from backend (could be string or array)
        let parsedAmenities: string[] = [];
        const rawAmenities = (venueToSelect as any).amenities;
        if (rawAmenities) {
          if (Array.isArray(rawAmenities)) {
            parsedAmenities = rawAmenities;
          } else if (typeof rawAmenities === 'string') {
            // Split comma-separated string into array
            parsedAmenities = rawAmenities.split(',').map((a: string) => a.trim()).filter((a: string) => a);
          }
        }
        
        const rawImages = venueToSelect.images || (venueToSelect as any).venueImages || [];
        console.log('=== VENUE DEBUG ===');
        console.log('Raw images from backend:', JSON.stringify(rawImages, null, 2));
        console.log('Full venue data keys:', Object.keys(venueToSelect));
        console.log('===================');

        setFormData({
          name: venueToSelect.name || "",
          type: venueToSelect.type || "BANQUET_HALL",
          description: venueToSelect.description || "",
          city: venueToSelect.city || "",
          area: venueToSelect.area || "",
          address: venueToSelect.address || "",
          pincode: venueToSelect.pincode || "",
          capacityMin: venueToSelect.capacityMin || 50,
          capacityMax: venueToSelect.capacityMax || 200,
          basePriceMorning: venueToSelect.basePriceMorning || 0,
          basePriceEvening: venueToSelect.basePriceEvening || 0,
          basePriceFullDay: venueToSelect.basePriceFullDay || 0,
          images: rawImages,
          amenities: parsedAmenities,
          status: venueToSelect.status || "PENDING_APPROVAL",
          verified: venueToSelect.verified || false,
          ownerId: venueToSelect.ownerId,
          id: venueToSelect.id,
        });
        setImagePreviews(rawImages);
      }
    } catch (error: any) {
      console.error("Failed to load venues:", error);
      if (error?.response?.status !== 404) {
        toast.error("Failed to load venues");
      }
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  // Validation
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Venue name is required");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return false;
    }
    if (!formData.city.trim()) {
      toast.error("City is required");
      return false;
    }
    if (!formData.area.trim()) {
      toast.error("Area is required");
      return false;
    }
    if (!formData.address.trim()) {
      toast.error("Address is required");
      return false;
    }
    if (formData.capacityMin >= formData.capacityMax) {
      toast.error("Minimum capacity must be less than maximum capacity");
      return false;
    }
    if (formData.basePriceEvening <= 0 && formData.basePriceFullDay <= 0) {
      toast.error("At least one price (evening or full day) must be set");
      return false;
    }
    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // If there are new image files, upload them first
      let uploadedImageUrls: string[] = [...(formData.images || [])];

      if (imageFiles.length > 0) {
        const formDataObj = new FormData();
        imageFiles.forEach(file => {
          formDataObj.append('images', file);
        });

        // Upload images to backend
        const uploadResponse = await api.post('/venues/upload-images', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        uploadedImageUrls = [...uploadedImageUrls, ...(uploadResponse.data.urls || [])];
      }

      // Convert amenities array to comma-separated string for backend
      const amenitiesString = Array.isArray(formData.amenities) 
        ? formData.amenities.join(', ') 
        : (formData.amenities || '');

      // Only send fields that the backend DTO accepts
      const venueData: any = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        city: formData.city,
        area: formData.area,
        address: formData.address,
        pincode: formData.pincode,
        capacityMin: formData.capacityMin,
        capacityMax: formData.capacityMax,
        basePriceMorning: formData.basePriceMorning,
        basePriceEvening: formData.basePriceEvening,
        basePriceFullDay: formData.basePriceFullDay,
        amenities: amenitiesString,
      };

      // Add venueImages if we have any
      if (uploadedImageUrls.length > 0) {
        venueData.venueImages = uploadedImageUrls;
      }

      console.log('Saving venue data:', venueData);
      console.log('Image URLs being sent:', uploadedImageUrls);

      if (selectedVenue?.id) {
        // Update existing venue - use /venues/my endpoint (uses JWT, no ID param)
        await api.patch('/venues/my', venueData);
        toast.success("Venue updated successfully!");
      } else {
        // Create new venue
        await api.post("/venues", venueData);
        toast.success("Venue created successfully!");
      }

      await loadVenues();
      setIsEditing(false);
      setImageFiles([]);
    } catch (error: any) {
      console.error("Failed to save venue:", error);
      toast.error(error?.response?.data?.message || "Failed to save venue");
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (selectedVenue) {
      // Parse amenities from backend (could be string or array)
      let parsedAmenities: string[] = [];
      const rawAmenities = (selectedVenue as any).amenities;
      if (rawAmenities) {
        if (Array.isArray(rawAmenities)) {
          parsedAmenities = rawAmenities;
        } else if (typeof rawAmenities === 'string') {
          parsedAmenities = rawAmenities.split(',').map((a: string) => a.trim()).filter((a: string) => a);
        }
      }
      
      setFormData({
        name: selectedVenue.name || "",
        type: selectedVenue.type || "BANQUET_HALL",
        description: selectedVenue.description || "",
        city: selectedVenue.city || "",
        area: selectedVenue.area || "",
        address: selectedVenue.address || "",
        pincode: selectedVenue.pincode || "",
        capacityMin: selectedVenue.capacityMin || 50,
        capacityMax: selectedVenue.capacityMax || 200,
        basePriceMorning: selectedVenue.basePriceMorning || 0,
        basePriceEvening: selectedVenue.basePriceEvening || 0,
        basePriceFullDay: selectedVenue.basePriceFullDay || 0,
        images: selectedVenue.images || (selectedVenue as any).venueImages || [],
        amenities: parsedAmenities,
        status: selectedVenue.status || "PENDING_APPROVAL",
        verified: selectedVenue.verified || false,
        ownerId: selectedVenue.ownerId,
        id: selectedVenue.id,
      });
      setImagePreviews(selectedVenue.images || (selectedVenue as any).venueImages || []);
    }
    setIsEditing(false);
    setImageFiles([]);
    setImagePreviews([]);
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      // Validate files
      const validFiles = files.filter(file => {
        const validTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}. Only JPG/PNG allowed.`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File too large: ${file.name}. Max 5MB.`);
          return false;
        }
        return true;
      });

      // Append new files to existing ones
      setImageFiles(prev => [...prev, ...validFiles]);
      
      // Create previews and append to existing ones
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    // Get current existing images from formData (source of truth)
    const existingImages = formData.images || [];
    
    // Remove from imagePreviews
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Remove from formData.images (this tracks what goes to DB)
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    
    // If it's a newly selected file (not yet uploaded), remove from imageFiles
    if (index >= existingImages.length) {
      const fileIndex = index - existingImages.length;
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    
    toast.success("Image removed. Click Save to apply changes.");
  };

  // Toggle amenity
  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      PENDING_APPROVAL: { className: "bg-yellow-100 text-yellow-700", label: "Pending Approval" },
      ACTIVE: { className: "bg-green-100 text-green-700", label: "Active" },
      INACTIVE: { className: "bg-neutral-100 text-neutral-700", label: "Inactive" },
      SUSPENDED: { className: "bg-red-100 text-red-700", label: "Suspended" },
      DELISTED: { className: "bg-neutral-100 text-neutral-700", label: "Delisted" },
    };
    const { className, label } = config[status] || { className: "bg-neutral-100 text-neutral-700", label: status };
    return <Badge className={className}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading venues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Venue Details</h1>
          <p className="text-neutral-600">Manage your venue listings</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedVenue && getStatusBadge(selectedVenue.status)}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit2 className="h-4 w-4" />
              {venues.length === 0 ? "Add Venue" : "Edit Venue"}
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
      </motion.div>

      {/* No Venues Info */}
      {venues.length === 0 && !isEditing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">No Venues Added</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Add your first venue to start receiving bookings
                </p>
                <Button onClick={() => setIsEditing(true)} className="mt-3 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Venue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Basic Information</CardTitle>
              <CardDescription className="text-neutral-600">Essential details about your venue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-black font-medium">Venue Name *</Label>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Grand Palace Banquet Hall"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-black font-medium">Venue Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={!isEditing}
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black"
                >
                  {VENUE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-black font-medium">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Describe your venue's features, ambiance, and what makes it special..."
                  rows={5}
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 resize-none focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Location</CardTitle>
              <CardDescription className="text-neutral-600">Where your venue is located</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-black font-medium">City *</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Chennai"
                      className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area" className="text-black font-medium">Area *</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Adyar, T Nagar"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-black font-medium">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Street address, landmark"
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode" className="text-black font-medium">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  disabled={!isEditing}
                  placeholder="600001"
                  maxLength={6}
                  className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-black">Venue Images</CardTitle>
                <CardDescription className="text-neutral-600">Upload photos of your venue (JPG/PNG, max 5MB each)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="images"
                    accept="image/jpeg,image/png,image/jpg"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label htmlFor="images" className="cursor-pointer">
                    <Image className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-black mb-1">
                      {imageFiles.length > 0 ? `${imageFiles.length} new files selected` : "Click to upload images"}
                    </p>
                    <p className="text-xs text-neutral-600">Multiple images allowed</p>
                  </label>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {imagePreviews.map((preview, index) => {
                      const imageUrl = getImageUrl(preview);
                      return (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-neutral-100">
                          <img
                            src={imageUrl}
                            alt={`Venue preview ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              console.error(`Failed to load image: ${imageUrl} (original: ${preview})`);
                              // Show placeholder instead of hiding
                              img.style.display = 'none';
                              const placeholder = document.createElement('div');
                              placeholder.className = 'w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-500 text-xs';
                              placeholder.textContent = 'Image unavailable';
                              img.parentElement?.appendChild(placeholder);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Capacity & Pricing */}
        <div className="space-y-6">
          {/* Capacity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Capacity</CardTitle>
              <CardDescription className="text-neutral-600">Guest capacity range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="capacityMin" className="text-black font-medium">Minimum Capacity *</Label>
                <Input
                  id="capacityMin"
                  type="number"
                  value={formData.capacityMin === 0 ? "" : formData.capacityMin}
                  onChange={(e) => setFormData({ ...formData, capacityMin: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                  disabled={!isEditing}
                  min="1"
                  className="border border-neutral-300 bg-white text-black focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacityMax" className="text-black font-medium">Maximum Capacity *</Label>
                <Input
                  id="capacityMax"
                  type="number"
                  value={formData.capacityMax === 0 ? "" : formData.capacityMax}
                  onChange={(e) => setFormData({ ...formData, capacityMax: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                  disabled={!isEditing}
                  min="1"
                  className="border border-neutral-300 bg-white text-black focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Pricing</CardTitle>
              <CardDescription className="text-neutral-600">Base prices for different time slots</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basePriceMorning" className="text-black font-medium">Morning Price (₹)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="basePriceMorning"
                    type="number"
                    value={formData.basePriceMorning === 0 ? "" : formData.basePriceMorning}
                    onChange={(e) => setFormData({ ...formData, basePriceMorning: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    placeholder="25000"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
                <p className="text-xs text-neutral-500">6:00 AM - 12:00 PM</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="basePriceEvening" className="text-black font-medium">Evening Price (₹) *</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="basePriceEvening"
                    type="number"
                    value={formData.basePriceEvening === 0 ? "" : formData.basePriceEvening}
                    onChange={(e) => setFormData({ ...formData, basePriceEvening: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    placeholder="50000"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
                <p className="text-xs text-neutral-500">4:00 PM - 10:00 PM</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="basePriceFullDay" className="text-black font-medium">Full Day Price (₹) *</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                  <Input
                    id="basePriceFullDay"
                    type="number"
                    value={formData.basePriceFullDay === 0 ? "" : formData.basePriceFullDay}
                    onChange={(e) => setFormData({ ...formData, basePriceFullDay: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                    placeholder="75000"
                    className="border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus-visible:ring-neutral-600 focus-visible:border-neutral-500"
                  />
                </div>
                <p className="text-xs text-neutral-500">6:00 AM - 12:00 AM</p>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Amenities</CardTitle>
              <CardDescription className="text-neutral-600">Features your venue offers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {AMENITIES_OPTIONS.map((amenity) => (
                  <Button
                    key={amenity}
                    variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                    size="sm"
                    onClick={() => isEditing && toggleAmenity(amenity)}
                    disabled={!isEditing}
                    className={cn(
                      "text-xs transition-colors",
                      formData.amenities.includes(amenity)
                        ? "bg-black text-white hover:bg-neutral-800"
                        : "border-neutral-300 bg-white text-black hover:bg-neutral-100"
                    )}
                  >
                    {amenity}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
