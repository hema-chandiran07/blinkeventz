"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Image as ImageIcon, X, Star, Loader2, ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import Image from "next/image";

interface PortfolioImage {
  id?: number;
  url: string;
  caption?: string;
  isFeatured?: boolean;
  file?: File;
  serviceType?: string;
}

interface VendorProfile {
  id: number;
  businessName: string;
  images: string[];
}

export default function VendorPortfolioPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);
  const [caption, setCaption] = useState("");
  const [serviceType, setServiceType] = useState("");

  const SERVICE_TYPES = ["CATERING", "DECOR", "PHOTOGRAPHY", "MAKEUP", "DJ", "MUSIC", "CAR_RENTAL", "PRIEST", "OTHER"];

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENDOR") {
      router.push("/login");
      return;
    }
    loadVendorProfile();
  }, [isAuthenticated, user, router]);

  const loadVendorProfile = async () => {
    try {
      const response = await api.get('/vendors/me');
      const profile = response.data;
      setVendorProfile(profile);
      
      // Load existing portfolio images
      const existingImages = profile.images?.map((url: string) => ({
        url,
        isFeatured: false,
        caption: '',
      })) || [];
      setPortfolio(existingImages);
    } catch (error: any) {
      console.error("Failed to load vendor profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 10;
    const remainingSlots = maxFiles - portfolio.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`You can only upload ${maxFiles} images total. ${remainingSlots} more allowed.`);
    }

    const newPhotos: PortfolioImage[] = filesToProcess.map(file => ({
      url: URL.createObjectURL(file),
      file,
      isFeatured: portfolio.length === 0,
    }));

    setPortfolio([...portfolio, ...newPhotos]);
    toast.success(`${filesToProcess.length} image(s) added`);
  };

  const handleRemovePhoto = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
    toast.info("Image removed");
  };

  const handleSetFeatured = (index: number) => {
    setPortfolio(portfolio.map((p, i) => ({
      ...p,
      isFeatured: i === index,
    })));
    toast.success("Featured image updated");
  };

  const handleAddCaption = (image: PortfolioImage, index: number) => {
    setSelectedImage(image);
    setCaption(image.caption || "");
    setServiceType(image.serviceType || "");
    // Store the index for updating
    (selectedImage as any)._index = index;
  };

  const handleSaveCaption = async () => {
    if (!selectedImage) return;
    
    const index = (selectedImage as any)._index;
    const updated = [...portfolio];
    updated[index] = {
      ...updated[index],
      caption,
      serviceType,
    };
    setPortfolio(updated);
    setSelectedImage(null);
    setCaption("");
    setServiceType("");
    toast.success("Caption saved");
  };

  const handleSubmit = async () => {
    if (portfolio.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    if (!vendorProfile) return;

    setLoading(true);
    setUploading(true);

    try {
      // Upload new images
      const imagesToUpload = portfolio.filter(p => p.file);
      
      for (const photo of imagesToUpload) {
        if (photo.file) {
          const formData = new FormData();
          formData.append('image', photo.file);
          formData.append('caption', photo.caption || '');
          formData.append('isFeatured', photo.isFeatured ? 'true' : 'false');
          if (photo.serviceType) {
            formData.append('serviceType', photo.serviceType);
          }

          await api.post(`/vendors/${vendorProfile.id}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      toast.success("Portfolio updated successfully!");
      router.push("/dashboard/vendor");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.response?.data?.message || "Failed to upload images");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" onClick={() => router.push("/dashboard/vendor")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black">Portfolio</h1>
          <p className="text-neutral-600">Showcase your best work to attract more customers</p>
        </div>
      </motion.div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ImageIcon className="h-5 w-5 text-neutral-600 mt-0.5" />
            <div>
              <p className="font-medium text-black">Portfolio Tips</p>
              <p className="text-sm text-neutral-600">
                Upload high-quality images of your past work. Show variety in your portfolio - different events, styles, and setups. 
                Images help customers visualize what you can do for their event.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>
            Add photos of your work (max 10 images)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center hover:border-neutral-400 transition-colors">
            <input
              type="file"
              id="portfolio-upload"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              multiple
              disabled={portfolio.length >= 10}
            />
            <label htmlFor="portfolio-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-black mb-1">
                {portfolio.length >= 10 ? "Maximum images reached" : "Click to upload images"}
              </p>
              <p className="text-sm text-neutral-600">
                {portfolio.length}/10 images uploaded • JPG, PNG (max 5MB each)
              </p>
            </label>
          </div>

          {/* Image Grid */}
          {portfolio.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {portfolio.map((photo, index) => (
                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={photo.url}
                    alt={`Portfolio ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {photo.isFeatured && (
                    <Badge className="absolute top-2 left-2 bg-black text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                      {photo.caption}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetFeatured(index)}
                      className="h-8 px-2"
                      title="Set as featured"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddCaption(photo, index)}
                      className="h-8 px-2"
                      title="Add caption"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemovePhoto(index)}
                      className="h-8 px-2"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={loading || uploading || portfolio.length === 0}
          className="flex-1 h-12"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Save Portfolio
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/vendor")}
          className="flex-1 h-12"
        >
          Cancel
        </Button>
      </div>

      {/* Caption Dialog */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Caption</CardTitle>
              <CardDescription>Describe this image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <Image
                  src={selectedImage.url}
                  alt="Selected"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  placeholder="Describe what's shown in this image..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type (optional)</Label>
                <select
                  id="serviceType"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select service type</option>
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveCaption} className="flex-1">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setSelectedImage(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
