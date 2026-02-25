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
    const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    const taxes = subtotal * TAX_RATE;
    const serviceFee = items.length > 0 ? SERVICE_FEE : 0;
    const total = subtotal + taxes + serviceFee;

    return { subtotal, taxes, serviceFee, total };
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
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
          <ShoppingBag className="h-24 w-24 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Start adding venues and vendors to plan your event!</p>
          <Link href="/venues">
            <Button className="h-12 px-6 text-lg">
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
        <h1 className="text-3xl font-bold text-gray-900">Your Event Cart</h1>
        <Button variant="outline" onClick={clearCart} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          Clear Cart
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items Section */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-row items-center p-4 transition-shadow hover:shadow-md">
              {/* Item Image */}
              <div
                className="h-24 w-24 bg-gray-200 rounded-lg object-cover flex-shrink-0 bg-cover bg-center"
                style={{ backgroundImage: item.image ? `url(${item.image})` : "none" }}
              />

              {/* Item Details */}
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full capitalize">
                    {item.type}
                  </span>
                  {item.metadata?.serviceType && (
                    <span className="text-xs text-gray-500">{item.metadata.serviceType}</span>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mt-1">{item.name}</h3>
                <p className="text-gray-500 text-sm">{item.description}</p>
                {typeof item.metadata?.area === 'string' && typeof item.metadata?.city === 'string' && (
                  <p className="text-gray-400 text-xs mt-1">📍 {item.metadata.area}, {item.metadata.city}</p>
                )}
                {typeof item.metadata?.city === 'string' && typeof item.metadata?.area !== 'string' && (
                  <p className="text-gray-400 text-xs mt-1">📍 {item.metadata.city}</p>
                )}
                
                {(() => {
                  const meta = item.metadata as Record<string, unknown> | undefined;
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
                          <span className="text-xs text-gray-500">Base: ₹{basePrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs font-semibold text-green-700">You saved: ₹{(basePrice - item.price).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Quantity Controls */}
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                    disabled={(item.quantity || 1) <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-medium w-8 text-center">{item.quantity || 1}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="text-right">
                <div className="font-bold text-purple-600 text-lg">
                  {formatCurrency(item.price * (item.quantity || 1))}
                </div>
                {item.quantity && item.quantity > 1 && (
                  <div className="text-xs text-gray-500">{formatCurrency(item.price)} each</div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemoveItem(item.id)}
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
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-medium">{formatCurrency(summary.taxes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform Fee</span>
                <span className="font-medium">{formatCurrency(summary.serviceFee)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-purple-600">{formatCurrency(summary.total)}</span>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Best price guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Secure payment via Razorpay</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/checkout" className="w-full">
                <Button className="w-full h-12 text-lg shadow-lg hover:shadow-xl transition-shadow">
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
