import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Build the URL for a given page number. */
  getPageUrl: (page: number) => string;
  className?: string;
}

export function Pagination({ currentPage, totalPages, getPageUrl, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <PaginationLink
        href={currentPage > 1 ? getPageUrl(currentPage - 1) : undefined}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </PaginationLink>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <PaginationLink
            key={page}
            href={getPageUrl(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            active={page === currentPage}
          >
            {page}
          </PaginationLink>
        ),
      )}

      <PaginationLink
        href={currentPage < totalPages ? getPageUrl(currentPage + 1) : undefined}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  active,
  children,
  ...props
}: {
  href?: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentProps<'a'>, 'href'>) {
  const baseClass = cn(
    'inline-flex size-8 items-center justify-center rounded-control text-sm transition-colors',
    active
      ? 'bg-primary text-primary-foreground font-medium'
      : 'text-foreground hover:bg-muted',
    disabled && 'pointer-events-none opacity-40',
  );

  if (!href || disabled) {
    return (
      <span className={baseClass} aria-disabled={disabled} {...props}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={baseClass} {...props}>
      {children}
    </Link>
  );
}

/** Generates page numbers with ellipsis for large ranges. */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}
