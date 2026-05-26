'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@scarlet/shared';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const refresh = useCallback(async () => {
    try {
      let res = await fetch('/api/users/me');

      if (res.status === 401) {
        const tokenRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (tokenRes.ok) {
          res = await fetch('/api/users/me');
        }
      }

      if (res.ok) {
        const { data } = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!initialUser) {
      refresh().finally(() => setIsLoading(false));
    }
  }, [initialUser, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? 'Login failed');
    }
    const { data } = await res.json();
    setUser(data.user);
    // Store token for mobile-style API calls
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.accessToken);
    }
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: null }),
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
