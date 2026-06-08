import { Platform } from 'react-native';
import {
  AIAnalysisResult,
  AnalysisList,
  LoginResult,
  Plant,
  PlantList,
  Product,
  ProductList,
  User,
} from './types';

// Backend base URL. Override per-environment with EXPO_PUBLIC_API_URL
// (e.g. your machine's LAN IP when testing on a physical device).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export class ApiError extends Error {
  status: number;
  // Optional machine-readable code from the server (e.g. 'ANON_LIMIT').
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  // FormData (multipart uploads) must not be JSON-stringified, and the
  // Content-Type header must be left for fetch to set with the right boundary.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  } catch {
    // Network-level failure (server down, DNS, CORS preflight blocked).
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload || payload.success === false) {
    const message =
      payload && payload.success === false ? payload.error : `Request failed (${res.status})`;
    const code = payload && payload.success === false ? payload.code : undefined;
    throw new ApiError(message, res.status, code);
  }

  return payload.data;
}

export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

// Creates a new account and returns a ready-to-use session (same shape as
// login). The backend validates name (≥2), email, and password (≥8) and
// replies 409 if the email is already taken.
export function register(
  name: string,
  email: string,
  password: string
): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function logout(refreshToken: string | null): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  });
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

// Exchanges a valid refresh token for a fresh access/refresh pair. The backend
// rotates the refresh token, so the new one must be persisted. Throws ApiError
// 401 when the refresh token is expired or revoked.
export function refresh(refreshToken: string): Promise<RefreshResult> {
  return request<RefreshResult>('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function getMe(token: string): Promise<User> {
  return request<User>('/api/users/me', { token });
}

// Updates the signed-in user's editable profile fields (name, phone, locale).
export function updateMe(
  token: string,
  data: { name?: string; phone?: string | null; preferredLocale?: 'bg' | 'en' }
): Promise<User> {
  return request<User>('/api/users/me', { method: 'PUT', body: data, token });
}

export interface ProductQuery {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
  sort?: 'createdAt' | 'price';
  order?: 'asc' | 'desc';
}

export function getProducts(
  options: ProductQuery = {},
  token?: string | null
): Promise<ProductList> {
  const qs = new URLSearchParams();
  if (options.limit != null) qs.set('limit', String(options.limit));
  if (options.offset != null) qs.set('offset', String(options.offset));
  if (options.category) qs.set('category', options.category);
  if (options.search) qs.set('search', options.search);
  if (options.sort) qs.set('sort', options.sort);
  if (options.order) qs.set('order', options.order);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<ProductList>(`/api/products${suffix}`, { token });
}

// Fetches a single product by id. Public — no token required.
export function getProduct(id: string, token?: string | null): Promise<Product> {
  return request<Product>(`/api/products/${id}`, { token });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  // Required by the backend — the shop calls the customer about the order.
  phone: string;
  shippingAddress?: string | null;
  notes?: string | null;
}

export interface Order {
  id: string;
  userId: string;
  total: string;
  status: string;
  phone: string | null;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Places an order for the items in the cart. The backend validates stock and
// decrements it, so a 400 here means an item ran out — surface its message.
export function createOrder(input: CreateOrderInput, token: string): Promise<Order> {
  return request<Order>('/api/orders', { method: 'POST', body: input, token });
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderLineItem {
  orderId: string;
  quantity: number;
  unitPrice: string;
  nameBg: string | null;
  nameEn: string | null;
  imageUrl: string | null;
}

export interface OrderWithItems extends Order {
  status: OrderStatus;
  items: OrderLineItem[];
}

export interface OrderList {
  items: OrderWithItems[];
  total: number;
  limit: number;
  offset: number;
}

// Lists the signed-in user's orders, newest first. Offset-based paging mirrors
// getProducts.
export function getOrders(
  token: string,
  { limit = 10, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<OrderList> {
  return request<OrderList>(`/api/orders?limit=${limit}&offset=${offset}`, { token });
}

// ─── Plants ──────────────────────────────────────────────────────────────────

export function getPlants(
  token: string,
  { limit = 12, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<PlantList> {
  return request<PlantList>(`/api/plants?limit=${limit}&offset=${offset}`, { token });
}

export interface CreatePlantInput {
  customName: string;
  speciesId?: string | null;
  lastWatered?: string | null;
  speciesConfirmed?: boolean;
}

export function createPlant(input: CreatePlantInput, token: string): Promise<Plant> {
  return request<Plant>('/api/plants', { method: 'POST', body: input, token });
}

export interface IdentifyResult {
  identified: boolean;
  confidence: string;
  commonNameEn?: string | null;
  scientificName?: string | null;
  matchedSpeciesId?: string | null;
  matchedCommonNameEn?: string | null;
  matchedCommonNameBg?: string | null;
  inOurDatabase?: boolean;
}

// AI species identification from a photo. Requires auth.
export async function identifyPlant(image: ScanImage, token: string): Promise<IdentifyResult> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(image.uri).then((r) => r.blob());
    form.append('image', blob, image.name);
  } else {
    form.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.mimeType,
    } as unknown as Blob);
  }
  return request<IdentifyResult>('/api/ai/identify', { method: 'POST', body: form, token });
}

export interface CatalogSpecies {
  id: string;
  commonNameEn: string | null;
  commonNameBg: string | null;
  scientificName: string;
}

export interface CatalogList {
  species: CatalogSpecies[];
  total: number;
}

// Public species catalog search — no token required.
export function searchCatalog(query: string): Promise<CatalogList> {
  return request<CatalogList>(
    `/api/catalog?search=${encodeURIComponent(query)}&limit=6`
  );
}

export interface UpdatePlantInput {
  customName?: string;
  speciesId?: string | null;
  lastWatered?: string | null;
  speciesConfirmed?: boolean;
}

export function updatePlant(id: string, input: UpdatePlantInput, token: string): Promise<Plant> {
  return request<Plant>(`/api/plants/${id}`, { method: 'PUT', body: input, token });
}

export function deletePlant(id: string, token: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/plants/${id}`, { method: 'DELETE', token });
}

// Uploads (or replaces) the cover photo for a plant.
export async function uploadPlantImage(
  plantId: string,
  image: ScanImage,
  token: string
): Promise<Plant> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(image.uri).then((r) => r.blob());
    form.append('image', blob, image.name);
  } else {
    form.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.mimeType,
    } as unknown as Blob);
  }
  return request<Plant>(`/api/plants/${plantId}/image`, { method: 'POST', body: form, token });
}

export function getPlant(id: string, token: string): Promise<Plant> {
  return request<Plant>(`/api/plants/${id}`, { token });
}

export function getPlantAnalyses(
  id: string,
  token: string,
  { limit = 5, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<AnalysisList> {
  return request<AnalysisList>(`/api/plants/${id}/analyses?limit=${limit}&offset=${offset}`, {
    token,
  });
}

export function runPlantAnalysis(id: string, token: string): Promise<AIAnalysisResult> {
  return request<AIAnalysisResult>(`/api/plants/${id}/ai-analysis`, { method: 'POST', token });
}

// ─── AI quick scan ─────────────────────────────────────────────────────────

// Describes a local image picked/captured on the device, ready for upload.
export interface ScanImage {
  uri: string;
  name: string;
  mimeType: string;
}

// Runs an ad-hoc AI scan on a freshly picked photo. Mirrors the web's
// /api/ai/quick-scan: multipart upload, returns species + health assessment.
// With a token it's the per-user 5/day limit; without one the server allows a
// single anonymous scan (cookie-tracked) then replies 401 with code
// 'ANON_LIMIT'.
export async function quickScan(
  image: ScanImage,
  token?: string | null
): Promise<AIAnalysisResult> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Browsers require a real Blob/File — the {uri,name,type} shape is coerced
    // to "[object Object]" and the server rejects it. Read the (data/blob) URI
    // produced by the image picker/manipulator back into a Blob.
    const blob = await fetch(image.uri).then((r) => r.blob());
    form.append('image', blob, image.name);
  } else {
    // React Native's fetch accepts this {uri,name,type} shape for file parts.
    form.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.mimeType,
    } as unknown as Blob);
  }
  return request<AIAnalysisResult>('/api/ai/quick-scan', { method: 'POST', body: form, token });
}
