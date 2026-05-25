import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange?: (page: number) => void;
  getHref?: (page: number) => string;
  className?: string;
}

function PageBtn({
  p,
  active,
  getHref,
  onPageChange,
}: {
  p: number;
  active: boolean;
  getHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
}) {
  const variant = active ? 'default' : 'outline';
  if (getHref) {
    return (
      <Button variant={variant} size="sm" asChild>
        <Link href={getHref(p)}>{p}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} size="sm" onClick={() => onPageChange!(p)}>
      {p}
    </Button>
  );
}

function NavBtn({
  p,
  disabled,
  getHref,
  onPageChange,
  children,
  label,
}: {
  p: number;
  disabled: boolean;
  getHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
  label: string;
}) {
  if (getHref) {
    return (
      <Button
        variant="outline"
        size="icon"
        aria-label={label}
        disabled={disabled}
        asChild={!disabled}
      >
        {disabled ? children : <Link href={getHref(p)}>{children}</Link>}
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => onPageChange!(p)}
      disabled={disabled}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

export function Pagination({ page, total, limit, onPageChange, getHref, className }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <NavBtn p={page - 1} disabled={page <= 1} getHref={getHref} onPageChange={onPageChange} label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </NavBtn>

      {pages[0] > 1 && (
        <>
          <PageBtn p={1} active={page === 1} getHref={getHref} onPageChange={onPageChange} />
          {pages[0] > 2 && <span className="px-2 text-gray-400">…</span>}
        </>
      )}

      {pages.map((p) => (
        <PageBtn key={p} p={p} active={p === page} getHref={getHref} onPageChange={onPageChange} />
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-gray-400">…</span>}
          <PageBtn p={totalPages} active={page === totalPages} getHref={getHref} onPageChange={onPageChange} />
        </>
      )}

      <NavBtn p={page + 1} disabled={page >= totalPages} getHref={getHref} onPageChange={onPageChange} label="Next page">
        <ChevronRight className="h-4 w-4" />
      </NavBtn>
    </div>
  );
}
