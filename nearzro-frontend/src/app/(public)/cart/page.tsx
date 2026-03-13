"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingBag, Trash2, Plus, Minus, Calendar, Users, MapPin,
  Clock, DollarSign, AlertCircle, CheckCircle2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface CartItem {
  id: number;
  itemType: "VENUE" | "VENDOR_SERVICE" | "ADDON";
  name: string;
  description?: string;
  date?: string;
  timeSlot?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  meta?: {
    guestCount?: number;
    area?: string;
    city?: string;
    serviceType?: string;
  };
}

interface CartSummary {
  subtotal: number;
  discount: number;
  platformFee: number;
  tax: number;
  total: number;
}

const PLATFORM_FEE_PERCENTAGE = 0.02; // 2%
const TAX_PERCENTAGE = 0.18; // 18% GST

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>({
    subtotal: 0,
    discount: 0,
    platformFee: 0,
    tax: 0,
    total: 0,
  });
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await api.get("/cart");
      const cartItems = response.data.items || [];
      setItems(cartItems);
      calculateSummary(cartItems);
    } catch (error: any) {
      console.error("Failed to load cart:", error);
      toast.error("Failed to load cart items");
      setItems([]);
      calculateSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (cartItems: CartItem[]) => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENTAGE);
    const tax = Math.round((subtotal + platformFee) * TAX_PERCENTAGE);
    const total = subtotal + platformFee + tax;

    setSummary({
      subtotal,
      discount: 0,
      platformFee,
      tax,
      total,
    });
  };

  const handleUpdateQuantity = async (itemId: number, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + delta);
    if (newQuantity === item.quantity) return;

    setUpdatingItemId(itemId);

    try {
      await api.patch(`/cart/items/${itemId}`, {
        quantity: newQuantity,
      });

      const updatedItems = items.map((i) =>
        i.id === itemId
          ? { ...i, quantity: newQuantity, totalPrice: i.unitPrice * newQuantity }
          : i
      );

      setItems(updatedItems);
      calculateSummary(updatedItems);
      toast.success("Cart updated");
    } catch (error: any) {
      console.error("Failed to update cart:", error);
      toast.error("Failed to update quantity");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleUpdateGuestCount = async (itemId: number, guestCount: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.meta) return;

    if (guestCount < 1) {
      toast.error("Guest count must be at least 1");
      return;
    }

    setUpdatingItemId(itemId);

    try {
      await api.patch(`/cart/items/${itemId}`, {
        meta: { ...item.meta, guestCount },
      });

      // Recalculate price for PER_PERSON pricing
      const pricePerPerson = item.unitPrice / (item.meta.guestCount || 1);
      const newTotalPrice = Math.round(pricePerPerson * guestCount);

      const updatedItems = items.map((i) =>
        i.id === itemId
          ? { ...i, meta: { ...i.meta, guestCount }, totalPrice: newTotalPrice }
          : i
      );

      setItems(updatedItems);
      calculateSummary(updatedItems);
      toast.success("Guest count updated");
    } catch (error: any) {
      console.error("Failed to update guest count:", error);
      toast.error("Failed to update guest count");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      const updatedItems = items.filter((i) => i.id !== itemId);
      setItems(updatedItems);
      calculateSummary(updatedItems);
      toast.success("Item removed from cart");
    } catch (error: any) {
      console.error("Failed to remove item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleClearCart = async () => {
    if (!confirm("Are you sure you want to clear your cart?")) return;

    try {
      await api.delete("/cart/clear");
      setItems([]);
      calculateSummary([]);
      toast.success("Cart cleared");
    } catch (error: any) {
      console.error("Failed to clear cart:", error);
      toast.error("Failed to clear cart");
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    calculateSummary(items);
    toast.success("Promo code removed");
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;

    setApplyingPromo(true);
    try {
      const response = await api.post("/promotions/validate", { code: promoCode });
      const promo = response.data;

      setAppliedPromo(promo);
      calculateSummary(items);
      toast.success(`Promo code "${promo.code}" applied successfully!`);
    } catch (error: any) {
      console.error("Failed to apply promo:", error);
      toast.error(error?.response?.data?.message || "Invalid promo code");
    } finally {
      setApplyingPromo(false);
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case "VENUE":
        return <MapPin className="h-5 w-5" />;
      case "VENDOR_SERVICE":
        return <Users className="h-5 w-5" />;
      default:
        return <ShoppingBag className="h-5 w-5" />;
    }
  };

  const getStatusColor = (itemType: string) => {
    switch (itemType) {
      case "VENUE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "VENDOR_SERVICE":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingBag className="h-24 w-24 text-neutral-300 mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Your cart is empty</h2>
          <p className="text-neutral-600 mb-6">Start adding venues and vendors to plan your event!</p>
          <Button
            variant="default"
            className="h-12 px-8 bg-black hover:bg-neutral-800"
            onClick={() => router.push("/venues")}
          >
            Browse Venues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">Your Event Cart</h1>
          <p className="text-neutral-600 mt-1">Review and manage your selected items</p>
        </div>
        <Button
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50"
          onClick={handleClearCart}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Cart
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-2 border-neutral-200 hover:border-black transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                      {getItemIcon(item.itemType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(item.itemType)}>
                          {item.itemType.replace("_", " ")}
                        </Badge>
                        {item.meta?.serviceType && (
                          <Badge variant="outline">{item.meta.serviceType}</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-black mb-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-neutral-600 mb-3">{item.description}</p>
                      )}

                      {/* Item Details Grid */}
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {item.date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-neutral-400" />
                            <span className="text-black">
                              {new Date(item.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {item.timeSlot && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-neutral-400" />
                            <span className="text-black">{item.timeSlot.replace("_", " ")}</span>
                          </div>
                        )}
                        {item.meta?.area && item.meta?.city && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-neutral-400" />
                            <span className="text-black">{item.meta.area}, {item.meta.city}</span>
                          </div>
                        )}
                        {item.meta?.guestCount && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-neutral-400" />
                            <span className="text-black">{item.meta.guestCount} guests</span>
                          </div>
                        )}
                      </div>

                      {/* Quantity & Guest Count Controls */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            disabled={updatingItemId === item.id || item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-medium w-8 text-center text-black">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            disabled={updatingItemId === item.id}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-neutral-600 ml-2">Qty</span>
                        </div>

                        {item.meta?.guestCount && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`guests-${item.id}`} className="text-sm text-neutral-600">
                              Guests:
                            </Label>
                            <Input
                              id={`guests-${item.id}`}
                              type="number"
                              min="1"
                              value={item.meta.guestCount}
                              onChange={(e) =>
                                handleUpdateGuestCount(item.id, parseInt(e.target.value) || 1)
                              }
                              disabled={updatingItemId === item.id}
                              className="w-24 h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-xl font-bold text-black">
                      {formatCurrency(item.totalPrice)}
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-xs text-neutral-600">
                        {formatCurrency(item.unitPrice)} each
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-black sticky top-8">
            <CardHeader>
              <CardTitle className="text-black">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Promo Code */}
              <div className="space-y-2">
                <Label className="text-black font-medium">Promo Code</Label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-green-800">{appliedPromo.code}</p>
                      <p className="text-xs text-green-600">
                        {appliedPromo.discountType === "PERCENTAGE" 
                          ? `${appliedPromo.discountValue}% off` 
                          : `₹${appliedPromo.discountValue} off`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePromo}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 border-neutral-300"
                    />
                    <Button
                      onClick={handleApplyPromoCode}
                      disabled={applyingPromo || !promoCode.trim()}
                      className="bg-black hover:bg-neutral-800"
                    >
                      {applyingPromo ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-medium text-black">{formatCurrency(summary.subtotal)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedPromo.code})</span>
                    <span className="font-medium">-₹{appliedPromo.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Platform Fee (2%)</span>
                  <span className="font-medium text-black">{formatCurrency(summary.platformFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">GST (18%)</span>
                  <span className="font-medium text-black">{formatCurrency(summary.tax)}</span>
                </div>
                <div className="border-t-2 border-neutral-200 pt-3 flex justify-between font-bold text-lg">
                  <span className="text-black">Total</span>
                  <span className="text-black">{formatCurrency(summary.total)}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Best price guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Secure payment via Razorpay</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Free cancellation up to 24 hours</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="default"
                className="w-full h-14 text-lg font-semibold bg-black hover:bg-neutral-800 mt-4"
                onClick={() => router.push("/checkout")}
              >
                Proceed to Checkout
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              {/* Continue Shopping */}
              <Button
                variant="ghost"
                className="w-full text-neutral-600"
                onClick={() => router.push("/venues")}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
