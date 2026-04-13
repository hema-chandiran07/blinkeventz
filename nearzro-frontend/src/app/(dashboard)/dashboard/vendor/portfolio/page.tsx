"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Image, Plus, Trash2, Save, AlertCircle,
  Loader2, CheckCircle2, RefreshCw, ExternalLink, Eye,
  GripVertical, Star, TrendingUp, Award, Edit2, Upload,
  X, FileImage, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ==================== Types ====================
interface PortfolioImage {
  id: number; // Changed from string to number - real backend ID
  url: string;
  title?: string;
  description?: string;
  category?: string;
  order: number;
  isPrimary: boolean;
  views: number;
  likes: number;
  uploadedAt: string;
  fileSize?: number;
  mimeType?: string;
}

interface PortfolioStats {
  vendorId: number;
  images: Array<{
    id: number;
    url: string;
    title?: string;
    description?: string;
    category?: string;
    order: number;
    isCover: boolean;
    isFeatured: boolean;
    quality: string;
    tags: string[];
    createdAt: string;
  }>;
  imageCount: number;
  vendorName: string;
  coverImage: any;
  categories: Record<string, number>;
}

interface PortfolioMetrics {
  totalImages: number;
  completionPercentage: number;
  qualityScore: number;
  engagementRate: number;
  storageUsed: number;
  recommendation: string;
}

interface UploadState {
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// ==================== Constants ====================
const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "wedding", label: "Wedding" },
  { value: "engagement", label: "Engagement" },
  { value: "reception", label: "Reception" },
  { value: "prewedding", label: "Pre-Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "birthday", label: "Birthday" },
  { value: "other", label: "Other" },
];

const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 60,
  average: 40,
  poor: 0,
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 50;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const MIN_IMAGES_FOR_PORTFOLIO = 5;
const TARGET_IMAGES = 10;

// ==================== Validation Functions ====================
const validateFile = (file: File): string | null => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`;
  }
  if (file.size < 10 * 1024) {
    return "File is too small. Minimum size is 10KB";
  }
  return null;
};

const validateImageUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==================== Quality Score Calculation ====================
const calculateQualityScore = (images: PortfolioImage[]): number => {
  if (images.length === 0) return 0;

  let score = 0;

  // Base score for having images (max 40 points)
  score += Math.min((images.length / TARGET_IMAGES) * 40, 40);

  // Score for having titles (max 20 points)
  const withTitles = images.filter(img => img.title && img.title.length > 0).length;
  score += Math.round((withTitles / images.length) * 20);

  // Score for having descriptions (max 20 points)
  const withDescriptions = images.filter(img => img.description && img.description.length > 20).length;
  score += Math.round((withDescriptions / images.length) * 20);

  // Score for having primary image (max 10 points)
  const hasPrimary = images.some(img => img.isPrimary);
  score += hasPrimary ? 10 : 0;

  // Score for variety (max 10 points)
  const categories = new Set(images.map(img => img.category || 'other'));
  score += Math.min((categories.size / 4) * 10, 10);

  return Math.min(Math.round(score), 100);
};

const getQualityLabel = (score: number) => {
  if (score >= QUALITY_THRESHOLDS.excellent) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100" };
  if (score >= QUALITY_THRESHOLDS.good) return { label: "Good", color: "text-blue-600", bg: "bg-blue-100" };
  if (score >= QUALITY_THRESHOLDS.average) return { label: "Average", color: "text-amber-600", bg: "bg-amber-100" };
  return { label: "Needs Improvement", color: "text-red-600", bg: "bg-red-100" };
};

const getRecommendation = (score: number, images: PortfolioImage[]): string => {
  if (images.length === 0) return "Start building your portfolio by uploading your best work. Aim for at least 5 images to attract customers.";
  if (images.length < MIN_IMAGES_FOR_PORTFOLIO) return `Add ${MIN_IMAGES_FOR_PORTFOLIO - images.length} more images to meet the minimum requirement for a complete portfolio.`;
  if (images.length < TARGET_IMAGES) return `You're making great progress! Add ${TARGET_IMAGES - images.length} more images to reach the target.`;
  if (score < QUALITY_THRESHOLDS.good) return "Improve quality by adding titles, descriptions, and categorizing your images for better discoverability.";
  if (score < QUALITY_THRESHOLDS.excellent) return "Consider adding more variety across different event categories to showcase your versatility.";
  return "Outstanding portfolio! Keep it fresh by regularly updating with your latest and best work.";
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ==================== Main Component ====================
export default function VendorPortfolioPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<PortfolioImage[]>([]);

  // Filter and sort states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);

  // Upload states
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', progress: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form states
  const [newImageTitle, setNewImageTitle] = useState("");
  const [newImageDescription, setNewImageDescription] = useState("");
  const [newImageCategory, setNewImageCategory] = useState("GALLERY");

  // Selected image states
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<PortfolioImage | null>(null);
  const [editingImage, setEditingImage] = useState<PortfolioImage | null>(null);

  // Calculate metrics
  const metrics: PortfolioMetrics = {
    totalImages: images.length,
    completionPercentage: Math.min((images.length / TARGET_IMAGES) * 100, 100),
    qualityScore: calculateQualityScore(images),
    engagementRate: images.length > 0
      ? Math.round((images.reduce((sum, img) => sum + (img.likes || 0), 0) / (images.length * 100)) * 100) / 100
      : 0,
    storageUsed: images.reduce((sum, img) => sum + (img.fileSize || 0), 0),
    recommendation: "",
  };
  metrics.recommendation = getRecommendation(metrics.qualityScore, images);

  // ==================== Data Loading ====================
  const loadPortfolio = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const response = await api.get('/vendors/me/portfolio');
      const data = response.data;

      setPortfolio(data);

      // Transform backend response to PortfolioImage array with REAL numeric IDs
      const portfolioImages: PortfolioImage[] = (data.images || []).map((img: any, index: number) => ({
        id: img.id, // Use REAL backend ID (number)
        url: img.url || img.imageUrl,
        title: img.title || "",
        description: img.description || "",
        category: img.category || "other",
        order: img.order ?? index,
        isPrimary: img.isCover || img.isPrimary || index === 0,
        views: 0,
        likes: 0,
        uploadedAt: img.createdAt || new Date().toISOString(),
      }));

      setImages(portfolioImages);
      setInitialLoadComplete(true);
    } catch (error: any) {
      console.error("Failed to load portfolio:", error);

      if (error?.response?.status === 401) {
        setError("Authentication failed. Please login again.");
        toast.error("Session expired. Please login again.");
      } else if (error?.response?.status === 404) {
        // Portfolio doesn't exist yet - start fresh
        setPortfolio({ vendorId: 0, images: [], imageCount: 0, vendorName: '', coverImage: null, categories: {} });
        setImages([]);
        setInitialLoadComplete(true);
      } else {
        const errorMessage = error?.response?.data?.message || "Failed to load portfolio";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio(true);
  }, [loadPortfolio]);

  // ==================== Filter and Sort Logic ====================
  useEffect(() => {
    let filtered = [...images];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(img => img.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img => 
        (img.title?.toLowerCase().includes(query)) ||
        (img.description?.toLowerCase().includes(query)) ||
        (img.category?.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        break;
      case "popular":
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
    }

    setFilteredImages(filtered);
  }, [images, selectedCategory, sortBy, searchQuery]);

  // ==================== File Upload Handlers ====================
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      toast.error("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);

    // Auto-fill title from filename
    if (!newImageTitle) {
      const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setNewImageTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
    }
  }, [newImageTitle]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    if (!newImageTitle) {
      const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setNewImageTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
    }
  }, [newImageTitle]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const clearFileSelection = useCallback(() => {
    setSelectedFile(null);
    setImagePreview(null);
    setUploadState({ status: 'idle', progress: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // ==================== Upload Logic ====================
  const uploadImageToServer = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', newImageTitle.trim());
    formData.append('description', newImageDescription.trim());
    formData.append('category', newImageCategory);

    setUploadState({ status: 'uploading', progress: 0 });

    try {
      const response = await api.post('/vendors/me/portfolio/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadState({ status: 'uploading', progress: percentCompleted });
        },
      });

      setUploadState({ status: 'success', progress: 100 });
      return response.data.imageUrl || response.data.url;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Upload failed. Please try again.";
      setUploadState({ status: 'error', progress: 0, error: errorMessage });
      throw new Error(errorMessage);
    }
  }, [newImageTitle, newImageDescription, newImageCategory]);

  const handleAddImage = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select an image file to upload");
      return;
    }

    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum limit of ${MAX_IMAGES} images reached. Please delete some images first.`);
      return;
    }

    setUploadState({ status: 'validating', progress: 0 });

    try {
      // Upload file to server
      const imageUrl = await uploadImageToServer(selectedFile);

      // Add to local state with temporary ID (will be replaced after server save)
      const tempId = -Date.now(); // Negative temp ID to distinguish from real IDs
      const newImage: PortfolioImage = {
        id: tempId,
        url: imageUrl,
        title: newImageTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""),
        description: newImageDescription.trim(),
        category: newImageCategory,
        order: images.length,
        isPrimary: images.length === 0,
        views: 0,
        likes: 0,
        uploadedAt: new Date().toISOString(),
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      };

      setImages(prev => [...prev, newImage]);

      // Reload portfolio from server
      await loadPortfolio(false);

      // Reset form
      clearFileSelection();
      setNewImageTitle("");
      setNewImageDescription("");
      setNewImageCategory("wedding");
      setAddDialogOpen(false);

      toast.success("Image uploaded successfully and added to portfolio");
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      toast.error(error.message || "Failed to upload image");
    }
  }, [selectedFile, images.length, uploadImageToServer, newImageTitle, newImageDescription, newImageCategory, loadPortfolio, clearFileSelection]);

  // ==================== Image Management ====================
  const handleReorderImages = useCallback(async (newOrder: PortfolioImage[]) => {
    const previousOrder = [...images];
    setImages(newOrder);

    const updatedImages = newOrder.map((img, index) => ({
      ...img,
      order: index,
      isPrimary: index === 0,
    }));

    try {
      const imageUrls = updatedImages.map(img => img.url);
      await api.patch('/vendors/me/portfolio', { images: imageUrls });
      toast.success("Portfolio order updated successfully");
    } catch (error: any) {
      console.error("Failed to update order:", error);
      toast.error("Failed to update order. Reverting changes.");
      setImages(previousOrder);
    }
  }, [images]);

  const handleDeleteImage = useCallback(async () => {
    if (!imageToDelete) return;

    try {
      // Use numeric image ID instead of encoded URL
      await api.delete(`/vendors/me/portfolio/images/${imageToDelete.id}`);

      const updatedImages = images.filter(img => img.id !== imageToDelete.id);
      setImages(updatedImages);

      setPortfolio(prev => prev ? {
        ...prev,
        images: updatedImages.map(img => ({
          id: img.id,
          url: img.url,
          title: img.title || "",
          description: img.description || "",
          category: img.category || "other",
          order: img.order,
          isCover: img.isPrimary,
          isFeatured: false,
          quality: "HD",
          tags: [],
          createdAt: img.uploadedAt,
        })),
        imageCount: updatedImages.length,
      } : null);

      toast.success("Image removed from portfolio");
      setDeleteConfirmOpen(false);
      setImageToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete image:", error);
      toast.error(error?.response?.data?.message || "Failed to delete image");
    }
  }, [imageToDelete, images]);

  const handleUpdateImage = useCallback(async () => {
    if (!editingImage) return;

    try {
      const updatedImages = images.map(img =>
        img.id === editingImage.id ? editingImage : img
      );

      // Use the correct reorder endpoint with imageIds
      const imageIds = updatedImages.map(img => img.id);
      await api.patch('/vendors/me/portfolio/reorder', { imageIds });

      setImages(updatedImages);
      setEditingImage(null);
      setEditDialogOpen(false);

      toast.success("Image details updated successfully");
    } catch (error: any) {
      console.error("Failed to update image:", error);
      toast.error("Failed to update image details");
    }
  }, [editingImage, images]);

  const handleSetAsPrimary = useCallback(async (image: PortfolioImage) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === image.id,
    }));

    setImages(updatedImages);

    try {
      const imageUrls = updatedImages.map(img => img.url);
      await api.patch('/vendors/me/portfolio', { images: imageUrls });
      toast.success("Cover image updated successfully");
    } catch (error: any) {
      console.error("Failed to update primary:", error);
      toast.error("Failed to update cover image");
      loadPortfolio(false);
    }
  }, [images, loadPortfolio]);

  // ==================== Dialog Handlers ====================
  const openAddDialog = useCallback(() => {
    clearFileSelection();
    setNewImageTitle("");
    setNewImageDescription("");
    setNewImageCategory("wedding");
    setAddDialogOpen(true);
  }, [clearFileSelection]);

  const openPreview = useCallback((image: PortfolioImage) => {
    setPreviewImageUrl(image.url);
    setSelectedImage(image);
    setPreviewOpen(true);
  }, []);

  const openDeleteConfirm = useCallback((image: PortfolioImage) => {
    setImageToDelete(image);
    setDeleteConfirmOpen(true);
  }, []);

  const openEditDialog = useCallback((image: PortfolioImage) => {
    setEditingImage({ ...image });
    setEditDialogOpen(true);
  }, []);

  // ==================== Loading State ====================
  if (loading && !initialLoadComplete) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  // ==================== Error State ====================
  if (error && !initialLoadComplete) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-black mb-2">Failed to Load Portfolio</h3>
            <p className="text-neutral-600 mb-4">{error}</p>
            <Button onClick={() => loadPortfolio(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const qualityInfo = getQualityLabel(metrics.qualityScore);

  // ==================== Main Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Portfolio</h1>
          <p className="text-neutral-600">Upload and manage your best work to attract customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadPortfolio(true)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={openAddDialog}
            disabled={images.length >= MAX_IMAGES}
            className="bg-black hover:bg-neutral-800 gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Button>
        </div>
      </motion.div>

      {/* Metrics Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Images</p>
                <p className="text-3xl font-bold text-black mt-1">{metrics.totalImages}</p>
                <p className="text-xs text-neutral-500 mt-1">Target: {TARGET_IMAGES} images</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-100 text-neutral-700">
                <Image className="h-6 w-6" />
              </div>
            </div>
            <Progress value={metrics.completionPercentage} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Quality Score</p>
                <p className={cn("text-3xl font-bold mt-1", qualityInfo.color)}>
                  {metrics.qualityScore}%
                </p>
                <p className={cn("text-xs mt-1", qualityInfo.color)}>{qualityInfo.label}</p>
              </div>
              <div className={cn("p-3 rounded-full", qualityInfo.bg, qualityInfo.color)}>
                <Star className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Engagement Rate</p>
                <p className="text-3xl font-bold text-black mt-1">{metrics.engagementRate}%</p>
                <p className="text-xs text-neutral-500 mt-1">Avg. likes per image</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Storage Used</p>
                <p className="text-3xl font-bold text-black mt-1">{formatFileSize(metrics.storageUsed)}</p>
                <p className="text-xs text-neutral-500 mt-1">Limit: {formatFileSize(MAX_FILE_SIZE * MAX_IMAGES)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <FileImage className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Status</p>
                <p className="text-lg font-bold text-black mt-1">
                  {metrics.totalImages === 0 ? "Empty" :
                   metrics.totalImages < MIN_IMAGES_FOR_PORTFOLIO ? "Building" :
                   metrics.qualityScore >= 80 ? "Excellent" : "Good"}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                metrics.totalImages === 0 ? "bg-neutral-100" :
                metrics.totalImages < MIN_IMAGES_FOR_PORTFOLIO ? "bg-amber-100" :
                metrics.qualityScore >= 80 ? "bg-green-100" : "bg-blue-100"
              )}>
                {metrics.totalImages === 0 ? <AlertCircle className="h-6 w-6 text-neutral-600" /> :
                 metrics.totalImages < MIN_IMAGES_FOR_PORTFOLIO ? <AlertCircle className="h-6 w-6 text-amber-600" /> :
                 metrics.qualityScore >= 80 ? <Award className="h-6 w-6 text-green-600" /> :
                 <CheckCircle2 className="h-6 w-6 text-blue-600" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendation Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className={cn(
          "border-2",
          metrics.qualityScore >= 80 ? "border-green-200 bg-green-50" :
          metrics.qualityScore >= 60 ? "border-blue-200 bg-blue-50" :
          metrics.qualityScore >= 40 ? "border-amber-200 bg-amber-50" :
          "border-red-200 bg-red-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Award className={cn(
                "h-6 w-6 mt-0.5",
                metrics.qualityScore >= 80 ? "text-green-600" :
                metrics.qualityScore >= 60 ? "text-blue-600" :
                metrics.qualityScore >= 40 ? "text-amber-600" : "text-red-600"
              )} />
              <div className="flex-1">
                <p className={cn(
                  "font-semibold",
                  metrics.qualityScore >= 80 ? "text-green-900" :
                  metrics.qualityScore >= 60 ? "text-blue-900" :
                  metrics.qualityScore >= 40 ? "text-amber-900" : "text-red-900"
                )}>
                  {metrics.qualityScore >= 80 ? "🎉 Excellent Portfolio!" :
                   metrics.qualityScore >= 60 ? "👍 Good Progress!" :
                   metrics.qualityScore >= 40 ? "📈 Keep Improving!" : "🚀 Let's Get Started!"}
                </p>
                <p className={cn(
                  "text-sm mt-1",
                  metrics.qualityScore >= 80 ? "text-green-700" :
                  metrics.qualityScore >= 60 ? "text-blue-700" :
                  metrics.qualityScore >= 40 ? "text-amber-700" : "text-red-700"
                )}>
                  {metrics.recommendation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters and Sort */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-black">Category:</Label>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="bg-neutral-100 border border-neutral-200">
                  {CATEGORIES.map(cat => (
                    <TabsTrigger 
                      key={cat.value} 
                      value={cat.value} 
                      className="text-xs text-neutral-700 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm hover:text-black transition-colors"
                    >
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs border-neutral-300 bg-white text-black placeholder:text-neutral-400"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-sm font-medium text-black">Sort by:</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 hover:border-neutral-400 transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Your Portfolio</CardTitle>
              <CardDescription>
                Drag and drop to reorder • First image is your cover
              </CardDescription>
            </div>
            <Badge variant="outline">
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <Image className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">
                {searchQuery ? "No matching images" : selectedCategory === "all" ? "No Portfolio Images" : `No images in ${selectedCategory}`}
              </h3>
              <p className="text-neutral-600 mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : selectedCategory === "all"
                  ? "Upload images from your device to showcase your work"
                  : "Try adding images to this category or switch to 'All' view"}
              </p>
              {!searchQuery && selectedCategory === "all" && (
                <Button onClick={openAddDialog} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Your First Image
                </Button>
              )}
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={images}
              onReorder={handleReorderImages}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              <AnimatePresence>
                {filteredImages.map((image) => (
                  <Reorder.Item
                    key={image.id}
                    value={image}
                    className="relative"
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-white",
                        image.isPrimary ? "border-white shadow-lg" : "border-neutral-200 hover:border-neutral-400"
                      )}
                    >
                      <img
                        src={image.url}
                        alt={image.title || "Portfolio"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTVlNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5Ij5FcnJvcjwvdGV4dD48L3N2Zz4=';
                        }}
                      />

                      {/* Primary badge */}
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-white text-black text-xs shadow-sm">
                            <Award className="h-3 w-3 mr-1" />
                            Cover
                          </Badge>
                        </div>
                      )}

                      {/* Category badge */}
                      {image.category && image.category !== "other" && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs bg-white/90 text-black">
                            {image.category}
                          </Badge>
                        </div>
                      )}

                      {/* Hover overlay - improved visibility with scroll support */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 overflow-y-auto">
                        <div className="flex justify-between flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreview(image);
                            }}
                            className="text-white border-white hover:bg-white/20 bg-white/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(image);
                            }}
                            className="text-blue-300 border-blue-300 hover:bg-blue-500/20 bg-white/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {!image.isPrimary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAsPrimary(image);
                              }}
                              className="text-amber-300 border-amber-300 hover:bg-amber-500/20 bg-white/10"
                            >
                              <Award className="h-4 w-4" />
                              Set Cover
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(image);
                            }}
                            className="text-red-300 border-red-300 hover:bg-red-500/20 bg-white/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {images.length > 1 && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/60 text-xs flex-shrink-0">
                            <GripVertical className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Portfolio Image</DialogTitle>
            <DialogDescription>
              Upload an image from your device (max {formatFileSize(MAX_FILE_SIZE)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Upload Area */}
            <div className="space-y-2">
              <Label>Image File *</Label>
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                  isDragOver ? "border-black bg-neutral-50" : "border-neutral-300 hover:border-black"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="portfolio-file-upload"
                />
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg object-cover"
                    />
                    <div className="text-sm text-neutral-600">
                      <p className="font-medium">{selectedFile?.name}</p>
                      <p>{formatFileSize(selectedFile?.size || 0)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFileSelection();
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove & Choose Different Image
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
                    <p className="text-sm font-medium text-black mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-neutral-500">
                      JPEG, PNG, or WebP (max {formatFileSize(MAX_FILE_SIZE)})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {uploadState.status === 'uploading' && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadState.progress} className="h-2" />
                <p className="text-xs text-neutral-600">{uploadState.progress}% uploaded</p>
              </div>
            )}

            {/* Upload Error */}
            {uploadState.status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>{uploadState.error}</AlertDescription>
              </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="imageTitle">Title</Label>
              <Input
                id="imageTitle"
                placeholder="e.g., Beach Wedding Photography"
                value={newImageTitle}
                onChange={(e) => setNewImageTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="imageDescription">Description</Label>
              <Textarea
                id="imageDescription"
                placeholder="Describe this project, event type, or special techniques used..."
                value={newImageDescription}
                onChange={(e) => setNewImageDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="imageCategory">Category</Label>
              <select
                id="imageCategory"
                value={newImageCategory}
                onChange={(e) => setNewImageCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                {CATEGORIES.filter(c => c.value !== "all").map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={uploadState.status === 'uploading'}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleAddImage}
              disabled={uploadState.status === 'uploading' || !selectedFile || images.length >= MAX_IMAGES}
            >
              {uploadState.status === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading... {uploadState.progress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>
              {selectedImage?.title || "Full size preview"}
            </DialogDescription>
          </DialogHeader>
          {previewImageUrl && (
            <div className="space-y-4">
              <img
                src={previewImageUrl}
                alt="Portfolio"
                className="w-full h-auto rounded-lg"
              />
              {selectedImage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {selectedImage.views || 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {selectedImage.likes || 0} likes
                      </span>
                    </div>
                    <Badge>{selectedImage.category || "Other"}</Badge>
                  </div>
                  {selectedImage.description && (
                    <p className="text-sm text-neutral-600">{selectedImage.description}</p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (previewImageUrl) {
                      navigator.clipboard.writeText(previewImageUrl);
                      toast.success("Image URL copied to clipboard");
                    }
                  }}
                >
                  Copy URL
                </Button>
                {selectedImage && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewOpen(false);
                        openEditDialog(selectedImage);
                      }}
                    >
                      Edit Details
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewOpen(false);
                        openDeleteConfirm(selectedImage);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
            <DialogDescription>
              Update the metadata for this image
            </DialogDescription>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Preview</Label>
                <img
                  src={editingImage.url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input
                  id="editTitle"
                  value={editingImage.title || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, title: e.target.value })}
                  placeholder="e.g., Beach Wedding Photography"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editingImage.description || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, description: e.target.value })}
                  placeholder="Describe this project..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory">Category</Label>
                <select
                  id="editCategory"
                  value={editingImage.category || "other"}
                  onChange={(e) => setEditingImage({ ...editingImage, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {CATEGORIES.filter(c => c.value !== "all").map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateImage}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this image from your portfolio? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {imageToDelete && (
            <div className="py-4">
              <img
                src={imageToDelete.url}
                alt="To delete"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              {imageToDelete.title && (
                <p className="font-medium text-black mb-1">{imageToDelete.title}</p>
              )}
              <p className="text-sm text-neutral-600">
                {imageToDelete.views || 0} views • {imageToDelete.likes || 0} likes
              </p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteImage}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
