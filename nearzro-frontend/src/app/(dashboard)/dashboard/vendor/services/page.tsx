"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";

const SERVICE_TYPES = ["CATERING", "DECOR", "PHOTOGRAPHY", "MAKEUP", "DJ", "MUSIC", "CAR_RENTAL", "PRIEST", "OTHER"];
const PRICING_MODELS = ["PER_EVENT", "PER_PERSON", "PER_DAY", "PACKAGE"];

export default function VendorServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    serviceType: "PHOTOGRAPHY",
    pricingModel: "PER_EVENT",
    baseRate: "",
    description: "",
    inclusions: "",
    exclusions: "",
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENDOR") {
      router.push("/login");
    }

    // If editing, load service data
    const serviceId = searchParams.get('id');
    if (serviceId) {
      loadService(serviceId);
    }
  }, [isAuthenticated, user, router, searchParams]);

  const loadService = async (serviceId: string) => {
    try {
      const response = await api.get(`/vendor-services/vendor/me`);
      const services = extractArray<any>(response);
      const service = services.find((s: any) => s.id === Number(serviceId));
      if (service) {
        setFormData({
          name: service.name,
          serviceType: service.serviceType,
          pricingModel: service.pricingModel,
          baseRate: service.baseRate.toString(),
          description: service.description || "",
          inclusions: service.inclusions || "",
          exclusions: service.exclusions || "",
        });
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error loading service:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const serviceData = {
        ...formData,
        baseRate: parseInt(formData.baseRate),
      };

      if (isEditing) {
        await api.put(`/vendor-services/${searchParams.get('id')}`, serviceData);
        toast.success("Service updated successfully!");
      } else {
        await api.post("/vendor-services", serviceData);
        toast.success("Service created successfully!");
      }
      
      router.push("/dashboard/vendor");
    } catch (error: any) {
      console.error("Service error:", error);
      toast.error(error?.response?.data?.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.push("/dashboard/vendor")} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            {isEditing ? "Edit Service" : "Add New Service"}
          </h1>
          <p className="text-neutral-600">
            {isEditing ? "Update your service information" : "List your service and start getting bookings"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Premium Wedding Photography"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <select
                    id="serviceType"
                    className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    required
                  >
                    {SERVICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricingModel">Pricing Model *</Label>
                  <select
                    id="pricingModel"
                    className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={formData.pricingModel}
                    onChange={(e) => setFormData({ ...formData, pricingModel: e.target.value })}
                    required
                  >
                    {PRICING_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your service, what's included, and why customers should choose you..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseRate">Base Rate (₹) *</Label>
                <Input
                  id="baseRate"
                  type="number"
                  placeholder="50000"
                  value={formData.baseRate}
                  onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                  required
                />
                <p className="text-xs text-neutral-500">
                  This is the base price per {formData.pricingModel.toLowerCase().replace("_", " ")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inclusions">Inclusions</Label>
                <Textarea
                  id="inclusions"
                  placeholder="e.g., 8 hours coverage, 500 edited photos, 1 album, drone shots"
                  rows={3}
                  value={formData.inclusions}
                  onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exclusions">Exclusions</Label>
                <Textarea
                  id="exclusions"
                  placeholder="e.g., Travel charges extra, Additional hours charged separately"
                  rows={3}
                  value={formData.exclusions}
                  onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="premium"
              className="flex-1 h-12"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isEditing ? "Updating Service..." : "Creating Service..."}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  {isEditing ? "Update Service" : "Create Service"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="silver"
              className="flex-1 h-12"
              onClick={() => router.push("/dashboard/vendor")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
