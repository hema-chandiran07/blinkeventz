"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, X, RefreshCw, Store, MapPin, Phone, Mail, Loader2, 
  ShieldAlert, Settings2, Briefcase, FileText
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface VendorEdit {
  id: number;
  businessName: string;
  description?: string;
  city: string;
  area: string;
  serviceCategory?: string;
  serviceRadiusKm?: number;
  user?: {
    email: string;
    phone?: string;
  };
}

export default function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    description: "",
    city: "",
    area: "",
    serviceCategory: "",
    serviceRadiusKm: 0,
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadVendor();
  }, [resolvedParams.id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      // Fetching from the administrative endpoint to ensure full record parity
      const response = await api.get(`/vendors/admin/${resolvedParams.id}`);
      const data = response.data;
      
      setFormData({
        businessName: data.businessName || "",
        description: data.description || "",
        city: data.city || "",
        area: data.area || "",
        serviceCategory: data.serviceCategory || "",
        serviceRadiusKm: data.serviceRadiusKm || 0,
        phone: data.user?.phone || "",
        email: data.user?.email || "",
      });
    } catch (error: any) {
      console.error("Transmission Error:", error);
      toast.error("Failed to extract vendor dossier from registry");
      router.push("/dashboard/admin/vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.businessName || !formData.city) {
      toast.error("Validation Failure: Critical fields missing");
      return;
    }

    setSaving(true);
    try {
      // Direct patch to the vendor record
      await api.patch(`/vendors/${resolvedParams.id}`, formData);
      toast.success("Vendor registry updated successfully");
      router.push(`/dashboard/admin/vendors/${resolvedParams.id}`);
    } catch (error: any) {
      console.error("Registry Sync Failure:", error);
      toast.error(error?.response?.data?.message || "Internal Registry Error during update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-black" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Synchronizing Vendor Record</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Industrial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b-2 border-neutral-100">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="h-12 w-12 rounded-2xl border-2 border-neutral-100 hover:border-black hover:bg-neutral-50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-black uppercase tracking-tight">Modify Registry Profile</h1>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mt-1">
              Updating Identity Index #{resolvedParams.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-12 border-neutral-200 border-2 rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <X className="h-4 w-4 mr-2" /> Discard Changes
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="h-12 bg-black text-white px-8 rounded-xl font-bold border-b-4 border-neutral-900 active:border-b-0 transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            COMMIT UPDATES
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-8">
          <Card className="border-[3px] border-neutral-100 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Core Business Data</CardTitle>
              <Briefcase className="h-5 w-5 text-neutral-300" />
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Business Identity *</Label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" />
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="h-14 pl-12 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                    placeholder="Enter official business name"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Market Profile / Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[160px] bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all p-6 resize-none"
                  placeholder="Describe the specialized services and value proposition..."
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="serviceCategory" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Operational Category</Label>
                  <Input
                    id="serviceCategory"
                    value={formData.serviceCategory}
                    onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                    className="h-14 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                    placeholder="e.g., Photography, Catering"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="serviceRadiusKm" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Service Radius (KM)</Label>
                  <Input
                    id="serviceRadiusKm"
                    type="number"
                    value={formData.serviceRadiusKm}
                    onChange={(e) => setFormData({ ...formData, serviceRadiusKm: parseInt(e.target.value) || 0 })}
                    className="h-14 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="border-[3px] border-neutral-100 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-black px-8 py-6 border-b-2 border-neutral-900 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white">Logistics & Contact</CardTitle>
              <Settings2 className="h-5 w-5 text-neutral-500" />
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Operations Hub (City) *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-14 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all italic placeholder:not-italic"
                    placeholder="Primary City"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="area" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Operational Area</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="h-14 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                    placeholder="Region/Zone"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Administrative Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-14 pl-12 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                    placeholder="contact@business.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Operations Hotline</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-14 pl-12 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-8 border-[3px] border-amber-100 bg-amber-50/30 rounded-[2.5rem] flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
            <div className="space-y-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Administrative Override</p>
               <p className="text-xs font-bold text-amber-900 leading-relaxed">
                 Updating these fields will bypass standard vendor self-service rules. Ensure all changes are verified against official KYC documentation.
               </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
