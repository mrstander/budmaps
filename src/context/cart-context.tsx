
'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { Product, Dispensary, CartItem } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, dispensary: Dispensary, quantity?: number) => void;
  removeFromCart: (productId: string, weight?: string) => void;
  decrementItem: (productId: string, weight?: string) => void;
  clearCart: () => void;
  groupedByDispensary: { [key: string]: CartItem[] };
  itemCount: number;
  handleSignOut: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const addToCart = useCallback((product: Product, dispensary: Dispensary, quantity: number = 1) => {
    const availableStock = product.stock || 0;
    
    // The product passed in should already have the correct price for the selected tier
    const productToAdd = { ...product };

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.product.id === productToAdd.id && item.product.weight === productToAdd.weight
      );

      let currentQuantityInCart = 0;
      if (existingItemIndex > -1) {
        currentQuantityInCart = prevCart[existingItemIndex].quantity;
      }

      if (currentQuantityInCart + quantity > availableStock) {
        toast({
          variant: 'destructive',
          title: 'Not enough stock',
          description: `You can't add more of ${productToAdd.name}. Only ${availableStock} available.`,
        });
        return prevCart; // Return the unchanged cart
      }
      
      let newCart;
      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        const existingItem = updatedCart[existingItemIndex];
        updatedCart[existingItemIndex] = { ...existingItem, quantity: existingItem.quantity + quantity };
        newCart = updatedCart;
      } else {
        newCart = [...prevCart, { product: productToAdd, dispensary, quantity }];
      }

      return newCart;
    });

    // After updating cart state, navigate to cart page
    router.push('/cart');
  }, [toast, router]);

  const decrementItem = useCallback((productId: string, weight?: string) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.product.id === productId && item.product.weight === weight
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        const existingItem = updatedCart[existingItemIndex];
        if (existingItem.quantity > 1) {
          updatedCart[existingItemIndex] = { ...existingItem, quantity: existingItem.quantity - 1 };
          return updatedCart;
        } else {
          // Remove the item if quantity becomes 0
          return updatedCart.filter((_, index) => index !== existingItemIndex);
        }
      }
      return prevCart; // Should not happen if UI is correct
    });
  }, []);

  const removeFromCart = useCallback((productId: string, weight?: string) => {
    setCart(prevCart =>
      prevCart.filter(item => !(item.product.id === productId && item.product.weight === weight))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    clearCart();
  };

  const groupedByDispensary = useMemo(() => {
    return cart.reduce((acc, item) => {
      const dispensarySlug = item.dispensary.slug || item.dispensary.id!;
      if (!acc[dispensarySlug]) {
        acc[dispensarySlug] = [];
      }
      acc[dispensarySlug].push(item);
      return acc;
    }, {} as { [key: string]: CartItem[] });
  }, [cart]);

  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, itemCount, addToCart, removeFromCart, decrementItem, clearCart, groupedByDispensary, handleSignOut }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
