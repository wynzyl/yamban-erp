'use client';

import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';

interface PurchaseRequestSearchProps {
  defaultValue?: string;
}

export function PurchaseRequestSearch({ defaultValue = '' }: PurchaseRequestSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) {
        params.set('search', value.trim());
      } else {
        params.delete('search');
      }
      params.delete('page');
      router.push(`?${params}`);
    });
  }

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete('search');
      params.delete('page');
      router.push(`?${params}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex max-w-md gap-2">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          name="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by PR number or supplier"
          aria-label="Search purchase requests"
          className={cn(
            'flex h-10 w-full min-w-0 rounded-control border border-input bg-card pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            isPending && 'opacity-70',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-input bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}
