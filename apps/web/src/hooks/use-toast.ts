'use client';
import * as React from 'react';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

type ToastContextValue = {
  toasts: ToastData[];
  toast: (data: Omit<ToastData, 'id'>) => void;
  dismiss: (id: string) => void;
};

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
