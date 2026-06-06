import {
  AIAnalysisResult,
  AnalysisList,
  LoginResult,
  Plant,
  PlantList,
  ProductList,
  User,
} from './types';

// Backend base URL. Override per-environment with EXPO_PUBLIC_API_URL
// (e.g. your machine's LAN IP when testing on a physical device).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: string };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
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
    throw new ApiError(message, res.status);
  }

  return payload.data;
}

export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
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

export interface ProductQuery {
  limit?: number;
  offset?: number;
  category?: string;
}

export function getProducts(
  options: ProductQuery = {},
  token?: string | null
): Promise<ProductList> {
  const qs = new URLSearchParams();
  if (options.limit != null) qs.set('limit', String(options.limit));
  if (options.offset != null) qs.set('offset', String(options.offset));
  if (options.category) qs.set('category', options.category);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<ProductList>(`/api/products${suffix}`, { token });
}

// ─── Plants ──────────────────────────────────────────────────────────────────

export function getPlants(
  token: string,
  { limit = 12, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<PlantList> {
  return request<PlantList>(`/api/plants?limit=${limit}&offset=${offset}`, { token });
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
