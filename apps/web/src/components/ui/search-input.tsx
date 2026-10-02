'use client';

import { Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  onClear?: () => void;
}

export function SearchInput({ className, defaultValue, onClear, ...props }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue?.toString() ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
    onClear?.();
  }

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          'flex h-10 w-full min-w-0 rounded-control border border-input bg-card pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          className,
        )}
        {...props}
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
  );
}
