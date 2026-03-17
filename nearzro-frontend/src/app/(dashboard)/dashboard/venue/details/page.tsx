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
import { Plus, ArrowLeft, Loader2, Upload, X, Image as ImageIcon, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
<<<<<<< Updated upstream
import { extractArray } from "@/lib/api-response";
=======
import { motion } from "framer-motion";
import Image from "next/image";
>>>>>>> Stashed changes

const VENUE_TYPES = ["HALL", "MANDAPAM", "LAWN", "RESORT", "BANQUET"];

interface VenuePhoto {
  id?: number;
  url: string;
  isCover?: boolean;
  file?: File;
}

export default function VenueDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<VenuePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "BANQUET",
    description: "",
    address: "",
    city: "Chennai",
    area: "",
    pincode: "",
    capacityMin: "",
    capacityMax: "",
    basePriceMorning: "",
    basePriceEvening: "",
    basePriceFullDay: "",
    amenities: "",
    policies: "",
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENUE_OWNER") {
      router.push("/login");
      return;
    }

    const id = searchParams.get('id');
    if (id) {
      setVenueId(Number(id));
      loadVenue(Number(id));
    }
  }, [isAuthenticated, user, router, searchParams]);

  const loadVenue = async (id: number) => {
    try {
      const response = await api.get('/venues/my');
<<<<<<< Updated upstream
      const venues = extractArray<any>(response);
      const venue = venues.find((v: any) => v.id === Number(venueId));
=======
      const venue = (response.data || []).find((v: any) => v.id === id);
>>>>>>> Stashed changes
      if (venue) {
        setFormData({
          name: venue.name,
          type: venue.type,
          description: venue.description || "",
          address: venue.address,
          city: venue.city,
          area: venue.area,
          pincode: venue.pincode,
          capacityMin: venue.capacityMin.toString(),
          capacityMax: venue.capacityMax.toString(),
          basePriceMorning: venue.basePriceMorning?.toString() || "",
          basePriceEvening: venue.basePriceEvening?.toString() || "",
          basePriceFullDay: venue.basePriceFullDay?.toString() || "",
          amenities: venue.amenities || "",
          policies: venue.policies || "",
        });
        if (venue.photos && venue.photos.length > 0) {
          setPhotos(venue.photos.map((p: any) => ({
            id: p.id,
            url: p.url,
            isCover: p.isCover,
          })));
        }
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error loading venue:", error);
      toast.error("Failed to load venue details");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: VenuePhoto[] = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      file,
      isCover: photos.length === 0,
    }));

    setPhotos([...photos, ...newPhotos]);
    toast.success(`${files.length} photo(s) added`);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    toast.info("Photo removed");
  };

  const handleSetCoverPhoto = (index: number) => {
    setPhotos(photos.map((p, i) => ({
      ...p,
      isCover: i === index,
    })));
    toast.success("Cover photo updated");
  };

  const uploadPhotos = async (createdVenueId: number) => {
    const photosToUpload = photos.filter(p => p.file);
    if (photosToUpload.length === 0) return;

    setUploading(true);
    try {
      for (const photo of photosToUpload) {
        if (photo.file) {
          const formData = new FormData();
          formData.append('photo', photo.file);
          formData.append('isCover', photo.isCover ? 'true' : 'false');
          
          await api.post(`/venues/${createdVenueId}/photos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      toast.success("Photos uploaded successfully");
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("Failed to upload some photos");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const venueData = {
        ...formData,
        capacityMin: formData.capacityMin ? parseInt(formData.capacityMin) : 0,
        capacityMax: formData.capacityMax ? parseInt(formData.capacityMax) : 0,
        basePriceMorning: parseInt(formData.basePriceMorning) || 0,
        basePriceEvening: parseInt(formData.basePriceEvening) || 0,
        basePriceFullDay: parseInt(formData.basePriceFullDay) || 0,
      };

      let createdVenueId: number | null = null;

      if (isEditing && venueId) {
        await api.put(`/venues/${venueId}`, venueData);
        toast.success("Venue updated successfully!");
      } else {
        const response = await api.post("/venues", venueData);
        createdVenueId = response.data.id;
        toast.success("Venue created successfully! Awaiting admin approval.");

        // Upload photos after venue creation
        if (photos.length > 0 && createdVenueId) {
          await uploadPhotos(createdVenueId);
        }
      }

      router.push("/dashboard/venue");
    } catch (error: any) {
      console.error("Venue error:", error);
      toast.error(error?.response?.data?.message || "Failed to save venue");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenue = async () => {
    if (!venueId) return;
    
    if (!confirm("Are you sure you want to delete this venue? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/venues/${venueId}`);
      toast.success("Venue deleted successfully");
      router.push("/dashboard/venue");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete venue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.push("/dashboard/venue")} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">
                {isEditing ? "Edit Venue" : "Add New Venue"}
              </h1>
              <p className="text-neutral-600 mt-1">
                {isEditing ? "Update your venue information" : "List your venue and start getting bookings"}
              </p>
            </div>
            {isEditing && (
              <Button
                variant="outline"
                onClick={handleDeleteVenue}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Venue
              </Button>
            )}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-silver-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Venue Photos
                </CardTitle>
                <CardDescription>Upload high-quality images of your venue (max 10 photos)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-silver-200">
                      <Image
                        src={photo.url}
                        alt={`Venue photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {photo.isCover && (
                        <Badge className="absolute top-2 left-2 bg-black text-white">
                          Cover
                        </Badge>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetCoverPhoto(index)}
                          className="h-8 px-2"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemovePhoto(index)}
                          className="h-8 px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {photos.length < 10 && (
                    <label className="border-2 border-dashed border-silver-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-neutral-400 hover:bg-silver-50 transition-colors aspect-square">
                      <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                      <span className="text-sm text-neutral-600">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        multiple
                      />
                    </label>
                  )}
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading photos...
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-silver-200">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Grand Ballroom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Venue Type *</Label>
                    <select
                      id="type"
                      className="flex w-full rounded-md border border-silver-200 bg-white px-3 py-2 text-sm"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                    >
                      {VENUE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your venue's features, ambiance, and unique selling points..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Location Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-silver-200">
              <CardHeader>
                <CardTitle>Location Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Area *</Label>
                    <Input
                      id="area"
                      placeholder="e.g., T Nagar"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      placeholder="600001"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Capacity & Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-silver-200">
              <CardHeader>
                <CardTitle>Capacity & Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacityMin">Minimum Capacity *</Label>
                    <Input
                      id="capacityMin"
                      type="number"
                      placeholder="100"
                      value={formData.capacityMin}
                      onChange={(e) => setFormData({ ...formData, capacityMin: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacityMax">Maximum Capacity *</Label>
                    <Input
                      id="capacityMax"
                      type="number"
                      placeholder="500"
                      value={formData.capacityMax}
                      onChange={(e) => setFormData({ ...formData, capacityMax: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basePriceMorning">Morning Price (₹)</Label>
                    <Input
                      id="basePriceMorning"
                      type="number"
                      placeholder="50000"
                      value={formData.basePriceMorning}
                      onChange={(e) => setFormData({ ...formData, basePriceMorning: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basePriceEvening">Evening Price (₹)</Label>
                    <Input
                      id="basePriceEvening"
                      type="number"
                      placeholder="80000"
                      value={formData.basePriceEvening}
                      onChange={(e) => setFormData({ ...formData, basePriceEvening: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basePriceFullDay">Full Day Price (₹)</Label>
                    <Input
                      id="basePriceFullDay"
                      type="number"
                      placeholder="120000"
                      value={formData.basePriceFullDay}
                      onChange={(e) => setFormData({ ...formData, basePriceFullDay: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Amenities & Policies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="border-silver-200">
              <CardHeader>
                <CardTitle>Amenities & Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                  <Textarea
                    id="amenities"
                    placeholder="e.g., Parking, AC, Power Backup, WiFi, Catering"
                    rows={3}
                    value={formData.amenities}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policies">Policies (comma-separated)</Label>
                  <Textarea
                    id="policies"
                    placeholder="e.g., No smoking, No outside catering, Music till 10 PM only"
                    rows={3}
                    value={formData.policies}
                    onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex gap-4"
          >
            <Button
              type="submit"
              className="flex-1 h-12 bg-black hover:bg-neutral-800"
              disabled={loading || uploading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isEditing ? "Updating Venue..." : "Creating Venue..."}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  {isEditing ? "Update Venue" : "Create Venue"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => router.push("/dashboard/venue")}
            >
              Cancel
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
