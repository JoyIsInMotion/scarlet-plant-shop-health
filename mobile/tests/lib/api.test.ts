import {
  ApiError,
  login,
  register,
  logout,
  getMe,
  getPlants,
  getPlant,
  createPlant,
  updatePlant,
  deletePlant,
  getProducts,
  searchCatalog,
  getOrders,
  runPlantAnalysis,
  quickScan,
  type ScanImage,
} from '@/lib/api';

// ─── Fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function ok<T>(data: T, status = 200): Response {
  return {
    ok: true,
    status,
    json: () => Promise.resolve({ success: true, data }),
  } as unknown as Response;
}

function fail(message: string, status: number, code?: string): Response {
  return {
    ok: false,
    status,
    json: () =>
      Promise.resolve({ success: false, error: message, ...(code ? { code } : {}) }),
  } as unknown as Response;
}

beforeEach(() => mockFetch.mockReset());

// ─── ApiError ────────────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('stores message, status, and optional code', () => {
    const e = new ApiError('Not found', 404, 'NOT_FOUND');
    expect(e.message).toBe('Not found');
    expect(e.status).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
    expect(e.name).toBe('ApiError');
    expect(e).toBeInstanceOf(Error);
  });

  it('works without a code', () => {
    const e = new ApiError('Unauthorized', 401);
    expect(e.code).toBeUndefined();
  });
});

// ─── Network-level failures ───────────────────────────────────────────────────

describe('network errors', () => {
  it('wraps a fetch rejection in ApiError with status 0', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(login('a@b.com', 'pw')).rejects.toMatchObject({ status: 0 });
  });

  it('includes a user-friendly message when the server is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(login('a@b.com', 'pw')).rejects.toMatchObject({
      message: expect.stringContaining('server'),
    });
  });
});

// ─── Auth endpoints ───────────────────────────────────────────────────────────

describe('login()', () => {
  const user = { id: '1', name: 'Test', email: 'test@example.com' };

  it('POSTs to /api/auth/login with email and password', async () => {
    mockFetch.mockResolvedValueOnce(ok({ user, accessToken: 'at', refreshToken: 'rt' }));
    const result = await login('test@example.com', 'secret');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/login');
    expect(opts.method).toBe('POST');
    expect(result.accessToken).toBe('at');
    expect(result.user).toEqual(user);
  });

  it('throws ApiError 401 on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce(fail('Invalid credentials', 401));
    await expect(login('bad@example.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
  });

  it('does NOT send an Authorization header (public endpoint)', async () => {
    mockFetch.mockResolvedValueOnce(ok({ user, accessToken: 'at', refreshToken: 'rt' }));
    await login('a@b.com', 'pw');
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });
});

describe('register()', () => {
  it('POSTs to /api/auth/register with name, email, password', async () => {
    const user = { id: '2', name: 'New User', email: 'new@example.com' };
    mockFetch.mockResolvedValueOnce(ok({ user, accessToken: 'at', refreshToken: 'rt' }));
    await register('New User', 'new@example.com', 'password123');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/register');
    expect(JSON.parse(opts.body as string)).toMatchObject({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
    });
  });

  it('throws ApiError 409 when email is already taken', async () => {
    mockFetch.mockResolvedValueOnce(fail('Email already registered', 409));
    await expect(register('Maria', 'taken@example.com', 'pass1234')).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe('logout()', () => {
  it('POSTs to /api/auth/logout with the refresh token', async () => {
    mockFetch.mockResolvedValueOnce(ok({ message: 'OK' }));
    await logout('rt123');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/logout');
    expect(JSON.parse(opts.body as string)).toEqual({ refreshToken: 'rt123' });
  });
});

// ─── Bearer token injection (security) ───────────────────────────────────────

describe('Bearer token injection', () => {
  it('getMe sends Authorization: Bearer <token>', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: '1', name: 'Test' }));
    await getMe('my-access-token');
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer my-access-token'
    );
  });

  it('getPlants sends Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ plants: [], total: 0, hasMore: false, nextCursor: null })
    );
    await getPlants('tok-456');
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-456');
  });

  it('getPlant sends Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'p1' }));
    await getPlant('p1', 'tok-x');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/plants/p1');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-x');
  });

  it('updatePlant PUTs with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'p1' }));
    await updatePlant('p1', { customName: 'New Name' }, 'tok-y');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/plants/p1');
    expect(opts.method).toBe('PUT');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-y');
  });

  it('deletePlant sends DELETE with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(ok({ message: 'Deleted' }));
    await deletePlant('plant-1', 'tok-789');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/plants/plant-1');
    expect(opts.method).toBe('DELETE');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-789');
  });

  it('runPlantAnalysis POSTs with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ analysis: {}, matchedSpecies: null, advice: null, careBasics: null })
    );
    await runPlantAnalysis('plant-2', 'tok-abc');
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/plants/plant-2/ai-analysis');
    expect(opts.method).toBe('POST');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-abc');
  });

  it('getOrders sends Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], total: 0, limit: 10, offset: 0 }));
    await getOrders('tok-orders');
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-orders');
  });
});

// ─── Public endpoints — no token expected ────────────────────────────────────

describe('public endpoints omit Authorization', () => {
  it('getProducts sends no Authorization header by default', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ items: [], total: 0, limit: 12, offset: 0, hasMore: false })
    );
    await getProducts();
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('searchCatalog sends no Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(ok({ species: [], total: 0 }));
    await searchCatalog('rose');
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });
});

// ─── Pagination query-string building (scalability) ──────────────────────────

describe('getPlants() pagination', () => {
  it('appends limit and offset', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ plants: [], total: 0, hasMore: false, nextCursor: null })
    );
    await getPlants('tok', { limit: 6, offset: 12 });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('limit=6');
    expect(url).toContain('offset=12');
  });

  it('defaults to limit=12 offset=0', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ plants: [], total: 0, hasMore: false, nextCursor: null })
    );
    await getPlants('tok');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('limit=12');
    expect(url).toContain('offset=0');
  });
});

describe('getProducts() query string', () => {
  it('appends category, search, limit when provided', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ items: [], total: 0, limit: 10, offset: 0, hasMore: false })
    );
    await getProducts({ category: 'bouquet', search: 'rose', limit: 10 });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('category=bouquet');
    expect(url).toContain('search=rose');
    expect(url).toContain('limit=10');
  });

  it('omits query string when no options given', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ items: [], total: 0, limit: 12, offset: 0, hasMore: false })
    );
    await getProducts({});
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).not.toContain('?');
  });
});

describe('getOrders() pagination', () => {
  it('passes limit and offset to the query string', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], total: 0, limit: 5, offset: 10 }));
    await getOrders('tok', { limit: 5, offset: 10 });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('limit=5');
    expect(url).toContain('offset=10');
  });
});

describe('searchCatalog() URL encoding', () => {
  it('URL-encodes the query parameter', async () => {
    mockFetch.mockResolvedValueOnce(ok({ species: [], total: 0 }));
    await searchCatalog('rose & lily');
    const [url] = mockFetch.mock.calls[0] as [string];
    // Spaces and & must be encoded
    expect(url).not.toContain('rose & lily');
    expect(decodeURIComponent(url)).toContain('rose & lily');
  });
});

// ─── Anonymous scan limit (rate-limit codes) ──────────────────────────────────

describe('quickScan() anonymous limit', () => {
  it('omits Authorization when no token is passed', async () => {
    const img: ScanImage = { uri: 'file://a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' };
    mockFetch.mockResolvedValueOnce(
      ok({ analysis: {}, matchedSpecies: null, advice: null, careBasics: null })
    );
    await quickScan(img);
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('includes Authorization when a token is supplied', async () => {
    const img: ScanImage = { uri: 'file://a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' };
    mockFetch.mockResolvedValueOnce(
      ok({ analysis: {}, matchedSpecies: null, advice: null, careBasics: null })
    );
    await quickScan(img, 'user-token');
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer user-token');
  });

  it('surfaces ANON_LIMIT code when the anonymous daily cap is exceeded', async () => {
    const img: ScanImage = { uri: 'file://a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' };
    mockFetch.mockResolvedValueOnce(fail('Anonymous scan limit reached', 401, 'ANON_LIMIT'));
    await expect(quickScan(img)).rejects.toMatchObject({ code: 'ANON_LIMIT', status: 401 });
  });
});

// ─── Error envelope parsing ───────────────────────────────────────────────────

describe('error response handling', () => {
  it('surfaces the server error message from the envelope', async () => {
    mockFetch.mockResolvedValueOnce(fail('Insufficient stock', 400));
    await expect(createPlant({ customName: 'Test' }, 'tok')).rejects.toMatchObject({
      message: 'Insufficient stock',
      status: 400,
    });
  });

  it('falls back to a generic message when JSON body is unreadable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error('invalid json')),
    } as unknown as Response);
    await expect(getMe('tok')).rejects.toMatchObject({ status: 503 });
  });

  it('reports 429 when the server enforces a rate limit', async () => {
    mockFetch.mockResolvedValueOnce(fail('Too many requests', 429));
    await expect(runPlantAnalysis('p1', 'tok')).rejects.toMatchObject({ status: 429 });
  });
});
