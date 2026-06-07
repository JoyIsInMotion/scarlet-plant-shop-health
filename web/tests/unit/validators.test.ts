import { describe, it, expect } from 'vitest';
import {
  registerSchema, loginSchema, productSchema, orderSchema,
} from '@scarlet/shared';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse({ name: 'Maria', email: 'm@x.com', password: 'longenough' }).success).toBe(true);
  });
  it('rejects short passwords (auth hardening)', () => {
    expect(registerSchema.safeParse({ name: 'Maria', email: 'm@x.com', password: 'short' }).success).toBe(false);
  });
  it('rejects invalid emails', () => {
    expect(registerSchema.safeParse({ name: 'Maria', email: 'not-an-email', password: 'longenough' }).success).toBe(false);
  });
  it('rejects too-short names', () => {
    expect(registerSchema.safeParse({ name: 'M', email: 'm@x.com', password: 'longenough' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'm@x.com', password: 'x' }).success).toBe(true);
  });
  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'm@x.com', password: '' }).success).toBe(false);
  });
});

describe('productSchema', () => {
  const valid = {
    nameBg: 'Букет', nameEn: 'Bouquet', price: '19.99',
    category: 'bouquet', stock: 5, slug: 'bouquet',
  };
  it('accepts a valid product', () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a malformed price', () => {
    expect(productSchema.safeParse({ ...valid, price: '19.999' }).success).toBe(false);
  });
  it('rejects an unknown category', () => {
    expect(productSchema.safeParse({ ...valid, category: 'weapons' }).success).toBe(false);
  });
  it('rejects negative stock', () => {
    expect(productSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
  });
});

describe('orderSchema', () => {
  const item = { productId: UUID, quantity: 2 };
  it('accepts an order with items and a phone', () => {
    expect(orderSchema.safeParse({ items: [item], phone: '+359 88 123 4567' }).success).toBe(true);
  });
  it('rejects an order without a phone (we must be able to call)', () => {
    expect(orderSchema.safeParse({ items: [item] }).success).toBe(false);
  });
  it('rejects an empty order', () => {
    expect(orderSchema.safeParse({ items: [], phone: '+359 88 123 4567' }).success).toBe(false);
  });
  it('rejects a non-uuid product id', () => {
    expect(orderSchema.safeParse({ items: [{ productId: 'abc', quantity: 1 }], phone: '+359 88 123 4567' }).success).toBe(false);
  });
  it('rejects quantity below 1', () => {
    expect(orderSchema.safeParse({ items: [{ productId: UUID, quantity: 0 }], phone: '+359 88 123 4567' }).success).toBe(false);
  });
});
