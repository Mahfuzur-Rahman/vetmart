'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface CartProduct {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  genericName?: string | null;
  dosageForm?: string | null;
  packSize?: string | null;
  packUnit?: string | null;
  mrp: number;
  salePrice: number;
  requiresPrescription?: boolean;
  requiresColdChain?: boolean;
  coldChain?: boolean;
  imageUrl?: string | null;
  sellableStock?: number;
  stock?: number;
}

export interface CartItem {
  product: CartProduct;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hasColdChain: boolean;
  coldChainFee: number;
  estDeliveryFee: number;
  grandTotal: number;
  addToCart: (product: CartProduct, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  getItemQty: (productId: string) => number;
  clearCart: () => void;
  isHydrated: boolean;
}

const STORAGE_KEY = 'vetmart_cart_v1';

// Initial cart items (empty for clean testing slate)
const INITIAL_DEMO_ITEMS: CartItem[] = [];

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        } else {
          setItems(INITIAL_DEMO_ITEMS);
        }
      } else {
        setItems(INITIAL_DEMO_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ITEMS));
      }
    } catch {
      setItems(INITIAL_DEMO_ITEMS);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage on changes after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist cart to localStorage', e);
    }
  }, [items, isHydrated]);

  // Sync latest product details (images, prices) from server on mount
  useEffect(() => {
    if (!isHydrated) return;
    
    fetch('/api/v1/cart')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
          const serverItems = json.data.items;
          setItems((prev) => {
            // Only update if the user hasn't cleared the cart in the meantime
            if (prev.length === 0) return prev;
            
            // Map server items, falling back to local item for any missing props
            return serverItems.map((apiItem: any) => {
              const localMatch = prev.find(p => p.product.id === apiItem.productId);
              return {
                qty: apiItem.qty,
                product: {
                  ...localMatch?.product,
                  id: apiItem.productId,
                  slug: apiItem.product.slug,
                  nameEn: apiItem.product.nameEn,
                  nameBn: apiItem.product.nameBn,
                  genericName: apiItem.product.genericName,
                  dosageForm: apiItem.product.dosageForm,
                  packSize: apiItem.product.packSize,
                  mrp: apiItem.product.mrp,
                  salePrice: apiItem.product.salePrice,
                  requiresPrescription: apiItem.product.requiresPrescription,
                  requiresColdChain: apiItem.product.requiresColdChain,
                  imageUrl: apiItem.product.imageUrl,
                },
              };
            });
          });
        }
      })
      .catch(() => {});
  }, [isHydrated]);

  const addToCart = useCallback((product: CartProduct, qtyToAdd: number = 1) => {
    if (qtyToAdd <= 0) return;
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].qty + qtyToAdd;
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty,
          // Merge latest product info
          product: { ...updated[existingIndex].product, ...product },
        };
        return updated;
      } else {
        return [...prev, { product, qty: qtyToAdd }];
      }
    });

    // Fire background API sync non-blockingly
    try {
      fetch('/api/v1/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, qty: qtyToAdd }),
      }).catch(() => {});
    } catch {
      // Ignore background sync errors
    }
  }, []);

  const updateQty = useCallback((productId: string, newQty: number) => {
    setItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, qty: newQty };
        }
        return item;
      });
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const getItemQty = useCallback(
    (productId: string) => {
      const found = items.find((item) => item.product.id === productId);
      return found ? found.qty : 0;
    },
    [items]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.salePrice * item.qty, 0);
  }, [items]);

  const hasColdChain = useMemo(() => {
    return items.some((item) => item.product.requiresColdChain || item.product.coldChain);
  }, [items]);

  const coldChainFee = hasColdChain ? 3000 : 0; // ৳30.00
  const estDeliveryFee = 7000; // ৳70.00 Inside Dhaka
  const grandTotal = subtotal + coldChainFee + estDeliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        hasColdChain,
        coldChainFee,
        estDeliveryFee,
        grandTotal,
        addToCart,
        updateQty,
        removeFromCart,
        getItemQty,
        clearCart,
        isHydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
