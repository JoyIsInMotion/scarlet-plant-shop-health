'use client';
import * as React from 'react';
import { ToastContext, ToastData } from '@/hooks/use-toast';
import {
  ToastProvider as RadixToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from '@/components/ui/toast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((data: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...data, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, data.duration ?? 4000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      <RadixToastProvider>
        {children}
        {toasts.map((t) => (
          <Toast key={t.id} variant={t.variant} open onOpenChange={(open) => !open && dismiss(t.id)}>
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}
