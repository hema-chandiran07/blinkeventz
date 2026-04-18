"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, X, RefreshCw, Building2, MapPin, Loader2, 
  ShieldAlert, Settings2, Maximize2, CreditCard, Zap, Star, Users
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface VenueEdit {
  id: number;
  name: string;
  type: string;
  description?: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning: number;
  basePriceEvening: number;
  basePriceFullDay: number;
  amenities?: string;
}

export default function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "HALL",
    description: "",
    address: "",
    city: "",
    area: "",
    pincode: "",
    capacityMin: 0,
    capacityMax: 0,
    basePriceMorning: 0,
    basePriceEvening: 0,
    basePriceFullDay: 0,
    amenities: "",
  });

  useEffect(() => {
    loadVenue();
  }, [resolvedParams.id]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      // Fetching from the administrative dossier endpoint
      const response = await api.get(`/venues/admin/${resolvedParams.id}`);
      const data = response.data;
      
      setFormData({
        name: data.name || "",
        type: data.type || "HALL",
        description: data.description || "",
        address: data.address || "",
        city: data.city || "",
        area: data.area || "",
        pincode: data.pincode || "",
        capacityMin: data.capacityMin || 0,
        capacityMax: data.capacityMax || 0,
        basePriceMorning: data.basePriceMorning || 0,
        basePriceEvening: data.basePriceEvening || 0,
        basePriceFullDay: data.basePriceFullDay || 0,
        amenities: data.amenities || "",
      });
    } catch (error: any) {
      console.error("Registry Sync Failure:", error);
      toast.error("Failed to extract asset dossier from registry");
      router.push("/dashboard/admin/venues");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.city || !formData.address) {
      toast.error("Validation Failure: Mandatory registry fields missing");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/venues/${resolvedParams.id}`, formData);
      toast.success("Venue registry updated successfully");
      router.push(`/dashboard/admin/venues/${resolvedParams.id}`);
    } catch (error: any) {
      console.error("Registry Update Failure:", error);
      toast.error(error?.response?.data?.message || "Internal Registry Error during protocol update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-black" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Syncing Asset Record</p>
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
            <h1 className="text-3xl font-black text-black uppercase tracking-tight">Modify Asset Dossier</h1>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mt-1">
              Updating Node #{resolvedParams.id} Portfolio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-12 border-neutral-200 border-2 rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <X className="h-4 w-4 mr-2" /> Discard
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="h-12 bg-black text-white px-8 rounded-xl font-bold border-b-4 border-neutral-900 active:border-b-0 transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            COMMIT PROTOCOL
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-8">
          <Card className="border-[3px] border-neutral-100 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Technical Specifications</CardTitle>
              <Building2 className="h-5 w-5 text-neutral-300" />
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Venue Identity *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-14 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                    placeholder="Grand Ballroom, etc."
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Asset Type</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="flex h-14 w-full items-center justify-between rounded-2xl border-2 border-neutral-100 bg-white px-3 py-2 text-sm font-bold focus:border-black focus:outline-none transition-all"
                  >
                    <option value="HALL">Hall</option>
                    <option value="MANDAPAM">Mandapam</option>
                    <option value="LAWN">Lawn</option>
                    <option value="RESORT">Resort</option>
                    <option value="BANQUET">Banquet</option>
                    <option value="HOTEL">Hotel</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Marketing Bio & History</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[140px] bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all p-6 resize-none"
                  placeholder="Official description for market facing pages..."
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="amenities" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Amenity Tags (Comma Sep)</Label>
                <Input
                  id="amenities"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="h-14 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all italic placeholder:not-italic font-mono text-xs"
                  placeholder="AC, Power Backup, Valet, Parking..."
                />
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Min Capacity</Label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" />
                      <Input
                        type="number"
                        value={formData.capacityMin}
                        onChange={(e) => setFormData({ ...formData, capacityMin: parseInt(e.target.value) || 0 })}
                        className="h-14 pl-12 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                      />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Max Capacity</Label>
                    <div className="relative">
                      <Maximize2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" />
                      <Input
                        type="number"
                        value={formData.capacityMax}
                        onChange={(e) => setFormData({ ...formData, capacityMax: parseInt(e.target.value) || 0 })}
                        className="h-14 pl-12 bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all"
                      />
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="border-[3px] border-neutral-100 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-black px-8 py-6 border-b-2 border-neutral-900 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white">Geospatial Index</CardTitle>
              <MapPin className="h-5 w-5 text-neutral-500" />
            </CardHeader>
            <CardContent className="p-10 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Street Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="min-h-[80px] bg-white border-2 border-neutral-100 focus:border-black rounded-2xl font-bold transition-all p-4 resize-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-neutral-400">City</Label>
                  <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="h-12 rounded-xl border-2 border-neutral-100 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-neutral-400">Area</Label>
                  <Input value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="h-12 rounded-xl border-2 border-neutral-100 font-bold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[3px] border-neutral-100 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Economic Tiers</CardTitle>
              <CreditCard className="h-5 w-5 text-neutral-300" />
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {[
                { id: 'basePriceMorning', label: 'Morning Cluster (₹)', icon: Zap },
                { id: 'basePriceEvening', label: 'Evening Cluster (₹)', icon: Star },
                { id: 'basePriceFullDay', label: 'Full Protocol (₹)', icon: Maximize2 },
              ].map((tier) => (
                <div key={tier.id} className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{tier.label}</Label>
                  <div className="relative">
                    <tier.icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                    <Input
                      type="number"
                      value={(formData as any)[tier.id]}
                      onChange={(e) => setFormData({ ...formData, [tier.id]: parseInt(e.target.value) || 0 })}
                      className="h-12 pl-10 bg-white border-2 border-neutral-100 focus:border-black rounded-xl font-black text-sm"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="p-8 border-[3px] border-amber-100 bg-amber-50/30 rounded-[2.5rem] flex items-start gap-4 shadow-sm">
            <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Audit Protocol Warning</p>
               <p className="text-xs font-bold text-amber-900/70 leading-relaxed">
                 Administrative overrides modify core asset metadata without owner verification. Ensure property documents have been cross-checked in the Ownership tab.
               </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
