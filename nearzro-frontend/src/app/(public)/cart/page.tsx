"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Trash2,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { SmartImage } from "@/components/ui/smart-image";

interface CartItem {
  id: number;
  itemType: "VENUE" | "VENDOR_SERVICE" | "ADDON";
  name: string;
  description?: string;
  image?: string;
  date?: string;
  timeSlot?: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  meta?: {
    guestCount?: number;
    area?: string;
    city?: string;
    serviceType?: string;
    image?: string;
  };
}

interface CartSummary {
  subtotal: string;
  discount: string;
  platformFee: string;
  tax: string;
  total: string;
}

const PLATFORM_FEE_PERCENTAGE = 0.02;
const TAX_PERCENTAGE = 0.18;

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>({
    subtotal: "0",
    discount: "0",
    platformFee: "0",
    tax: "0",
    total: "0",
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
    const subtotal = cartItems.reduce(
      (sum, item) => sum + parseFloat(String(item.totalPrice)),
      0
    );
    const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENTAGE);
    const tax = Math.round((subtotal + platformFee) * TAX_PERCENTAGE);
    const total = subtotal + platformFee + tax;

    setSummary({
      subtotal: subtotal.toString(),
      discount: "0",
      platformFee: platformFee.toString(),
      tax: tax.toString(),
      total: total.toString(),
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
          ? {
              ...i,
              quantity: newQuantity,
              totalPrice: (
                parseFloat(String(i.unitPrice)) * newQuantity
              ).toString(),
            }
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

      const pricePerPerson =
        parseFloat(String(item.unitPrice)) / (item.meta.guestCount || 1);
      const newTotalPrice = Math.round(pricePerPerson * guestCount).toString();

      const updatedItems = items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              meta: { ...i.meta, guestCount },
              totalPrice: newTotalPrice.toString(),
            }
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

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
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

  const getItemImage = (item: CartItem) => {
    const rawPath = item.image || item.meta?.image;
    
    if (rawPath && typeof rawPath === 'string') {
      if (rawPath.startsWith('http')) {
        return rawPath;
      }
      if (rawPath.startsWith('[') || rawPath.startsWith('"')) {
        try {
          const parsed = JSON.parse(rawPath);
          if (Array.isArray(parsed)) {
            return parsed[0] || null;
          }
        } catch {
          return rawPath;
        }
      }
      return rawPath;
    }
    
    if (Array.isArray(rawPath)) {
      return rawPath[0] || null;
    }
    
    return null;
  };

  const getStatusColor = (itemType: string) => {
    switch (itemType) {
      case "VENUE":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "VENDOR_SERVICE":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const formatTimeSlot = (slot: string) => {
    return slot
      .replace("_", " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
          <p className="text-zinc-400 font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="container mx-auto px-4 py-24">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
            <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl flex items-center justify-center mb-6">
              <ShoppingBag className="h-12 w-12 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-zinc-100 mb-2">
              Your cart is empty
            </h2>
            <p className="text-zinc-400 mb-8">
              Start adding venues and vendors to plan your perfect event!
            </p>
            <Button
              onClick={() => router.push("/venues")}
              className="h-12 px-8 bg-zinc-100 text-zinc-950 font-semibold rounded-xl transition-all hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]"
            >
              Browse Venues
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-zinc-100">
              Your Event Cart
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-zinc-400">{items.length}</span>
              <span className="text-zinc-500">item{items.length !== 1 ? "s" : ""}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-100 font-medium">
                {formatCurrency(summary.total)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleClearCart}
            className="text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cart
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const itemImage = getItemImage(item);
              return (
                <div
                  key={item.id}
                  className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6 transition-all hover:border-white/[0.08]"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <SmartImage
                        src={itemImage}
                        alt={item.name}
                        className="object-cover"
                        fallbackSrc="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=400"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="bg-white/5 border border-white/10 text-zinc-300 text-xs px-2 py-1 rounded-md">
                          {item.itemType.replace("_", " ")}
                        </span>
                        {item.timeSlot && (
                          <span className="bg-white/5 border border-white/10 text-zinc-300 text-xs px-2 py-1 rounded-md">
                            {formatTimeSlot(item.timeSlot)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-zinc-100 mb-1 truncate">
                        {item.name}
                      </h3>
                      {(item.meta?.area || item.meta?.city) && (
                        <p className="text-sm text-zinc-400 mb-3 flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {item.meta?.area}
                          {item.meta?.area && item.meta?.city && ", "}
                          {item.meta?.city}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-zinc-400 mb-3">
                          {item.description}
                        </p>
                      )}

                      <div className="grid sm:grid-cols-2 gap-2 mb-4">
                        {item.date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-zinc-500" />
                            <span className="text-zinc-400">
                              {new Date(item.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {item.meta?.guestCount && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-zinc-500" />
                            <span className="text-zinc-400">
                              {item.meta.guestCount} guests
                            </span>
                          </div>
                        )}
                      </div>

                      {item.meta?.guestCount && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500">Guests:</span>
                          <Input
                            type="number"
                            min="1"
                            value={item.meta.guestCount}
                            onChange={(e) =>
                              handleUpdateGuestCount(
                                item.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            disabled={updatingItemId === item.id}
                            className="w-24 h-8 bg-white/[0.02] border border-white/[0.05] text-zinc-100"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-0 pt-2 sm:pt-0">
                      <div className="text-xl font-semibold text-zinc-100">
                        {formatCurrency(item.totalPrice)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-zinc-500">
                          {formatCurrency(item.unitPrice)} each
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6 lg:sticky lg:top-24">
              <h2 className="text-xl font-medium tracking-tight text-zinc-100 mb-6">
                Order Summary
              </h2>

              <div className="space-y-2 mb-6">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="bg-white/[0.02] border border-white/[0.05] text-zinc-100 placeholder:text-zinc-500"
                />
                <Button
                  onClick={handleApplyPromoCode}
                  disabled={applyingPromo || !promoCode.trim()}
                  variant="outline"
                  className="w-full border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 transition-all"
                >
                  {applyingPromo ? "Applying..." : "Apply Promo"}
                </Button>
              </div>

              <div className="space-y-3 border-t border-white/[0.05] pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="font-medium text-zinc-100">
                    {formatCurrency(summary.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Platform Fee (2%)</span>
                  <span className="font-medium text-zinc-100">
                    {formatCurrency(summary.platformFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">GST (18%)</span>
                  <span className="font-medium text-zinc-100">
                    {formatCurrency(summary.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-medium pt-3 border-t border-white/[0.05]">
                  <span className="text-zinc-100">Total</span>
                  <span className="text-zinc-100">
                    {formatCurrency(summary.total)}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => router.push("/checkout")}
                className="w-full bg-zinc-100 text-zinc-950 font-semibold py-4 rounded-xl hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] transition-all"
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/venues")}
                className="w-full mt-3 text-zinc-500 hover:text-zinc-300 transition-all"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}