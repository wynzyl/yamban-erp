'use client';

import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CustomerFiltersProps {
  defaultSearch?: string;
  defaultMunicipality?: string;
}

export function CustomerFilters({ defaultSearch = '', defaultMunicipality = '' }: CustomerFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [municipality, setMunicipality] = useState(defaultMunicipality);
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch municipalities for dropdown
  useEffect(() => {
    fetch('/api/customers/municipalities', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMunicipalities(data.data ?? data))
      .catch(() => setMunicipalities([]));
  }, []);

  function navigate(updates: Record<string, string | undefined>) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete('page'); // Reset to page 1 on filter change
      router.push(`?${params}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: search.trim() || undefined });
  }

  function handleClearSearch() {
    setSearch('');
    inputRef.current?.focus();
    navigate({ search: undefined });
  }

  function handleMunicipalityChange(value: string) {
    const newValue = value === 'all' ? '' : value;
    setMunicipality(newValue);
    navigate({ municipality: newValue || undefined });
  }

  const hasFilters = search || municipality;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} role="search" className="flex flex-1 gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="search"
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, org, or mobile"
            aria-label="Search customers"
            className={cn(
              'flex h-10 w-full min-w-0 rounded-control border border-input bg-card pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              isPending && 'opacity-70',
            )}
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
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
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Municipality Filter */}
      {municipalities.length > 0 && (
        <Select value={municipality || 'all'} onValueChange={handleMunicipalityChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {municipalities.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear all filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setMunicipality('');
            navigate({ search: undefined, municipality: undefined });
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
