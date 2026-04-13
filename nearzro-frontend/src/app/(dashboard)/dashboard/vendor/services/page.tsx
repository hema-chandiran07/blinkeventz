"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus, ArrowLeft, Loader2, Upload, X, CheckCircle2,
  Utensils, Palette, Camera, Film, Music, Car, Star,
  DollarSign, Users, Clock, Settings, Trash2, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

export default function VendorServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
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
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENDOR") {
      router.push("/login");
      return;
    }
    loadServices();

    const serviceId = searchParams.get('id');
    if (serviceId) {
      loadService(parseInt(serviceId));
    }
  }, [isAuthenticated, user, router, searchParams]);

  const loadServices = async () => {
    try {
      const response = await api.get(`/vendors/me/services`);
      const servicesList = extractArray<any>(response);
      setServices(servicesList);
    } catch (error) {
      console.error("Error loading services:", error);
      setServices([]);
    }
  };

  const loadService = async (serviceId: number) => {
    try {
      const response = await api.get(`/vendors/me/services`);
      const servicesList = extractArray<any>(response);
      const service = servicesList.find((s: any) => s.id === serviceId);
      if (service) {
        setFormData({
          name: service.name,
          serviceType: service.serviceType,
          pricingModel: service.pricingModel,
          baseRate: service.baseRate.toString(),
          minGuests: service.minGuests?.toString() || "",
          maxGuests: service.maxGuests?.toString() || "",
          description: service.description || "",
          inclusions: service.inclusions || "",
          exclusions: service.exclusions || "",
          isActive: service.isActive,
        });
        setImages(service.images || []);
        setIsEditing(true);
        setEditingServiceId(serviceId);
      }
    } catch (error) {
      console.error("Error loading service:", error);
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
    setImages(images.filter((_, i) => i !== index));
    if (images[index].startsWith('blob:')) {
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

    setLoading(true);

    try {
      const serviceData = {
        ...formData,
        baseRate: baseRateValue,
        minGuests: formData.minGuests ? parseInt(formData.minGuests) : null,
        maxGuests: formData.maxGuests ? parseInt(formData.maxGuests) : null,
        isActive: formData.isActive,
      };

      const formDataObj = new FormData();

      Object.entries(serviceData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formDataObj.append(key, value.toString());
        }
      });

      imageFiles.forEach(file => {
        formDataObj.append('images', file);
      });

      images.filter(url => !url.startsWith('blob:')).forEach(url => {
        formDataObj.append('images', url);
      });

      if (isEditing && editingServiceId) {
        await api.patch(`/vendor-services/${editingServiceId}`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success("Service updated successfully!");
      } else {
        await api.post("/vendor-services", formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success("Service created successfully!");
      }

      setIsEditing(false);
      setEditingServiceId(null);
      setFormData({
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
      setImages([]);
      setImageFiles([]);
      loadServices();
    } catch (error: any) {
      console.error("Service error:", error);
      toast.error(error?.response?.data?.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: any) => {
    setFormData({
      name: service.name,
      serviceType: service.serviceType,
      pricingModel: service.pricingModel,
      baseRate: service.baseRate.toString(),
      minGuests: service.minGuests?.toString() || "",
      maxGuests: service.maxGuests?.toString() || "",
      description: service.description || "",
      inclusions: service.inclusions || "",
      exclusions: service.exclusions || "",
      isActive: service.isActive,
    });
    setImages(service.images || []);
    setIsEditing(true);
    setEditingServiceId(service.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await api.delete(`/vendor-services/${serviceId}`);
      toast.success("Service deleted successfully!");
      loadServices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete service");
    }
  };

  const getServiceIcon = (type: string) => {
    const serviceType = SERVICE_TYPES.find(s => s.value === type);
    const Icon = serviceType?.icon || Settings;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/vendor")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">My Services</h1>
            <p className="text-neutral-600 mt-1">Manage your service offerings</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setIsEditing(!isEditing);
            setEditingServiceId(null);
            setFormData({
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
            setImages([]);
            setImageFiles([]);
          }}
          className="gap-2 bg-black hover:bg-neutral-800 text-white"
        >
          <Plus className="h-4 w-4" />
          {isEditing ? "Cancel" : "Add Service"}
        </Button>
      </motion.div>

      {/* Add/Edit Service Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                {editingServiceId ? "Edit Service" : "Add New Service"}
              </CardTitle>
              <CardDescription className="text-neutral-600">
                {editingServiceId ? "Update your service details" : "Create a new service offering"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-black font-medium">Service Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Premium Wedding Photography"
                      className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceType" className="text-black font-medium">Service Type *</Label>
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
                    <Label htmlFor="pricingModel" className="text-black font-medium">Pricing Model *</Label>
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
                    <Label htmlFor="baseRate" className="text-black font-medium">Base Price (₹) *</Label>
                    <Input
                      id="baseRate"
                      type="number"
                      value={formData.baseRate}
                      onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                      placeholder="50000"
                      className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minGuests" className="text-black font-medium">Minimum Guests</Label>
                    <Input
                      id="minGuests"
                      type="number"
                      value={formData.minGuests}
                      onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
                      placeholder="50"
                      className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxGuests" className="text-black font-medium">Maximum Guests</Label>
                    <Input
                      id="maxGuests"
                      type="number"
                      value={formData.maxGuests}
                      onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                      placeholder="500"
                      className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-black font-medium">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your service in detail..."
                    rows={4}
                    className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="inclusions" className="text-black font-medium">What's Included</Label>
                    <Textarea
                      id="inclusions"
                      value={formData.inclusions}
                      onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                      placeholder="List what's included in your service"
                      rows={3}
                      className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exclusions" className="text-black font-medium">What's Not Included</Label>
                    <Textarea
                      id="exclusions"
                      value={formData.exclusions}
                      onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                      placeholder="List what's not included"
                      rows={3}
                      className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-black font-medium">Service Images (Multiple)</Label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center bg-neutral-50">
                    <ImageIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600 mb-4">Upload multiple images from your device (max 5MB each)</p>
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
                          Select Multiple Images
                        </span>
                      </Button>
                    </Label>
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {images.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-300">
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
                  <Label htmlFor="isActive" className="text-neutral-700">Active (visible to customers)</Label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 text-white" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingServiceId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {editingServiceId ? "Update Service" : "Create Service"}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditingServiceId(null);
                    setImages([]);
                    setImageFiles([]);
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Services List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Your Services ({services.length})</CardTitle>
            <CardDescription className="text-neutral-600">Manage and monitor your service offerings</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-10 w-10 text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No services yet</h3>
                <p className="text-neutral-600 mb-6">Start by adding your first service</p>
                <Button onClick={() => setIsEditing(true)} className="bg-black hover:bg-neutral-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Service
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map((service) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all bg-white"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-14 w-14 rounded-xl bg-neutral-100 flex items-center justify-center text-black shadow-sm">
                        {getServiceIcon(service.serviceType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-black">{service.name}</h3>
                          <Badge className={service.isActive ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}>
                            {service.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-neutral-500">
                          <span className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            ₹{service.baseRate.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {service.minGuests || 0} - {service.maxGuests || '∞'} guests
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {service.pricingModel.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(service.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
