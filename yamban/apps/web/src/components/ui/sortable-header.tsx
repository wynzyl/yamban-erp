'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';

interface SortableHeaderProps<T extends string = string> {
  sortKey: T;
  currentSort?: string;
  currentOrder?: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableHeader<T extends string>({
  sortKey,
  currentSort,
  currentOrder,
  children,
  className,
}: SortableHeaderProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isActive = currentSort === sortKey;
  const isAsc = currentOrder !== 'desc';

  function handleClick() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      if (isActive) {
        // Toggle direction
        params.set('sortOrder', isAsc ? 'desc' : 'asc');
      } else {
        // New sort column
        params.set('sortBy', sortKey);
        params.set('sortOrder', 'asc');
      }

      router.push(`?${params}`);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-1 text-left font-medium transition-colors hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground',
        isPending && 'opacity-50',
        className,
      )}
    >
      {children}
      {isActive ? (
        isAsc ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" />
      )}
    </button>
  );
}
