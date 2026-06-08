import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart, type CartItem } from '@/context/cart';
import * as storage from '@/lib/storage';

jest.mock('@/lib/storage');

const mockGetItem = storage.getItem as jest.Mock;
const mockSetItem = storage.setItem as jest.Mock;

// ─── Test component ───────────────────────────────────────────────────────────

const ITEM_A: Omit<CartItem, 'quantity'> = { id: 'prod-a', name: 'Rose Bouquet', price: 29.99, stock: 5 };
const ITEM_B: Omit<CartItem, 'quantity'> = { id: 'prod-b', name: 'Succulent', price: 9.99, stock: 10 };

function CartStatus() {
  const { items, add, remove, update, clear, total, count } = useCart();
  return (
    <>
      <Text testID="count">{count}</Text>
      <Text testID="total">{total.toFixed(2)}</Text>
      <Text testID="items">{JSON.stringify(items)}</Text>
      <Pressable testID="add-a" onPress={() => add(ITEM_A)} />
      <Pressable testID="add-b" onPress={() => add(ITEM_B)} />
      <Pressable testID="remove-a" onPress={() => remove(ITEM_A.id)} />
      <Pressable testID="update-a-2" onPress={() => update(ITEM_A.id, 2)} />
      <Pressable testID="update-a-0" onPress={() => update(ITEM_A.id, 0)} />
      <Pressable testID="clear" onPress={() => clear()} />
    </>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <CartStatus />
    </CartProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with an empty cart', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));
    expect(getByTestId('total').props.children).toBe('0.00');
  });

  it('restores persisted items from storage', async () => {
    const persisted: CartItem[] = [{ ...ITEM_A, quantity: 2 }];
    mockGetItem.mockResolvedValueOnce(JSON.stringify(persisted));
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(2));
    expect(getByTestId('total').props.children).toBe('59.98');
  });

  it('starts empty when stored cart JSON is corrupt', async () => {
    mockGetItem.mockResolvedValueOnce('CORRUPT{{{');
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));
  });
});

// ─── add() ────────────────────────────────────────────────────────────────────

describe('add()', () => {
  it('adds a new item with quantity 1', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));
    const items: CartItem[] = JSON.parse(getByTestId('items').props.children);
    expect(items[0].id).toBe(ITEM_A.id);
    expect(items[0].quantity).toBe(1);
  });

  it('increments quantity when the same item is added again', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    fireEvent.press(getByTestId('add-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(2));
  });

  it('clamps quantity to the known stock when adding beyond it', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    // ITEM_A has stock: 5; add it 6 times
    for (let i = 0; i < 6; i++) fireEvent.press(getByTestId('add-a'));
    await waitFor(() => {
      const items: CartItem[] = JSON.parse(getByTestId('items').props.children);
      expect(items[0].quantity).toBeLessThanOrEqual(5);
    });
  });

  it('tracks multiple different items independently', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    fireEvent.press(getByTestId('add-b'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(2));
    const items: CartItem[] = JSON.parse(getByTestId('items').props.children);
    expect(items).toHaveLength(2);
  });
});

// ─── remove() ────────────────────────────────────────────────────────────────

describe('remove()', () => {
  it('removes the item by id', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));

    fireEvent.press(getByTestId('remove-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));
  });

  it('is a no-op when the id is not in the cart', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-b'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));
    // Remove an item that was never added
    fireEvent.press(getByTestId('remove-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));
  });
});

// ─── update() ────────────────────────────────────────────────────────────────

describe('update()', () => {
  it('sets the quantity to the given value', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));

    fireEvent.press(getByTestId('update-a-2'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(2));
  });

  it('removes the item when quantity is set to 0', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));

    fireEvent.press(getByTestId('update-a-0'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));
  });

  it('clamps quantity to stock when updating beyond stock', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));
    fireEvent.press(getByTestId('add-a'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(1));

    // Try to set qty to 99 (stock is 5)
    function OverstockComponent() {
      const { update } = useCart();
      return <Pressable testID="overstock" onPress={() => update(ITEM_A.id, 99)} />;
    }
    const { getByTestId: get2 } = render(
      <CartProvider><CartStatus /><OverstockComponent /></CartProvider>
    );
    await waitFor(() => expect(get2('count').props.children).toBe(0));
    fireEvent.press(get2('add-a'));
    await waitFor(() => expect(get2('count').props.children).toBe(1));
    fireEvent.press(get2('overstock'));
    await waitFor(() => {
      const items: CartItem[] = JSON.parse(get2('items').props.children);
      expect(items[0].quantity).toBeLessThanOrEqual(5);
    });
  });
});

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('clear()', () => {
  it('empties the cart', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a'));
    fireEvent.press(getByTestId('add-b'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(2));

    fireEvent.press(getByTestId('clear'));
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));
  });
});

// ─── total ───────────────────────────────────────────────────────────────────

describe('total', () => {
  it('sums price × quantity across all items', async () => {
    const { getByTestId } = renderCart();
    await waitFor(() => expect(getByTestId('count').props.children).toBe(0));

    fireEvent.press(getByTestId('add-a')); // 29.99
    fireEvent.press(getByTestId('add-b')); // 9.99
    await waitFor(() => expect(getByTestId('count').props.children).toBe(2));
    // 29.99 + 9.99 = 39.98
    expect(getByTestId('total').props.children).toBe('39.98');
  });
});

// ─── useCart outside provider ─────────────────────────────────────────────────

describe('useCart() outside provider', () => {
  it('throws a descriptive error', () => {
    function Bare() { useCart(); return null; }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow('CartProvider');
    spy.mockRestore();
  });
});
