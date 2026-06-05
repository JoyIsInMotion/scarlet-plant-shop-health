export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
}

export interface Order {
  id: string;
  userId: string;
  total: string;
  status: OrderStatus;
  shippingAddress: string | null;
  notes: string | null;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
