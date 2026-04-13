"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Percent, Calendar, Tag } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function EditPromotionPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promotion, setPromotion] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    minCartValue: "",
    maxDiscount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    isActive: true,
  });

  useEffect(() => {
    if (params.id) {
      loadPromotion();
    }
  }, [params.id]);

  const loadPromotion = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/promotions/${params.id}`);
      const data = response.data;

      setPromotion(data);
      setFormData({
        code: data.code || "",
        description: data.description || "",
        discountType: data.discountType || "PERCENTAGE",
        discountValue: data.discountValue?.toString() || "",
        minCartValue: data.minCartValue?.toString() || "",
        maxDiscount: data.maxDiscount?.toString() || "",
        validFrom: data.validFrom ? new Date(data.validFrom).toISOString().split('T')[0] : "",
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString().split('T')[0] : "",
        usageLimit: data.usageLimit?.toString() || "",
        isActive: data.isActive ?? true,
      });
    } catch (error: any) {
      toast.error("Failed to load promotion", {
        description: error?.response?.data?.message || "Please try again"
      });
      router.push("/dashboard/admin/promotions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const updateData = {
        ...formData,
        discountValue: parseFloat(formData.discountValue) || 0,
        minCartValue: formData.minCartValue ? parseFloat(formData.minCartValue) : null,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      };
      
      await api.patch(`/promotions/${params.id}`, updateData);
      
      toast.success("Promotion updated successfully");
      router.push("/dashboard/admin/promotions");
    } catch (error: any) {
      toast.error("Failed to update promotion", {
        description: error?.response?.data?.message || "Please try again"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading promotion...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin/promotions")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-black">Edit Promotion</h1>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Promotion Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-black">Promo Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="SAVE20"
                  className="border-silver-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountType" className="text-black">Discount Type *</Label>
                <select
                  id="discountType"
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-silver-300 bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed Amount</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue" className="text-black">Discount Value *</Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === "PERCENTAGE" ? "20" : "500"}
                  className="border-silver-300"
                  required
                />
                <p className="text-xs text-neutral-600">
                  {formData.discountType === "PERCENTAGE" ? "Enter percentage (e.g., 20 for 20%)" : "Enter fixed amount in ₹"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minCartValue" className="text-black">Minimum Cart Value</Label>
                <Input
                  id="minCartValue"
                  type="number"
                  value={formData.minCartValue}
                  onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value })}
                  placeholder="1000"
                  className="border-silver-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDiscount" className="text-black">Maximum Discount</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  placeholder="5000"
                  className="border-silver-300"
                />
                <p className="text-xs text-neutral-600">Maximum discount cap (for percentage discounts)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usageLimit" className="text-black">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="100"
                  className="border-silver-300"
                />
                <p className="text-xs text-neutral-600">Maximum number of times this code can be used</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validFrom" className="text-black">Valid From</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="border-silver-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil" className="text-black">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="border-silver-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-black">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter promotion description..."
                rows={3}
                className="border-silver-300"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="text-black">Active (visible to customers)</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Promotion"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/admin/promotions")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
