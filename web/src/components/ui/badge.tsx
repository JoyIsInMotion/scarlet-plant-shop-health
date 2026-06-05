import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default:     'bg-subtle text-muted',
        primary:     'bg-scarlet-light text-scarlet-dark',
        success:     'bg-botanical-light text-botanical-dark',
        warning:     'bg-amber-50 text-amber-700',
        danger:      'bg-scarlet-light text-scarlet',
        info:        'bg-blue-50 text-blue-700',
        outline:     'border border-border text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
