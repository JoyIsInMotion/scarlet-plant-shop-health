import { LoginResult, ProductList, User } from './types';

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

export function getProducts(token?: string | null): Promise<ProductList> {
  return request<ProductList>('/api/products', { token });
}
