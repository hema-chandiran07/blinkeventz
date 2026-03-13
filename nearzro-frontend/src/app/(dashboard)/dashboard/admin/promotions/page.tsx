"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Edit, Trash2, Search, Percent, DollarSign, Calendar, Users
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Promotion {
  id: number;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minCartValue?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminPromotionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const response = await api.get("/promotions");
      setPromotions(response.data.data || []);
    } catch (error: any) {
      console.error("Failed to load promotions:", error);
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this promotion?")) {
      return;
    }

    try {
      await api.delete(`/promotions/${id}`);
      toast.success("Promotion deleted successfully");
      loadPromotions();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete promotion");
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await api.patch(`/promotions/${id}`, { isActive: !isActive });
      toast.success(`Promotion ${!isActive ? "activated" : "deactivated"}`);
      loadPromotions();
    } catch (error: any) {
      toast.error("Failed to update promotion");
    }
  };

  const filteredPromotions = promotions.filter(p =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDiscountDisplay = (promo: Promotion) => {
    if (promo.discountType === "PERCENTAGE") {
      return `${promo.discountValue}% OFF`;
    }
    return `₹${promo.discountValue} OFF`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Promotions & Coupons</h1>
            <p className="text-neutral-600">Manage discount codes and promotions</p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/admin/promotions/create")}
            className="bg-black hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Promotion
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="border-2 border-black mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-neutral-400" />
            <Input
              placeholder="Search promotions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-neutral-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Promotions List */}
      <div className="grid gap-4">
        {filteredPromotions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Percent className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-bold text-black mb-2">No Promotions Yet</h3>
              <p className="text-neutral-600">Create your first promotion to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredPromotions.map((promo) => (
            <Card key={promo.id} className="border-2 border-neutral-200 hover:border-black transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center">
                      {promo.discountType === "PERCENTAGE" ? (
                        <Percent className="h-6 w-6 text-black" />
                      ) : (
                        <DollarSign className="h-6 w-6 text-black" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-black">{promo.code}</h3>
                        <Badge className={promo.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}>
                          {promo.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600">{promo.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/promotions/${promo.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(promo.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 mb-1">Discount</p>
                    <p className="text-lg font-bold text-black">{getDiscountDisplay(promo)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600 mb-1">Min Cart</p>
                    <p className="text-lg font-bold text-black">
                      {promo.minCartValue ? `₹${promo.minCartValue}` : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600 mb-1">Usage</p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-neutral-400" />
                      <p className="text-lg font-bold text-black">
                        {promo.usedCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600 mb-1">Valid Until</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      <p className="text-lg font-bold text-black">
                        {new Date(promo.validUntil).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-neutral-600">Toggle Status:</Label>
                    <Button
                      variant={promo.isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleActive(promo.id, promo.isActive)}
                      className={promo.isActive ? "bg-black" : "border-black"}
                    >
                      {promo.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Created: {new Date(promo.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
