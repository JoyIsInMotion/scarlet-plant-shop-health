'use client';
import * as React from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>) => void;
  remove: (id: string) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

export const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
