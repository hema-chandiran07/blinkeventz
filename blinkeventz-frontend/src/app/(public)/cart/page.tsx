"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { CartSummary } from "@/types";

// Utility function for currency formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const TAX_RATE = 0.18; // 18% GST
const SERVICE_FEE = 199;

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();

  const calculateSummary = (): CartSummary => {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1), 0);
    const taxes = subtotal * TAX_RATE;
    const serviceFee = items.length > 0 ? SERVICE_FEE : 0;
    const total = subtotal + taxes + serviceFee;

    return { subtotal, taxes, serviceFee, total };
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const item = items.find((i) => String(i.id) === itemId);
    if (item) {
      const newQuantity = Math.max(1, (item.quantity || 1) + delta);
      updateQuantity(itemId, newQuantity);
    }
  };

  const summary = calculateSummary();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingBag className="h-24 w-24 text-silver-300 mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">Your cart is empty</h2>
          <p className="text-neutral-700 mb-6">Start adding venues and vendors to plan your event!</p>
          <Link href="/venues">
            <Button variant="premium" className="h-12 px-6 text-lg">
              Browse Venues <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-black">Your Event Cart</h1>
        <Button variant="silver" onClick={clearCart} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          Clear Cart
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items Section */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={String(item.id)} className="flex flex-row items-center p-4 transition-shadow hover:shadow-md">
              {/* Item Icon Placeholder */}
              <div className="h-24 w-24 bg-gradient-to-br from-silver-700 to-silver-900 rounded-lg flex items-center justify-center flex-shrink-0">
                {item.itemType === 'VENUE' ? (
                  <svg className="h-10 w-10 text-silver-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ) : item.itemType === 'VENDOR_SERVICE' ? (
                  <svg className="h-10 w-10 text-silver-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="h-10 w-10 text-silver-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
              </div>

              {/* Item Details */}
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium bg-silver-200 text-neutral-800 rounded-full capitalize">
                    {item.itemType ? item.itemType.replace("_", " ") : "Item"}
                  </span>
                  {item.meta?.serviceType && (
                    <span className="text-xs text-black">{item.meta.serviceType}</span>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-black mt-1">{item.name || 'Unnamed Item'}</h3>
                <p className="text-black text-sm">{item.description}</p>
                {typeof item.meta?.area === 'string' && typeof item.meta?.city === 'string' && (
                  <p className="text-silver-300 text-xs mt-1">📍 {item.meta.area}, {item.meta.city}</p>
                )}
                {typeof item.meta?.city === 'string' && typeof item.meta?.area !== 'string' && (
                  <p className="text-silver-300 text-xs mt-1">📍 {item.meta.city}</p>
                )}

                {(() => {
                  const meta = item.meta as Record<string, unknown> | undefined;
                  if (!meta || typeof meta !== 'object') return null;
                  const selectedDate = meta.selectedDate as string | undefined;
                  const selectedSlot = meta.selectedSlot as string | undefined;
                  const timeSlotLabel = meta.timeSlotLabel as string | undefined;
                  const basePrice = meta.basePrice as number | undefined;
                  const pkg = meta.package as string | undefined;

                  if (!selectedDate) return null;

                  return (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-xs text-green-700">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">
                          {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {selectedSlot && (
                        <div className="flex items-center gap-2 text-xs text-green-700 mt-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="capitalize">{timeSlotLabel || selectedSlot.replace("_", " ")}</span>
                        </div>
                      )}
                      {basePrice && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-200">
                          <span className="text-xs text-black">Base: ₹{basePrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs font-semibold text-green-700">You saved: ₹{(basePrice - (item.unitPrice || 0)).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Quantity Controls */}
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    variant="silver"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleUpdateQuantity(String(item.id), -1)}
                    disabled={(item.quantity || 1) <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-medium w-8 text-center">{item.quantity || 1}</span>
                  <Button
                    variant="silver"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleUpdateQuantity(String(item.id), 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="text-right">
                <div className="font-bold text-black text-lg">
                  {formatCurrency((item.unitPrice || 0) * (item.quantity || 1))}
                </div>
                {item.quantity && item.quantity > 1 && (
                  <div className="text-xs text-black">{formatCurrency(item.unitPrice || 0)} each</div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-2 text-red-500 hover:text-red-600 hover:bg-silver-50"
                  onClick={() => handleRemoveItem(String(item.id))}
                  aria-label={`Remove ${item.name} from cart`}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-black font-medium">Subtotal</span>
                <span className="font-medium text-black">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black font-medium">GST (18%)</span>
                <span className="font-medium text-black">{formatCurrency(summary.taxes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black font-medium">Platform Fee</span>
                <span className="font-medium text-black">{formatCurrency(summary.serviceFee)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span className="text-black">Total</span>
                <span className="text-black">{formatCurrency(summary.total)}</span>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-black">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Best price guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-black">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Secure payment via Razorpay</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/checkout" className="w-full">
                <Button variant="premium" className="w-full h-12 text-lg shadow-lg hover:shadow-xl transition-shadow">
                  Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
