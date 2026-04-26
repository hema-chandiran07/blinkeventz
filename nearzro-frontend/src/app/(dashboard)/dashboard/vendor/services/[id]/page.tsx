"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Loader2, Upload, X, CheckCircle2, Trash2, Edit2, Save,
  Utensils, Palette, Camera, Film, Music, Car, Star, Settings, Image as ImageIcon,
  DollarSign, Users, Calendar, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// ==================== Types ====================
interface VendorService {
  id: number;
  name: string;
  serviceType: string;
  pricingModel: string;
  baseRate: number;
  minGuests?: number;
  maxGuests?: number;
  description: string;
  inclusions?: string;
  exclusions?: string;
  isActive: boolean;
  isApproved?: boolean;
  images: string[];
  vendorId: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== Constants ====================
const SERVICE_TYPES = [
  { value: "CATERING", label: "Catering", icon: Utensils },
  { value: "DECOR", label: "Decoration", icon: Palette },
  { value: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { value: "VIDEGRAPHY", label: "Videography", icon: Film },
  { value: "MAKEUP", label: "Makeup & Hair", icon: Star },
  { value: "DJ", label: "DJ & Music", icon: Music },
  { value: "MUSIC", label: "Live Music", icon: Music },
  { value: "CAR_RENTAL", label: "Car Rental", icon: Car },
  { value: "PRIEST", label: "Priest Services", icon: Star },
  { value: "ENTERTAINMENT", label: "Entertainment", icon: Star },
  { value: "OTHER", label: "Other", icon: Settings },
];

const PRICING_MODELS = [
  { value: "PER_EVENT", label: "Per Event", description: "Fixed price for entire event" },
  { value: "PER_PERSON", label: "Per Person", description: "Price per guest" },
  { value: "PER_DAY", label: "Per Day", description: "Daily rate" },
  { value: "PACKAGE", label: "Package", description: "Bundled services" },
];

// ==================== Main Component ====================
export default function VendorServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const serviceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<VendorService | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    serviceType: "PHOTOGRAPHY",
    pricingModel: "PER_EVENT",
    baseRate: "",
    minGuests: "",
    maxGuests: "",
    description: "",
    inclusions: "",
    exclusions: "",
    isActive: true,
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENDOR") {
      router.push("/login");
      return;
    }
    if (serviceId) {
      loadService();
    }
  }, [isAuthenticated, user, router, serviceId]);

  const loadService = async () => {
    try {
      setLoading(true);
      // Fetch the specific service directly by ID
      const response = await api.get(`/vendor-services/${serviceId}`);
      const foundService = response.data;

      if (!foundService) {
        toast.error("Service not found");
        router.push("/dashboard/vendor/services");
        return;
      }

      // Verify this service belongs to the current vendor
      if (foundService.vendorId) {
        // Fetch vendor profile to verify ownership
        const vendorRes = await api.get('/vendors/me');
        const vendor = vendorRes.data;
        if (vendor && vendor.id !== foundService.vendorId) {
          toast.error("You don't have permission to view this service");
          router.push("/dashboard/vendor/services");
          return;
        }
      }

      setService(foundService);
      setFormData({
        name: foundService.name,
        serviceType: foundService.serviceType,
        pricingModel: foundService.pricingModel,
        baseRate: foundService.baseRate.toString(),
        minGuests: foundService.minGuests?.toString() || "",
        maxGuests: foundService.maxGuests?.toString() || "",
        description: foundService.description || "",
        inclusions: foundService.inclusions || "",
        exclusions: foundService.exclusions || "",
        isActive: foundService.isActive,
      });
      setImages(foundService.images || []);
    } catch (error: any) {
      console.error("Error loading service:", error);
      toast.error(error?.response?.data?.message || "Failed to load service");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`File "${file.name}" is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    setImageFiles([...imageFiles, ...validFiles]);

    validFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      setImages(prev => [...prev, previewUrl]);
    });

    toast.success(`${validFiles.length} image(s) selected`);
  };

  const handleRemoveImage = (index: number) => {
    const isBlob = images[index].startsWith('blob:');
    setImages(images.filter((_, i) => i !== index));
    if (isBlob) {
      setImageFiles(imageFiles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate service name
    const name = formData.name.trim();
    if (!name) {
      toast.error("Please enter a service name");
      return;
    }
    if (name.length < 2) {
      toast.error("Service name must be at least 2 characters");
      return;
    }
    if (name.length > 100) {
      toast.error("Service name must be less than 100 characters");
      return;
    }

    // Validate baseRate - reasonable limits
    const baseRateValue = parseInt(formData.baseRate);
    if (!formData.baseRate || isNaN(baseRateValue) || baseRateValue <= 0) {
      toast.error("Please enter a valid base price greater than 0");
      return;
    }
    if (baseRateValue > 99999999) {
      toast.error("Base price cannot exceed ₹99,999,999");
      return;
    }

    // Validate min/max guests - reasonable limits
    if (formData.minGuests) {
      const minGuests = parseInt(formData.minGuests);
      if (minGuests < 0) {
        toast.error("Minimum guests cannot be negative");
        return;
      }
      if (minGuests > 100000) {
        toast.error("Minimum guests cannot exceed 100,000");
        return;
      }
    }
    if (formData.maxGuests) {
      const maxGuests = parseInt(formData.maxGuests);
      if (maxGuests < 0) {
        toast.error("Maximum guests cannot be negative");
        return;
      }
      if (maxGuests > 100000) {
        toast.error("Maximum guests cannot exceed 100,000");
        return;
      }
    }
    if (formData.minGuests && formData.maxGuests) {
      const minGuests = parseInt(formData.minGuests);
      const maxGuests = parseInt(formData.maxGuests);
      if (minGuests >= maxGuests) {
        toast.error("Minimum guests must be less than maximum guests");
        return;
      }
    }

    setSaving(true);

    try {
      const serviceData = {
        ...formData,
        baseRate: parseInt(formData.baseRate) || 0,
        minGuests: formData.minGuests ? parseInt(formData.minGuests) : null,
        maxGuests: formData.maxGuests ? parseInt(formData.maxGuests) : null,
        isActive: formData.isActive,
      };

      const formDataObj = new FormData();

      Object.entries(serviceData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataObj.append(key, value.toString());
        }
      });

      imageFiles.forEach(file => {
        formDataObj.append('images', file);
      });

      // Include existing non-blob images
      images.filter(url => !url.startsWith('blob:')).forEach(url => {
        formDataObj.append('images', url);
      });

      await api.patch(`/vendor-services/${serviceId}`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success("Service updated successfully!");
      setIsEditing(false);
      setImageFiles([]);
      loadService();
    } catch (error: any) {
      console.error("Service update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/vendor-services/${serviceId}`);
      toast.success("Service deleted successfully!");
      router.push("/dashboard/vendor/services");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete service");
    }
  };

  const handleActivate = async () => {
    try {
      await api.patch(`/vendor-services/${serviceId}/activate`);
      toast.success("Service activated!");
      loadService();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to activate service");
    }
  };

  const handleDeactivate = async () => {
    try {
      await api.patch(`/vendor-services/${serviceId}/deactivate`);
      toast.success("Service deactivated!");
      loadService();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to deactivate service");
    }
  };

  const getServiceIcon = (type: string) => {
    const serviceType = SERVICE_TYPES.find(s => s.value === type);
    const Icon = serviceType?.icon || Settings;
    return <Icon className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-silver-400" />
          <p className="text-silver-400">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-silver-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Service Not Found</h2>
          <p className="text-silver-400 mb-4">The service you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/dashboard/vendor/services")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/vendor/services")} className="gap-2 text-white hover:bg-silver-800">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{service.name}</h1>
            <p className="text-silver-400">Service ID: #{service.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={service.isActive ? "bg-green-900/50 text-green-300 border-green-700" : "bg-silver-800 text-silver-300 border-silver-600"}>
            {service.isActive ? "Active" : "Inactive"}
          </Badge>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="premium" className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit Service
            </Button>
          ) : (
            <>
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={() => {
                setIsEditing(false);
                loadService();
                setImageFiles([]);
              }} variant="outline" className="border-silver-700 text-white hover:bg-silver-800">
                Cancel
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Service Details */}
        <div className="lg:col-span-2 space-y-6">
          {!isEditing ? (
            // View Mode
            <>
              {/* Basic Info */}
              <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    {getServiceIcon(service.serviceType)}
                    Service Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-silver-400">Service Type</p>
                      <p className="text-white font-medium">{SERVICE_TYPES.find(t => t.value === service.serviceType)?.label || service.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-silver-400">Pricing Model</p>
                      <p className="text-white font-medium">{service.pricingModel.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-silver-400">Base Rate</p>
                      <p className="text-white font-semibold text-lg">₹{service.baseRate.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-silver-400">Guest Capacity</p>
                      <p className="text-white font-medium">
                        {service.minGuests || 0} - {service.maxGuests || '∞'} guests
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-silver-400 mb-2">Description</p>
                    <p className="text-white">{service.description}</p>
                  </div>

                  {service.inclusions && (
                    <div>
                      <p className="text-sm font-medium text-silver-400 mb-2">What's Included</p>
                      <p className="text-white">{service.inclusions}</p>
                    </div>
                  )}

                  {service.exclusions && (
                    <div>
                      <p className="text-sm font-medium text-silver-400 mb-2">What's Not Included</p>
                      <p className="text-white">{service.exclusions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Images */}
              {service.images && service.images.length > 0 && (
                <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Service Images ({service.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {service.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-silver-700">
                          <img src={img} alt={`Service image ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-silver-800 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-silver-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Service Created</p>
                      <p className="text-xs text-silver-400">
                        {new Date(service.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {service.updatedAt && service.updatedAt !== service.createdAt && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-silver-800 flex items-center justify-center flex-shrink-0">
                        <Edit2 className="h-4 w-4 text-silver-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Last Updated</p>
                        <p className="text-xs text-silver-400">
                          {new Date(service.updatedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            // Edit Mode
            <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
              <CardHeader>
                <CardTitle className="text-white">Edit Service Details</CardTitle>
                <CardDescription className="text-silver-400">Update your service information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-neutral-700">Service Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="border-neutral-300 bg-white text-black"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serviceType" className="text-neutral-700">Service Type *</Label>
                      <select
                        id="serviceType"
                        value={formData.serviceType}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black"
                        required
                      >
                        {SERVICE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pricingModel" className="text-neutral-700">Pricing Model *</Label>
                      <select
                        id="pricingModel"
                        value={formData.pricingModel}
                        onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black"
                        required
                      >
                        {PRICING_MODELS.map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label} - {model.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="baseRate" className="text-neutral-700">Base Price (₹) *</Label>
                      <Input
                        id="baseRate"
                        type="number"
                        value={formData.baseRate}
                        onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                        className="border-neutral-300 bg-white text-black"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minGuests" className="text-neutral-700">Minimum Guests</Label>
                      <Input
                        id="minGuests"
                        type="number"
                        value={formData.minGuests}
                        onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
                        className="border-neutral-300 bg-white text-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxGuests" className="text-neutral-700">Maximum Guests</Label>
                      <Input
                        id="maxGuests"
                        type="number"
                        value={formData.maxGuests}
                        onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                        className="border-neutral-300 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-neutral-700">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="border-neutral-300 bg-white text-black"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="inclusions" className="text-neutral-700">What's Included</Label>
                      <Textarea
                        id="inclusions"
                        value={formData.inclusions}
                        onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                        rows={3}
                        className="border-neutral-300 bg-white text-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exclusions" className="text-neutral-700">What's Not Included</Label>
                      <Textarea
                        id="exclusions"
                        value={formData.exclusions}
                        onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                        rows={3}
                        className="border-neutral-300 bg-white text-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-700">Service Images</Label>
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center bg-neutral-50">
                      <ImageIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600 mb-4">Upload additional images (max 5MB each)</p>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <Label htmlFor="image-upload">
                        <Button type="button" variant="outline" asChild className="cursor-pointer border-neutral-300 text-black hover:bg-neutral-100">
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Select Images
                          </span>
                        </Button>
                      </Label>
                    </div>
                    {images.length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        {images.map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-silver-700">
                            <img src={url} alt={`Service image ${index + 1}`} className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive" className="text-white">Active (visible to customers)</Label>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-silver-400">Manage service status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {service.isActive ? (
                <Button onClick={handleDeactivate} variant="outline" className="w-full border-silver-700 text-white hover:bg-silver-800">
                  Deactivate Service
                </Button>
              ) : (
                <Button onClick={handleActivate} className="w-full bg-green-700 hover:bg-green-600">
                  Activate Service
                </Button>
              )}
              <Button onClick={() => setDeleteDialogOpen(true)} variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-900/50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Service
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
            <CardHeader>
              <CardTitle className="text-white">Service Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-silver-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Base Rate</span>
                </div>
                <span className="text-white font-semibold">₹{service.baseRate.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-silver-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Capacity</span>
                </div>
                <span className="text-white font-semibold">
                  {service.minGuests || 0} - {service.maxGuests || '∞'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-silver-400">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">Images</span>
                </div>
                <span className="text-white font-semibold">{service.images?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-silver-900 border-silver-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              Delete Service
            </DialogTitle>
            <DialogDescription className="text-silver-400">
              Are you sure you want to delete "{service.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-silver-700 text-white hover:bg-silver-800">
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
