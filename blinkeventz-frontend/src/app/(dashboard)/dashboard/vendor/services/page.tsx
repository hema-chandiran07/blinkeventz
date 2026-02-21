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
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  DollarSign, 
  Package, 
  ToggleLeft, 
  ToggleRight,
  Info,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

// Mock data for vendor services
const MOCK_SERVICES = [
  {
    id: "1",
    name: "Wedding Photography Package",
    serviceType: "PHOTOGRAPHY",
    pricingModel: "PER_EVENT",
    baseRate: 35000,
    minGuests: 50,
    maxGuests: 500,
    description: "Complete wedding day photography coverage with 2 photographers, drone shots, and same-day preview",
    inclusions: "8 hours coverage, 2 photographers, drone shots, 50 edited photos, 1 album",
    exclusions: "Travel charges for locations outside Chennai, additional hours charged extra",
    isActive: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-02-10T14:20:00Z"
  },
  {
    id: "2",
    name: "Pre-Wedding Photoshoot",
    serviceType: "PHOTOGRAPHY",
    pricingModel: "PER_EVENT",
    baseRate: 15000,
    minGuests: null,
    maxGuests: null,
    description: "Romantic pre-wedding photoshoot at your choice of location with professional editing",
    inclusions: "2 hours shoot, 1 location, 20 edited photos, 1 reel video",
    exclusions: "Entry fees for monuments, travel charges",
    isActive: true,
    createdAt: "2024-01-20T09:00:00Z",
    updatedAt: "2024-02-05T11:45:00Z"
  },
  {
    id: "3",
    name: "Event Videography",
    serviceType: "VIDEOGRAPHY",
    pricingModel: "PER_EVENT",
    baseRate: 25000,
    minGuests: 100,
    maxGuests: 1000,
    description: "Professional event videography with cinematic editing and highlight reel",
    inclusions: "Full event coverage, cinematic edit, 3-5 min highlight reel, drone coverage",
    exclusions: "Additional copies, raw footage",
    isActive: false,
    createdAt: "2024-02-01T08:15:00Z",
    updatedAt: "2024-02-08T16:30:00Z"
  },
  {
    id: "4",
    name: "Candid Photography",
    serviceType: "PHOTOGRAPHY",
    pricingModel: "PER_EVENT",
    baseRate: 20000,
    minGuests: 50,
    maxGuests: 300,
    description: "Natural, unposed photography capturing genuine moments and emotions",
    inclusions: "6 hours coverage, 100+ candid shots, online gallery",
    exclusions: "Printed photos, albums",
    isActive: true,
    createdAt: "2024-01-10T12:00:00Z",
    updatedAt: "2024-01-25T10:00:00Z"
  }
];

const SERVICE_TYPES = [
  "CATERING",
  "DECOR",
  "PHOTOGRAPHY",
  "VIDEGRAPHY",
  "MAKEUP",
  "DJ",
  "MUSIC",
  "MEHENDI",
  "BAKERY",
  "EVENT_PLANNING",
  "TRANSPORTATION",
  "VENUE_STYLING",
  "LIGHTING_SOUND",
  "ENTERTAINMENT",
  "OTHER"
];

const PRICING_MODELS = [
  { value: "PER_EVENT", label: "Per Event" },
  { value: "PER_PERSON", label: "Per Person" },
  { value: "PER_DAY", label: "Per Day" },
  { value: "PER_HOUR", label: "Per Hour" },
  { value: "PACKAGE", label: "Package" }
];

interface VendorService {
  id: string;
  name: string;
  serviceType: string;
  pricingModel: string;
  baseRate: number;
  minGuests?: number | null;
  maxGuests?: number | null;
  description?: string;
  inclusions?: string;
  exclusions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function VendorServicesPage() {
  const [services, setServices] = useState<VendorService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<VendorService | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState<Omit<VendorService, "id" | "createdAt" | "updatedAt">>({
    name: "",
    serviceType: "",
    pricingModel: "",
    baseRate: 0,
    minGuests: null,
    maxGuests: null,
    description: "",
    inclusions: "",
    exclusions: "",
    isActive: true
  });

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      setServices(MOCK_SERVICES);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || service.serviceType === filterType;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && service.isActive) ||
                         (filterStatus === "inactive" && !service.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });

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
        description: service.description || "",
        inclusions: service.inclusions || "",
        exclusions: service.exclusions || "",
        isActive: service.isActive
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        serviceType: "",
        pricingModel: "",
        baseRate: 0,
        minGuests: null,
        maxGuests: null,
        description: "",
        inclusions: "",
        exclusions: "",
        isActive: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    if (!formData.pricingModel) {
      toast.error("Please select a pricing model");
      return;
    }
    if (formData.baseRate <= 0) {
      toast.error("Base rate must be greater than 0");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      if (editingService) {
        setServices(prev => prev.map(s => 
          s.id === editingService.id 
            ? { ...s, ...formData, updatedAt: new Date().toISOString() }
            : s
        ));
        toast.success("Service updated successfully!");
      } else {
        const newService: VendorService = {
          ...formData,
          id: String(Date.now()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setServices(prev => [newService, ...prev]);
        toast.success("Service created successfully!");
      }
      setIsLoading(false);
      setIsDialogOpen(false);
    }, 500);
  };

  const handleDelete = (serviceId: string) => {
    toast.custom((t) => (
      <Card className="w-80 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Delete Service?</p>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone. The service will be permanently removed.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.dismiss(t)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setServices(prev => prev.filter(s => s.id !== serviceId));
                toast.dismiss(t);
                toast.success("Service deleted successfully!");
              }}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    ), { duration: 5000 });
  };

  const handleToggleActive = (serviceId: string, currentStatus: boolean) => {
    setServices(prev => prev.map(s => 
      s.id === serviceId 
        ? { ...s, isActive: !currentStatus, updatedAt: new Date().toISOString() }
        : s
    ));
    toast.success(
      currentStatus ? "Service deactivated" : "Service activated",
      { description: currentStatus ? "The service is now hidden from customers" : "The service is now visible to customers" }
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 border-gray-200">
        <Clock className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const stats = {
    total: services.length,
    active: services.filter(s => s.isActive).length,
    inactive: services.filter(s => !s.isActive).length,
    avgPrice: services.length > 0 
      ? Math.round(services.reduce((sum, s) => sum + s.baseRate, 0) / services.length)
      : 0
  };

  if (isLoading && services.length === 0) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
          <p className="text-gray-500">Manage your service offerings and pricing</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Service
        </Button>
      </div>

      {/* Stats Cards */}
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
                <CheckCircle2 className="h-5 w-5" />
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
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.avgPrice)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <option value="all">All Types</option>
                {SERVICE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <div className="grid gap-4">
        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No services found</h3>
              <p className="text-gray-500 mt-1">
                {searchQuery || filterType !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first service"}
              </p>
              {!searchQuery && filterType === "all" && filterStatus === "all" && (
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{service.name}</h3>
                      {getStatusBadge(service.isActive)}
                      <Badge variant="secondary">{service.serviceType}</Badge>
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
                          <Info className="h-4 w-4" />
                          <span>Min: {service.minGuests} guests</span>
                        </div>
                      )}
                      {service.maxGuests && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Info className="h-4 w-4" />
                          <span>Max: {service.maxGuests} guests</span>
                        </div>
                      )}
                    </div>

                    {/* Inclusions & Exclusions */}
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

                    {/* Footer Info */}
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      <span>Created: {formatDate(service.createdAt)}</span>
                      <span>•</span>
                      <span>Updated: {formatDate(service.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:shrink-0">
                    <Button
                      variant={service.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(service.id, service.isActive)}
                      className="w-full lg:w-auto"
                    >
                      {service.isActive ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(service)}
                      className="w-full lg:w-auto"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      className="w-full lg:w-auto text-red-600 hover:text-red-700"
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
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Wedding Photography Package"
                />
              </div>
              
              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <select
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => handleInputChange("serviceType", e.target.value)}
                  className="flex h-10 w-full rounded-full border border-purple-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">Select type</option>
                  {SERVICE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="pricingModel">Pricing Model *</Label>
                <select
                  id="pricingModel"
                  value={formData.pricingModel}
                  onChange={(e) => handleInputChange("pricingModel", e.target.value)}
                  className="flex h-10 w-full rounded-full border border-purple-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">Select model</option>
                  {PRICING_MODELS.map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="baseRate">Base Rate (₹) *</Label>
                <Input
                  id="baseRate"
                  type="number"
                  value={formData.baseRate}
                  onChange={(e) => handleInputChange("baseRate", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minGuests">Min Guests</Label>
                  <Input
                    id="minGuests"
                    type="number"
                    value={formData.minGuests || ""}
                    onChange={(e) => handleInputChange("minGuests", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="maxGuests">Max Guests</Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    value={formData.maxGuests || ""}
                    onChange={(e) => handleInputChange("maxGuests", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe your service..."
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="inclusions">Inclusions (What&apos;s included)</Label>
                <Textarea
                  id="inclusions"
                  value={formData.inclusions}
                  onChange={(e) => handleInputChange("inclusions", e.target.value)}
                  placeholder="e.g., 8 hours coverage, 2 photographers, album"
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="exclusions">Exclusions (What&apos;s not included)</Label>
                <Textarea
                  id="exclusions"
                  value={formData.exclusions}
                  onChange={(e) => handleInputChange("exclusions", e.target.value)}
                  placeholder="e.g., Travel charges, additional hours"
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  {formData.isActive ? "Service is active and visible to customers" : "Service is inactive and hidden from customers"}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : (editingService ? "Update Service" : "Create Service")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
