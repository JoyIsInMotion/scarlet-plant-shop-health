import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const plantSchema = z.object({
  customName: z.string().min(1, 'Plant name is required').max(100),
  speciesId: z.string().uuid().nullable().optional(),
  lastWatered: z.string().datetime().nullable().optional(),
  speciesConfirmed: z.boolean().optional(),
});

export const plantStatSchema = z.object({
  metricType: z.enum(['water', 'light', 'humidity', 'temperature', 'fertilizer']),
  value: z.number().min(0),
  unit: z.string().max(20).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const productSchema = z.object({
  nameBg: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  descriptionBg: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  category: z.enum(['bouquet', 'potted_plant', 'succulent', 'tropical', 'seasonal', 'accessories']),
  stock: z.number().int().min(0),
  slug: z.string().min(1).max(250),
});

export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1, 'Order must have at least one item'),
  shippingAddress: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PlantInput = z.infer<typeof plantSchema>;
export type PlantStatInput = z.infer<typeof plantStatSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
