"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart, X } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useState } from "react";
import { toast } from "sonner";

interface AddToCartButtonProps {
  itemId: string;
  itemType: "venue" | "vendor" | "service";
  itemName: string;
  itemDescription: string;
  itemPrice: number;
  basePrice?: number;
  itemImage?: string;
  metadata?: Record<string, unknown>;
  disabled?: boolean;
}

export function AddToCartButton({
  itemId,
  itemType,
  itemName,
  itemDescription,
  itemPrice,
  basePrice,
  itemImage,
  metadata,
  disabled = false,
}: AddToCartButtonProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const added = isInCart(itemId);

  const handleAddToCart = () => {
    if (added) {
      removeItem(itemId);
      toast.info(`${itemName} removed from cart`, {
        description: "Item has been removed from your cart",
      });
    } else {
      setIsAdding(true);
      addItem({
        id: itemId,
        itemType: itemType === 'venue' ? 'VENUE' : itemType === 'vendor' ? 'VENDOR_SERVICE' : 'ADDON',
        name: itemName,
        description: itemDescription,
        unitPrice: itemPrice,
        totalPrice: itemPrice,
        image: itemImage,
        meta: {
          ...metadata,
          basePrice,
        },
        cartId: 0,
        venueId: itemType === 'venue' ? parseInt(itemId.split('-')[1] || '0') : null,
        vendorServiceId: null,
        addonId: null,
        date: metadata?.selectedDate,
        timeSlot: metadata?.timeSlot,
        quantity: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      setTimeout(() => {
        setIsAdding(false);
        toast.success(`${itemName} added to cart!`, {
          description: `₹${itemPrice.toLocaleString("en-IN")}`,
        });
      }, 500);
    }
  };

  return (
    <Button
      size="lg"
      variant={added ? "destructive" : "outline"}
      className={`w-full h-12 ${
        added
          ? "bg-red-500 hover:bg-red-600 border-red-500"
          : "bg-white hover:bg-silver-50 border-silver-200 text-neutral-800"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={handleAddToCart}
      disabled={isAdding || disabled}
    >
      {added ? (
        <>
          <X className="h-5 w-5 mr-2" />
          Remove from Cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5 mr-2" />
          {isAdding ? "Adding..." : disabled ? "Select Date & Time" : "Add to Cart"}
        </>
      )}
    </Button>
  );
}
