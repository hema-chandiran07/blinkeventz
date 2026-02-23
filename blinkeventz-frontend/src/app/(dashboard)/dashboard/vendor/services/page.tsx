"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, DollarSign, Users, Package, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

interface VendorService {
  id: string;
  name: string;
  serviceType: string;
  pricingModel: string;
  baseRate: number;
  minGuests?: number;
  maxGuests?: number;
  description: string;
  inclusions: string;
  exclusions: string;
  isActive: boolean;
}

const SERVICE_TYPES = [
  "CATERING", "DECOR", "PHOTOGRAPHY", "VIDEGRAPHY", "MAKEUP",
  "DJ", "MUSIC", "MEHENDI", "BAKERY", "EVENT_PLANNING", "TRANSPORTATION", "OTHER"
];

const PRICING_MODELS = [
  { value: "PER_EVENT", label: "Per Event" },
  { value: "PER_PERSON", label: "Per Person" },
  { value: "PER_DAY", label: "Per Day" },
  { value: "PACKAGE", label: "Package" }
];

export default function VendorServicesPage() {
  const [services, setServices] = useState<VendorService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<VendorService | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    serviceType: "",
    pricingModel: "PER_EVENT",
    baseRate: 0,
    minGuests: undefined as number | undefined,
    maxGuests: undefined as number | undefined,
    description: "",
    inclusions: "",
    exclusions: "",
    isActive: true
  });

  // Load services from localStorage on mount
  useEffect(() => {
    const storedServices = localStorage.getItem("blinkeventz_vendor_services");
    if (storedServices) {
      try {
        const parsed = JSON.parse(storedServices);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setServices(parsed);
      } catch (error) {
        console.error("Failed to parse services:", error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setIsLoading(false);
  }, []);

  // Save services to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("blinkeventz_vendor_services", JSON.stringify(services));
    }
  }, [services, isLoading]);

  const handleOpenDialog = (service?: VendorService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        serviceType: service.serviceType,
        pricingModel: service.pricingModel,
        baseRate: service.baseRate,
        minGuests: service.minGuests,
        maxGuests: service.maxGuests,
        description: service.description,
        inclusions: service.inclusions,
        exclusions: service.exclusions,
        isActive: service.isActive
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        serviceType: "",
        pricingModel: "PER_EVENT",
        baseRate: 0,
        minGuests: undefined,
        maxGuests: undefined,
        description: "",
        inclusions: "",
        exclusions: "",
        isActive: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!formData.serviceType) {
      toast.error("Please select a service type");
      return;
    }
    if (formData.baseRate <= 0) {
      toast.error("Base rate must be greater than 0");
      return;
    }

    if (editingService) {
      // Update existing service
      setServices(services.map(s =>
        s.id === editingService.id
          ? { ...s, ...formData }
          : s
      ));
      toast.success("Service updated successfully!");
    } else {
      // Create new service
      const newService: VendorService = {
        id: `service-${Date.now()}`,
        ...formData
      };
      setServices([...services, newService]);
      toast.success("Service created successfully!");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (serviceId: string) => {
    if (confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      setServices(services.filter(s => s.id !== serviceId));
      toast.success("Service deleted successfully!");
    }
  };

  const handleToggleActive = (serviceId: string) => {
    setServices(services.map(s =>
      s.id === serviceId ? { ...s, isActive: !s.isActive } : s
    ));
    const service = services.find(s => s.id === serviceId);
    toast.success(service?.isActive ? "Service deactivated" : "Service activated");
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const stats = {
    total: services.length,
    active: services.filter(s => s.isActive).length,
    inactive: services.filter(s => !s.isActive).length,
    avgPrice: services.length > 0 
      ? Math.round(services.reduce((sum, s) => sum + s.baseRate, 0) / services.length)
      : 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
          <p className="text-gray-500">Manage your service offerings and pricing</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Services</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <ToggleRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.inactive}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-50 text-gray-600">
                <ToggleLeft className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgPrice > 0 ? formatCurrency(stats.avgPrice) : "₹0"}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services List */}
      <div className="grid gap-4">
        {services.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No services yet</h3>
              <p className="text-gray-500 mt-1">Add your first service to start getting bookings</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{service.name}</h3>
                      <Badge variant="secondary">{service.serviceType}</Badge>
                      {service.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{service.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-purple-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">{formatCurrency(service.baseRate)}</span>
                        <span className="text-gray-500">
                          {PRICING_MODELS.find(p => p.value === service.pricingModel)?.label}
                        </span>
                      </div>
                      {service.minGuests && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>Min: {service.minGuests} guests</span>
                        </div>
                      )}
                      {service.maxGuests && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>Max: {service.maxGuests} guests</span>
                        </div>
                      )}
                    </div>

                    {(service.inclusions || service.exclusions) && (
                      <div className="grid sm:grid-cols-2 gap-4 mt-4">
                        {service.inclusions && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">Includes</p>
                            <p className="text-sm text-gray-600">{service.inclusions}</p>
                          </div>
                        )}
                        {service.exclusions && (
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-700 mb-1">Excludes</p>
                            <p className="text-sm text-gray-600">{service.exclusions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2">
                    <Button
                      variant={service.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(service.id)}
                    >
                      {service.isActive ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(service)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create New Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService ? "Update your service details" : "Add a new service to your offerings"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Wedding Photography Package"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type *</Label>
                <select
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type</option>
                  {SERVICE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model *</Label>
                <select
                  id="pricingModel"
                  value={formData.pricingModel}
                  onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PRICING_MODELS.map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseRate">Base Rate (₹) *</Label>
                <Input
                  id="baseRate"
                  type="number"
                  value={formData.baseRate}
                  onChange={(e) => setFormData({ ...formData, baseRate: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minGuests">Min Guests</Label>
                <Input
                  id="minGuests"
                  type="number"
                  value={formData.minGuests || ""}
                  onChange={(e) => setFormData({ ...formData, minGuests: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGuests">Max Guests</Label>
                <Input
                  id="maxGuests"
                  type="number"
                  value={formData.maxGuests || ""}
                  onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your service..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inclusions">Inclusions</Label>
              <Textarea
                id="inclusions"
                value={formData.inclusions}
                onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                placeholder="What's included in this service..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exclusions">Exclusions</Label>
              <Textarea
                id="exclusions"
                value={formData.exclusions}
                onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                placeholder="What's not included..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingService ? "Update Service" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
