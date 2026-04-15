"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building, Calendar, DollarSign, Plus, Search, CheckCircle2, Clock, Star,
  MapPin, Edit2, Save, X, Upload, RefreshCw, Loader2, AlertCircle, Image, Users,
  ArrowLeft, ArrowRight, Settings2, ShieldCheck, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { getImageUrl } from "@/lib/utils";

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

function VenueDetailsContent() {
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

  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/venues/my");
      const venueList = response.data || [];
      setVenues(venueList);

      const venueId = searchParams?.get('id');
      const isNew = searchParams?.get('new') === 'true';

      if (isNew) {
        setSelectedVenue(null);
        setFormData({
            name: "", type: "BANQUET_HALL", description: "", city: "", area: "",
            address: "", pincode: "", capacityMin: 50, capacityMax: 200,
            basePriceMorning: 0, basePriceEvening: 0, basePriceFullDay: 0,
            images: [], amenities: [], status: "PENDING_APPROVAL", verified: false
        });
        setImagePreviews([]);
        setImageFiles([]);
        setIsEditing(true);
      } else if (venueId) {
        const id = parseInt(venueId);
        const venueToSelect = venueList.find((v: any) => v.id === id);
        
        if (venueToSelect) {
          setSelectedVenue(venueToSelect);
          let parsedAmenities: string[] = [];
          const rawAmenities = (venueToSelect as any).amenities;
          if (rawAmenities) {
            if (Array.isArray(rawAmenities)) parsedAmenities = rawAmenities;
            else if (typeof rawAmenities === 'string') {
              parsedAmenities = rawAmenities.split(',').map((a: string) => a.trim()).filter((a: string) => a);
            }
          }
          
          const rawImages = venueToSelect.images || 
                            (venueToSelect as any).venueImages || 
                            (venueToSelect as any).photos || [];
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
            images: rawImages.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean),
            amenities: parsedAmenities,
            status: venueToSelect.status || "PENDING_APPROVAL",
            verified: venueToSelect.verified || false,
            ownerId: venueToSelect.ownerId,
            id: venueToSelect.id,
          });
          setImagePreviews(rawImages.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean));
          setIsEditing(true); // FIX: Entering edit mode when ID is found
        }
      } else {
        setSelectedVenue(null);
        setIsEditing(false);
        
        // UX Optimization: If only ONE venue exists and no ID is specified, 
        // automatically select it for immediate reconfiguration
        if (venueList.length === 1 && !venueId && !isNew) {
           router.push(`/dashboard/venue/details?id=${venueList[0].id}`);
        }
      }
    } catch (error: any) {
      console.error("Failed to load venues:", error);
      if (error?.response?.status !== 404) {
        toast.error("Failed to load property data");
      }
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { toast.error("Venue name is required"); return false; }
    if (!formData.description.trim()) { toast.error("Provide a property description"); return false; }
    if (!formData.city.trim() || !formData.area.trim()) { toast.error("Location details are required"); return false; }
    if (formData.capacityMin >= formData.capacityMax) { toast.error("Invalid capacity range"); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      let finalImageUrls = [...(formData.images || [])];
      
      if (imageFiles.length > 0) {
        const base64Images = await Promise.all(
          imageFiles.map(file => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          }))
        );
        finalImageUrls = [...finalImageUrls, ...base64Images];
      }

      // Omit non-whitelisted frontend-only or backend-readonly properties
      const { 
        images, status, verified, id, ownerId, createdAt, updatedAt, ...cleanFormData 
      } : any = formData;

      const venueData = {
        ...cleanFormData,
        amenities: formData.amenities.join(', '),
        venueImages: finalImageUrls,
      };

      if (selectedVenue?.id) {
        await api.patch(`/venues/${selectedVenue.id}`, venueData);
        toast.success("Venue profile synchronized successfully");
      } else {
        await api.post("/venues", venueData);
        toast.success("New venue provisioned successfully");
      }

      router.push('/dashboard/venue/details');
      loadVenues();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Operational failure during save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/venue/details');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    const newImages = [...(formData.images || [])];
    const existingCount = newImages.length;
    
    if (index < existingCount) {
        newImages.splice(index, 1);
        setFormData(prev => ({ ...prev, images: newImages }));
    } else {
        setImageFiles(prev => prev.filter((_, i) => i !== (index - existingCount)));
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      PENDING_APPROVAL: { className: "bg-amber-100 text-amber-700 border-amber-200", label: "Verification Pending" },
      ACTIVE: { className: "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm", label: "Live & Active" },
      INACTIVE: { className: "bg-neutral-100 text-neutral-500", label: "Offline" },
      REJECTED: { className: "bg-red-100 text-red-700 border-red-200", label: "Rejected" },
    };
    const { className, label } = config[status] || { className: "bg-neutral-100", label: status };
    return <Badge className={cn("px-3 py-1 font-bold tracking-tighter uppercase text-[10px] rounded-full", className)}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-12 w-12 rounded-full border-4 border-silver-800 border-t-black animate-spin" />
        <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Authenticating Profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-[#0a0a0b] text-white selection:bg-blue-500/30 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Inventory <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Assets</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-1">
            {isEditing ? (selectedVenue ? `Reconfiguring ${selectedVenue.name}` : "Strategic Asset Provisioning") : "Manage industrial real estate portfolio"}
          </p>
        </div>
        
        {!isEditing ? (
          <Button 
            onClick={() => router.push("/dashboard/venue/details?new=true")}
            className="bg-black hover:bg-neutral-800 text-white font-bold h-12 px-6 shadow-xl shadow-black/10 transition-all rounded-full"
          >
            <Plus className="h-5 w-5 mr-2" /> Add New Asset
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleCancel} className="hover:bg-white shadow-sm transition-all rounded-full">
               <ArrowLeft className="h-4 w-4 mr-2" /> Back to Assets
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200 font-black h-12 px-8 shadow-xl shadow-white/5 transition-all rounded-full"
            >
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Synchronize Asset
            </Button>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {venues.length === 0 ? (
              <Card className="col-span-full border-none shadow-2xl bg-white/50 backdrop-blur-xl py-24 border-dashed border-2 border-silver-300">
                <CardContent className="flex flex-col items-center">
                  <div className="p-6 bg-white rounded-3xl shadow-xl mb-6">
                    <Building className="h-12 w-12 text-neutral-300" />
                  </div>
                  <h3 className="text-2xl font-black text-black mb-2">Portfolio Empty</h3>
                  <p className="text-neutral-500 font-medium mb-8">Establish your first commercial venue listing</p>
                  <Button 
                    onClick={() => router.push("/dashboard/venue/details?new=true")}
                    className="bg-black hover:bg-neutral-800 text-white px-8 h-12 font-bold transition-all rounded-full"
                  >
                    Initialize First Asset
                  </Button>
                </CardContent>
              </Card>
            ) : (
              venues.map((venue, i) => (
                <motion.div
                  key={venue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="border-none shadow-2xl shadow-silver-200/50 bg-white/80 backdrop-blur-xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                    <div className="aspect-[16/10] relative bg-neutral-100 overflow-hidden">
                      {venue.images?.[0] ? (
                        <img 
                          src={getImageUrl(venue.images[0])} 
                          alt={venue.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop";
                            (e.target as HTMLImageElement).className = "w-full h-full object-cover grayscale opacity-50";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-neutral-50 to-neutral-200 p-6 text-center">
                          <Building className="h-10 w-10 text-neutral-400 mb-2" />
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Photo Required</p>
                          <p className="text-[8px] text-neutral-400 mt-1">Visit details to upload images</p>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 z-10">{getStatusBadge(venue.status)}</div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                         <p className="text-white text-xs font-bold uppercase tracking-widest">Property ID: #PRO-00{venue.id}</p>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-black text-black group-hover:text-silver-600 transition-colors">{venue.name}</h3>
                        <p className="text-sm font-medium text-neutral-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {venue.area}, {venue.city}
                        </p>
                      </div>
                      
                      <div className="flex gap-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <div className="flex-1 text-center">
                          <p className="text-[10px] uppercase font-bold text-neutral-400">Capacity</p>
                          <p className="text-sm font-black text-black">{venue.capacityMax}</p>
                        </div>
                        <div className="w-px h-8 bg-neutral-200" />
                        <div className="flex-1 text-center">
                          <p className="text-[10px] uppercase font-bold text-neutral-400">Base Price</p>
                          <p className="text-sm font-black text-black">₹{Math.min(venue.basePriceEvening || 0, venue.basePriceFullDay || 99999).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          className="flex-1 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl h-11 transition-all"
                          onClick={() => router.push(`/dashboard/venue/details?id=${venue.id}`)}
                        >
                          Manage Asset
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-neutral-200 hover:bg-white p-0 w-11 h-11 rounded-xl shadow-sm transition-all"
                          onClick={() => router.push(`/dashboard/venue/calendar?venueId=${venue.id}`)}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
            
            {venues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => router.push("/dashboard/venue/details?new=true")}
                className="border-2 border-dashed border-silver-300 rounded-[2rem] bg-white/30 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-black transition-all duration-300 min-h-[400px]"
              >
                  <div className="p-4 bg-white rounded-2xl shadow-lg mb-4">
                    <Plus className="h-8 w-8 text-black" />
                  </div>
                  <span className="font-black text-neutral-400 uppercase tracking-widest text-xs">Provision New Asset</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Main Form Fields */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-none shadow-2xl shadow-silver-200/50 bg-white/80 backdrop-blur-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-silver-400 via-black to-silver-400" />
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black shadow-lg">
                       <Building className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black text-black">Core Specifications</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Asset Title *</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          placeholder="e.g. Royal Imperial Ballroom" 
                          className="h-12 bg-white/50 border-neutral-200 focus:border-black focus:ring-black transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Category</Label>
                        <select 
                          className="flex h-12 w-full rounded-md border border-neutral-200 bg-white/50 px-3 py-2 text-sm focus:border-black focus:ring-black outline-none transition-all" 
                          value={formData.type} 
                          onChange={(e) => setFormData({...formData, type: e.target.value})}
                        >
                            {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Professional Description *</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                      rows={5} 
                      placeholder="Detail the property features, history, and USPs..."
                      className="bg-white/50 border-neutral-200 focus:border-black focus:ring-black transition-all resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-2xl shadow-silver-200/50 bg-white/80 backdrop-blur-xl overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-silver-400 via-black to-silver-400" />
                 <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black shadow-lg">
                       <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black text-black">Geographic Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">City *</Label>
                      <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="h-12 bg-white/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Regional Area *</Label>
                      <Input value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className="h-12 bg-white/50" />
                    </div>
                    <div className="col-span-full space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Full Operational Address *</Label>
                      <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-12 bg-white/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Postal Code</Label>
                      <Input value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className="h-12 bg-white/50" />
                    </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-2xl shadow-silver-200/50 bg-white/80 backdrop-blur-xl overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-silver-400 via-black to-silver-400" />
                 <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black shadow-lg">
                       <Image className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black text-black">Visual Media</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div 
                    className="border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center bg-neutral-50/50 cursor-pointer hover:bg-white hover:border-black transition-all group"
                    onClick={() => document.getElementById('image-input')?.click()}
                  >
                    <input id="image-input" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                    <div className="p-4 bg-white rounded-2xl shadow-lg w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="h-8 w-8 text-black" />
                    </div>
                    <p className="text-sm font-black text-black">Upload High-Definition Asset Photos</p>
                    <p className="text-xs text-neutral-400 mt-2 font-medium">Recommended resolution: 1920x1080px (Max 10 images)</p>
                  </div>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
                      {imagePreviews.map((p, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group border border-neutral-100 shadow-lg">
                          <img src={getImageUrl(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <button 
                            onClick={() => removeImage(i)} 
                            className="absolute top-2 right-2 h-7 w-7 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-8">
              <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-black" />
                 <CardHeader className="pb-4"><CardTitle className="text-xl font-black text-black">Operational Load</CardTitle></CardHeader>
                 <CardContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Min Capacity</Label>
                        <Input type="number" value={formData.capacityMin} onChange={(e) => setFormData({...formData, capacityMin: parseInt(e.target.value) || 0})} className="h-11 bg-white/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Max Capacity</Label>
                        <Input type="number" value={formData.capacityMax} onChange={(e) => setFormData({...formData, capacityMax: parseInt(e.target.value) || 0})} className="h-11 bg-white/50" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <Users className="h-4 w-4 text-blue-600" />
                        <p className="text-[10px] font-bold text-blue-800 uppercase italic">Capacity optimization recommended</p>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600" />
                 <CardHeader className="pb-4"><CardTitle className="text-xl font-black text-black">Revenue Structure (₹)</CardTitle></CardHeader>
                 <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Morning Slot (06:00 - 12:00)</Label>
                      <Input type="number" value={formData.basePriceMorning} onChange={(e) => setFormData({...formData, basePriceMorning: parseInt(e.target.value) || 0})} className="h-11 bg-white/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Evening Slot (18:00 - 23:00)</Label>
                      <Input type="number" value={formData.basePriceEvening} onChange={(e) => setFormData({...formData, basePriceEvening: parseInt(e.target.value) || 0})} className="h-11 bg-white/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Full Day Utilization</Label>
                      <Input type="number" value={formData.basePriceFullDay} onChange={(e) => setFormData({...formData, basePriceFullDay: parseInt(e.target.value) || 0})} className="h-11 bg-white/50" />
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-black" />
                 <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-black" />
                        <CardTitle className="text-xl font-black text-black">Premium Amenities</CardTitle>
                    </div>
                 </CardHeader>
                 <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      {AMENITIES_OPTIONS.map(a => (
                        <Badge 
                          key={a}
                          variant={formData.amenities.includes(a) ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer py-1.5 px-3 rounded-lg transition-all text-[10px] font-bold uppercase tracking-tighter",
                            formData.amenities.includes(a) ? "bg-black text-white hover:bg-neutral-800 shadow-md" : "border-neutral-200 hover:border-black text-neutral-500"
                          )}
                          onClick={() => toggleAmenity(a)}
                        >
                          {a}
                        </Badge>
                      ))}
                    </div>
                 </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VenueDetailsPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin h-8 w-8 text-neutral-400" />
        </div>
    }>
      <VenueDetailsContent />
    </Suspense>
  );
}
