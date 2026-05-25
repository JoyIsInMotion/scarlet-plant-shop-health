import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-xl',
};

export function Avatar({ src, alt, fallback, size = 'md', className, ...props }: AvatarProps) {
  const initials = fallback
    ? fallback.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-gray-200 overflow-hidden flex-shrink-0',
        sizeMap[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt ?? fallback ?? 'avatar'} className="h-full w-full object-cover" />
      ) : (
        <span className="font-medium text-gray-600 select-none">{initials}</span>
      )}
    </div>
  );
}
