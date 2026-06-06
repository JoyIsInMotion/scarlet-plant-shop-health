import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getItem, setItem } from '@/lib/storage';

const CART_KEY = 'cart.items';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  /** Known stock, used to clamp quantity. Undefined = unconstrained. */
  stock?: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>) => void;
  remove: (id: string) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

// Clamps a desired quantity to [0, stock] when stock is known. quantity <= 0
// signals removal, handled by callers.
function clampQty(quantity: number, stock?: number): number {
  if (stock != null) return Math.min(quantity, stock);
  return quantity;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Only persist once the stored cart has been read, so the initial empty
  // state doesn't wipe what's on disk before hydration completes.
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await getItem(CART_KEY);
        if (active && raw) setItems(JSON.parse(raw) as CartItem[]);
      } catch {
        /* corrupt/unreadable cart — start empty */
      } finally {
        hydrated.current = true;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setItem(CART_KEY, JSON.stringify(items)).catch(() => {
      /* best-effort persistence */
    });
  }, [items]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, ...item, quantity: clampQty(i.quantity + 1, item.stock) }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const update = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) =>
        i.id === id ? { ...i, quantity: clampQty(quantity, i.stock) } : i
      );
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, add, remove, update, clear, total, count };
  }, [items, add, remove, update, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
