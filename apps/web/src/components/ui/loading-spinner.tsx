import { cn } from '@/lib/utils/cn';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-200 border-t-red-600',
        sizeClasses[size],
        className
      )}
    />
  );
}
