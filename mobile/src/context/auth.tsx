import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import { deleteItem, getItem, setItem } from '@/lib/storage';
import { User } from '@/lib/types';

const SESSION_KEY = 'auth.session';

interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True while restoring a persisted session on startup. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Runs an authenticated API call, injecting the current access token. On a
   * 401 it transparently refreshes the token once and retries; if the refresh
   * token is also dead, it logs out and throws.
   */
  authedRequest: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mirror the session in a ref so async flows (refresh, authedRequest) always
  // read the latest value without being re-created on every change.
  const sessionRef = useRef<Session | null>(null);
  // De-dupes concurrent refreshes (e.g. two screens hitting 401 at once).
  const refreshPromiseRef = useRef<Promise<Session | null> | null>(null);

  const writeSession = useCallback(async (next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    if (next) await setItem(SESSION_KEY, JSON.stringify(next));
    else await deleteItem(SESSION_KEY);
  }, []);

  // Single-flight token refresh. Returns the new session, or null if the
  // refresh token is invalid/expired (in which case the session is cleared).
  const refreshSession = useCallback((): Promise<Session | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const current = sessionRef.current;
    if (!current) return Promise.resolve(null);

    const p = (async (): Promise<Session | null> => {
      try {
        const result = await api.refresh(current.refreshToken);
        const next: Session = {
          user: current.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
        await writeSession(next);
        return next;
      } catch (e) {
        // A 401 means the refresh token is dead → force logout. Network or
        // server errors are transient, so keep the session and let the caller
        // surface the failure.
        if (e instanceof ApiError && e.status === 401) {
          await writeSession(null);
          return null;
        }
        throw e;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = p;
    return p;
  }, [writeSession]);

  const authedRequest = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      const current = sessionRef.current;
      if (!current) throw new ApiError('Not authenticated', 401);

      try {
        return await fn(current.accessToken);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          const refreshed = await refreshSession();
          if (refreshed) return fn(refreshed.accessToken);
          throw new ApiError('Session expired. Please log in again.', 401);
        }
        throw e;
      }
    },
    [refreshSession]
  );

  // Restore a persisted session on startup, then validate it in the background.
  useEffect(() => {
    let active = true;
    (async () => {
      let restored: Session | null = null;
      try {
        const raw = await getItem(SESSION_KEY);
        if (raw) restored = JSON.parse(raw) as Session;
      } catch {
        restored = null; // Corrupt/unreadable session — start logged out.
      }

      if (!active) return;
      sessionRef.current = restored;
      setSession(restored);
      setIsLoading(false);

      // Confirm the restored session is still valid. authedRequest refreshes an
      // expired access token, or clears the session if the refresh token is
      // also dead. Network errors are swallowed so offline launches stay signed
      // in.
      if (restored) {
        authedRequest((token) => api.getMe(token)).catch(() => {
          /* handled inside authedRequest (logout) or transient — ignore */
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [authedRequest]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password);
      await writeSession({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    },
    [writeSession]
  );

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken ?? null;
    await writeSession(null);
    // Best-effort server-side revocation; never block local logout on it.
    try {
      await api.logout(refreshToken);
    } catch {
      // Ignore — the local session is already cleared.
    }
  }, [writeSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: !!session,
      isLoading,
      login,
      logout,
      authedRequest,
    }),
    [session, isLoading, login, logout, authedRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
