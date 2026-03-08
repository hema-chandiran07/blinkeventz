"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function CreatePromotionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minCartValue: "",
    maxDiscount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.discountValue || !formData.validFrom || !formData.validUntil) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        discountValue: parseInt(formData.discountValue.toString()),
        minCartValue: formData.minCartValue ? parseInt(formData.minCartValue) : undefined,
        maxDiscount: formData.maxDiscount ? parseInt(formData.maxDiscount) : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
      };

      await api.post("/promotions", payload);
      toast.success("Promotion created successfully!");
      router.push("/dashboard/admin/promotions");
    } catch (error: any) {
      console.error("Create error:", error);
      toast.error(error?.response?.data?.message || "Failed to create promotion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Promotion</CardTitle>
            <CardDescription>Add a new discount code or promotion</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-black font-medium">
                    Promotion Code *
                  </Label>
                  <Input
                    id="code"
                    placeholder="WELCOME10"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="border-neutral-300"
                  />
                  <p className="text-xs text-neutral-600">Unique code customers will enter</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountType" className="text-black font-medium">
                    Discount Type *
                  </Label>
                  <select
                    id="discountType"
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountValue" className="text-black font-medium">
                    Discount Value *
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    placeholder={formData.discountType === "PERCENTAGE" ? "10" : "100"}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                    className="border-neutral-300"
                  />
                  <p className="text-xs text-neutral-600">
                    {formData.discountType === "PERCENTAGE" ? "Percentage (e.g., 10 for 10%)" : "Amount in INR (e.g., 100 for ₹100)"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minCartValue" className="text-black font-medium">
                    Minimum Cart Value
                  </Label>
                  <Input
                    id="minCartValue"
                    type="number"
                    placeholder="1000"
                    value={formData.minCartValue}
                    onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value })}
                    className="border-neutral-300"
                  />
                  <p className="text-xs text-neutral-600">Minimum cart value required to use this promo</p>
                </div>

                {formData.discountType === "PERCENTAGE" && (
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscount" className="text-black font-medium">
                      Maximum Discount
                    </Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      placeholder="500"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      className="border-neutral-300"
                    />
                    <p className="text-xs text-neutral-600">Cap the maximum discount amount</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="usageLimit" className="text-black font-medium">
                    Usage Limit
                  </Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    placeholder="1000"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="border-neutral-300"
                  />
                  <p className="text-xs text-neutral-600">Total times this code can be used (leave empty for unlimited)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validFrom" className="text-black font-medium">
                    Valid From *
                  </Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="border-neutral-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validUntil" className="text-black font-medium">
                    Valid Until *
                  </Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="border-neutral-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-black font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe this promotion..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border-neutral-300"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="text-black">
                  Active (visible to customers)
                </Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 bg-black hover:bg-neutral-800"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Promotion"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-black"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
