"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Building, Mail, Phone, MapPin, DollarSign, Edit2, Save, X, CheckCircle2,
  Upload, Users, Camera, Clock, XCircle, Loader2, AlertCircle, ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/utils";

// ==================== Types ====================
interface VenueProfile {
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
  status: "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELISTED";
  verified: boolean;
  images: string[];
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

// ==================== Main Component ====================
export default function VenueProfilePage() {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<VenueProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState<VenueProfile>({
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
    status: "PENDING_APPROVAL",
    verified: false,
    images: [],
  });

  // Load venue profile (first venue by owner)
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/venues/my");
      
      // Take the first venue if multiple exist
      const venueData = Array.isArray(response.data) ? response.data[0] : response.data;

      if (venueData) {
        setProfile(venueData);
        setFormData({
          name: venueData.name || "",
          type: venueData.type || "BANQUET_HALL",
          description: venueData.description || "",
          city: venueData.city || "",
          area: venueData.area || "",
          address: venueData.address || "",
          pincode: venueData.pincode || "",
          capacityMin: venueData.capacityMin || 50,
          capacityMax: venueData.capacityMax || 200,
          basePriceMorning: venueData.basePriceMorning || 0,
          basePriceEvening: venueData.basePriceEvening || 0,
          basePriceFullDay: venueData.basePriceFullDay || 0,
          status: venueData.status || "PENDING_APPROVAL",
          verified: venueData.verified || false,
          images: venueData.venueImages || [],
        });
      }
    } catch (error: any) {
      console.error("Failed to load venue profile:", error);
      if (error?.response?.status !== 404) {
        toast.error("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Property name is required");
      return false;
    }
    if (!formData.city || !formData.area) {
      toast.error("Location details are required");
      return false;
    }
    if (formData.capacityMax < formData.capacityMin) {
      toast.error("Max capacity cannot be less than min capacity");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      // Omit non-editable fields if necessary, or pass the whole cleaned object
      const payload = {
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
      };

      await api.patch("/venues/my", payload);
      toast.success("Venue profile synchronized successfully!");
      await loadProfile();
      setIsEditing(false);
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;
        try {
          await api.patch('/users/me', { image: base64String });
          toast.success("Owner avatar updated!");
          await refreshUser();
        } catch (error: any) {
          console.error("Failed to update avatar:", error);
          toast.error("Failed to update avatar");
        } finally {
          setUploadingAvatar(false);
          if (e.target) e.target.value = '';
        }
      };
    } catch (error: any) {
      console.error("Avatar upload failure:", error);
      toast.error("Failed to process image");
      setUploadingAvatar(false);
    }
  };

  const statusConfig: any = {
    PENDING_APPROVAL: { color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock, label: "Under Review" },
    ACTIVE: { color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2, label: "Live & Active" },
    INACTIVE: { color: "bg-neutral-100 text-neutral-600 border-neutral-300", icon: XCircle, label: "Offline" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs">Accessing Portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-neutral-100 flex items-center justify-center relative">
              {uploadingAvatar ? (
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              ) : user?.image ? (
                <img 
                  src={getImageUrl(user.image)} 
                  alt="Owner" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building className="h-8 w-8 text-neutral-300" />
              )}
              
              <Label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Update</span>
              </Label>
              <input 
                type="file" 
                id="avatar-upload" 
                className="hidden" 
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                accept="image/*"
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-black">Venue Profile</h1>
            <p className="text-neutral-500 font-medium">Manage your strategic property listing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <Badge className={cn("px-4 py-1.5 font-bold uppercase tracking-tight gap-2", statusConfig[profile.status]?.color || "bg-neutral-100")}>
              {statusConfig[profile.status]?.icon && <statusConfig.PENDING_APPROVAL.icon className="h-3.5 w-3.5" />}
              {statusConfig[profile.status]?.label || profile.status}
            </Badge>
          )}

          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2 bg-black hover:bg-neutral-800 text-white font-bold h-11 px-6 rounded-xl">
              <Edit2 className="h-4 w-4" />
              Modify Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="h-11 px-4 border-neutral-200 rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Warning */}
      {!profile && !isEditing && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm border-2">
          <CardContent className="py-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-amber-600 mt-1" />
              <div>
                <h3 className="font-black text-amber-900 text-lg">Inventory Empty</h3>
                <p className="text-amber-700 font-medium mt-1">
                  You haven't established a primary venue profile yet. Please initialize your listing to start receiving luxury event bookings.
                </p>
                <Button onClick={() => setIsEditing(true)} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                  <Edit2 className="h-4 w-4" />
                  Initialize Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Specifications & Location */}
        <div className="lg:col-span-2 space-y-8">
          {/* Core Property Specs */}
          <Card className="border-none shadow-xl shadow-neutral-100 bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-black" />
            <CardHeader>
              <CardTitle className="text-2xl font-black text-black">Property Specifications</CardTitle>
              <CardDescription className="text-neutral-400 font-medium tracking-tight">Establish core asset credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Venue Title *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={!isEditing}
                    className="border-neutral-200 bg-neutral-50/50 text-black font-bold focus:ring-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Property Category</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm text-black font-bold focus:ring-black outline-none transition-all"
                  >
                    {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Asset Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  disabled={!isEditing}
                  rows={6}
                  className="border-neutral-200 bg-neutral-50/50 text-black font-medium resize-none focus:ring-black"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location details */}
          <Card className="border-none shadow-xl shadow-neutral-100 bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-neutral-200" />
            <CardHeader>
              <CardTitle className="text-2xl font-black text-black">Geographic Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Operational City *</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} disabled={!isEditing} className="bg-neutral-50/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Strategic Area *</Label>
                  <Input value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} disabled={!isEditing} className="bg-neutral-50/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Full Corporate Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} disabled={!isEditing} className="pl-10 bg-neutral-50/50" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing & Performance */}
        <div className="space-y-8">
          {/* Revenue Structure */}
          <Card className="border-none shadow-xl shadow-neutral-100 bg-white overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600" />
             <CardHeader>
                <CardTitle className="text-xl font-black text-black">Revenue Structure</CardTitle>
             </CardHeader>
             <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Morning Slot (₹)</Label>
                  <Input type="number" value={formData.basePriceMorning} onChange={(e) => setFormData({...formData, basePriceMorning: parseInt(e.target.value) || 0})} disabled={!isEditing} className="h-11 bg-neutral-50/50 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Evening Slot (₹)</Label>
                  <Input type="number" value={formData.basePriceEvening} onChange={(e) => setFormData({...formData, basePriceEvening: parseInt(e.target.value) || 0})} disabled={!isEditing} className="h-11 bg-neutral-50/50 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Full Day Utilization (₹)</Label>
                  <Input type="number" value={formData.basePriceFullDay} onChange={(e) => setFormData({...formData, basePriceFullDay: parseInt(e.target.value) || 0})} disabled={!isEditing} className="h-11 bg-neutral-50/50 font-bold" />
                </div>
             </CardContent>
          </Card>

          {/* Operational Metrics */}
          <Card className="border-none shadow-xl shadow-neutral-100 bg-white overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
             <CardHeader>
                <CardTitle className="text-xl font-black text-black">Operational Load</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Min Capacity</Label>
                    <Input type="number" value={formData.capacityMin} onChange={(e) => setFormData({...formData, capacityMin: parseInt(e.target.value) || 0})} disabled={!isEditing} className="bg-neutral-50/50 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Max Capacity</Label>
                    <Input type="number" value={formData.capacityMax} onChange={(e) => setFormData({...formData, capacityMax: parseInt(e.target.value) || 0})} disabled={!isEditing} className="bg-neutral-50/50 font-bold" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-tight">Capacity range affects search ranking</p>
                </div>
             </CardContent>
          </Card>

          {/* Trust Badge */}
          <Card className="border-none shadow-xl shadow-neutral-100 bg-black text-white overflow-hidden relative">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-black text-lg">Identity Verification</h4>
                  <p className="text-zinc-400 text-xs mt-1">Verified properties receive 3.4x more inquiry volume</p>
                </div>
                <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-900 font-bold uppercase text-[10px] tracking-widest h-10">
                   Submit Credentials
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
