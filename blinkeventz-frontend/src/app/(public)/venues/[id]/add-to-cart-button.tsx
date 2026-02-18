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
  itemImage?: string;
  metadata?: Record<string, unknown>;
}

export function AddToCartButton({
  itemId,
  itemType,
  itemName,
  itemDescription,
  itemPrice,
  itemImage,
  metadata,
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
        type: itemType,
        name: itemName,
        description: itemDescription,
        price: itemPrice,
        image: itemImage,
        metadata,
      });
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
          : "bg-white hover:bg-purple-50 border-purple-200 text-purple-700"
      }`}
      onClick={handleAddToCart}
      disabled={isAdding}
    >
      {added ? (
        <>
          <X className="h-5 w-5 mr-2" />
          Remove from Cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5 mr-2" />
          {isAdding ? "Adding..." : "Add to Cart"}
        </>
      )}
    </Button>
  );
}
