"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useSyncExternalStore, useRef } from "react";
import { CartItem } from "@/types";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (itemId: string) => boolean;
  getItemCount: () => number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// SSR-safe localStorage adapter using useSyncExternalStore
const cartStorage = {
  getSnapshot: () => {
    if (typeof window === "undefined") return "[]";
    return localStorage.getItem("NearZro-cart") || "[]";
  },
  getServerSnapshot: () => "[]",
  subscribe: (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  },
};

function parseCartFromStorage(): CartItem[] {
  const stored = cartStorage.getSnapshot();
  if (stored && stored !== "[]") {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse cart from localStorage", e);
    }
  }
  return [];
}

// Robust ID parsing function - pure function, no dependencies needed
const parseItemId = (id: any, itemType?: string): { venueId?: number; vendorServiceId?: number } => {
  const stringId = String(id);
  let parsedId = 0;
  
  if (stringId.includes('-')) {
    const parts = stringId.split('-');
    parsedId = parseInt(parts[parts.length - 1], 10);
  } else {
    parsedId = parseInt(stringId, 10);
  }
  
  if (isNaN(parsedId) || parsedId <= 0) {
    console.error('Invalid item ID format:', id, 'parsed:', parsedId);
    return {};
  }
  
  if (itemType === 'VENUE' || stringId.startsWith('venue-')) {
    return { venueId: parsedId };
  } else {
    return { vendorServiceId: parsedId };
  }
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useSyncExternalStore(
    cartStorage.subscribe,
    () => true,
    () => false
  );
  
  const [items, setItems] = useState<CartItem[]>([]);
  const { user, isAuthenticated } = useAuth();

  // authRef holds the latest auth state - fixes stale closure bug
  // The original syncItemToBackend was captured in useCallback with empty deps [],
  // which held stale auth state from mount time. Every API call used the unauthenticated
  // state, resulting in 401 errors that were silently redirected to /login.
  const authRef = useRef({ user, isAuthenticated });
  useEffect(() => {
    authRef.current = { user, isAuthenticated };
  }, [user, isAuthenticated]);

  // Fetch cart from backend when user logs in - this already works correctly
  useEffect(() => {
    const fetchBackendCart = async () => {
      if (!isAuthenticated || !user?.id) {
        return;
      }
      
      try {
        const response = await api.get("/cart");
        const backendCart = response.data;
        
        if (backendCart?.items && Array.isArray(backendCart.items)) {
          const backendItems: CartItem[] = backendCart.items.map((item: any) => {
            const id = item.venueId 
              ? `venue-${item.venueId}` 
              : item.vendorServiceId 
                ? `vendor-service-${item.vendorServiceId}`
                : `addon-${item.addonId}`;
            
            return {
              id,
              itemType: item.itemType,
              name: item.name || "Item",
              description: item.meta?.package || item.meta?.serviceType || "",
              unitPrice: parseFloat(item.unitPrice) || 0,
              totalPrice: parseFloat(item.totalPrice) || 0,
              image: item.meta?.image || "",
              quantity: item.quantity || 1,
              cartId: item.cartId || 0,
              venueId: item.venueId,
              vendorServiceId: item.vendorServiceId,
              addonId: item.addonId,
              date: item.date,
              timeSlot: item.timeSlot,
              meta: item.meta,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              backendItemId: item.id,
            };
          });
          
          setItems(backendItems);
          localStorage.setItem("NearZro-cart", JSON.stringify(backendItems));
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error("Failed to fetch cart from backend:", error);
        }
        setItems(parseCartFromStorage());
      }
    };

    fetchBackendCart();
  }, [isAuthenticated, user?.id]);

  // Clear cart when user logs out
  useEffect(() => {
    if (!isAuthenticated && items.length > 0) {
      setItems([]);
      localStorage.removeItem("NearZro-cart");
    }
  }, [isAuthenticated]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem("NearZro-cart", JSON.stringify(items));
    } else {
      localStorage.removeItem("NearZro-cart");
    }
  }, [items]);

  /**
   * addItem - Fixed stale closure bug
   * 
   * Original implementation: syncItemToBackend was captured in useCallback([]),
   * which held stale auth state from mount time. Every API call fired without
   * the JWT token because auth wasn't initialized yet when the function was memoized.
   * 
   * Fix: Use authRef to always get fresh auth state, call api directly inline
   * (not through another function), and check authentication before API calls.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const addItem = useCallback(async (item: CartItem) => {
    // Always get fresh auth state from authRef (not stale closure)
    if (!authRef.current.isAuthenticated) {
      toast.error("Please login to add items to cart");
      return;
    }

    const { venueId, vendorServiceId } = parseItemId(item.id, item.itemType);

    if (!venueId && !vendorServiceId) {
      console.error('Cannot parse item ID:', item.id);
      toast.error('Failed to add item: invalid ID format');
      return;
    }

    const apiPayload = {
      itemType: item.itemType || 'VENUE',
      venueId: venueId || undefined,
      vendorServiceId: vendorServiceId || undefined,
      timeSlot: item.timeSlot || undefined,
      quantity: item.quantity || 1,
      meta: item.meta || undefined,
    };

    console.log('Adding to cart:', apiPayload);

    try {
      const response = await api.post("/cart/items", apiPayload);
      console.log('Cart add success:', response.data);
      
      if (item.meta?.isExpress) {
        try {
          await api.post('/cart/express', { isExpress: true });
          console.log('Express Cart mode enabled');
        } catch (expressError) {
          console.error('Failed to set express mode:', expressError);
          // Non-fatal, so we don't throw, just log
        }
      }
      
      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === item.id);
        if (existingIndex >= 0) {
          const newItems = [...prev];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: (newItems[existingIndex].quantity || 1) + 1,
            ...(response.data?.id ? { backendItemId: response.data.id } : {}),
          };
          return newItems;
        }
        return [...prev, { ...item, quantity: 1, ...(response.data?.id ? { backendItemId: response.data.id } : {}) }];
      });
    } catch (error: any) {
      console.error('Failed to add item to backend:', error);
      if (error.response) {
        console.error('Backend error response:', error.response.status, error.response.data);
      }
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to add item: ${errorMessage}`);
      throw error;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const removeItem = useCallback(async (itemId: string) => {
    const itemToRemove = items.find((i) => i.id === itemId);
    if (!itemToRemove) return;

    if (!authRef.current.isAuthenticated) {
      toast.error("Please login to remove items from cart");
      return;
    }

    let backendId: number;
    const existingBackendId = (itemToRemove as any).backendItemId;
    if (existingBackendId) {
      backendId = existingBackendId;
    } else {
      const stringId = String(itemId);
      backendId = parseInt(stringId.split('-')[1] || stringId, 10);
    }

    if (isNaN(backendId)) {
      console.error('Cannot parse item ID for removal:', itemId);
      toast.error('Failed to remove item: invalid ID');
      return;
    }

    try {
      await api.delete(`/cart/items/${backendId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success('Item removed from cart');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('Item already removed from backend (404), cleaning up local state');
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        console.error('Failed to remove item from backend:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        toast.error(`Failed to remove item: ${errorMessage}`);
        throw error;
      }
    }
  }, [items]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    const itemToUpdate = items.find((i) => i.id === itemId);
    if (!itemToUpdate) return;

    if (!authRef.current.isAuthenticated) {
      toast.error("Please login to update cart");
      return;
    }

    const newQuantity = Math.max(1, quantity);

    let backendId: number;
    const existingBackendId = (itemToUpdate as any).backendItemId;
    if (existingBackendId) {
      backendId = existingBackendId;
    } else {
      const stringId = String(itemId);
      backendId = parseInt(stringId.split('-')[1] || stringId, 10);
    }

    if (isNaN(backendId)) {
      console.error('Cannot parse item ID for update:', itemId);
      toast.error('Failed to update item: invalid ID');
      return;
    }

    try {
      await api.patch(`/cart/items/${backendId}`, { quantity: newQuantity });
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
      );
    } catch (error: any) {
      console.error('Failed to update item in backend:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to update item: ${errorMessage}`);
      throw error;
    }
  }, [items]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const clearCart = useCallback(async () => {
    if (!authRef.current.isAuthenticated) {
      localStorage.removeItem("NearZro-cart");
      setItems([]);
      return;
    }

    try {
      await api.delete("/cart/clear");
      localStorage.removeItem("NearZro-cart");
      setItems([]);
    } catch (error: any) {
      console.error("Failed to clear cart in backend:", error);
      toast.error("Failed to clear cart. Please try again.");
    }
  }, []);

  const isInCart = useCallback(
    (itemId: string) => {
      return items.some((item) => item.id === itemId);
    },
    [items]
  );

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + (item.quantity || 1), 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
        getItemCount,
        isHydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}