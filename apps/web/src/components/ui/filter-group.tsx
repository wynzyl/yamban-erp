'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroupProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A toggle button group for filtering. Used for payment tiers in the orders list.
 * Guideline: Filter buttons use the same toggle pattern throughout.
 */
export function FilterGroup({ options, value, onChange, className }: FilterGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-control border border-border bg-card overflow-hidden',
        className,
      )}
    >
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'h-9 px-4 text-sm font-medium transition-colors whitespace-nowrap',
            i > 0 && 'border-l border-border',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
