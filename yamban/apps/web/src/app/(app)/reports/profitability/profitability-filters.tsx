'use client';

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ProfitabilityFiltersProps {
  defaultMonth: string;
  defaultCustomerId: string;
  defaultSearch: string;
  customers: CustomerOption[];
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getPrevMonth(month: string): string {
  const parts = month.split('-').map(Number);
  const year = parts[0]!;
  const mon = parts[1]!;
  if (mon === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(mon - 1).padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const parts = month.split('-').map(Number);
  const year = parts[0]!;
  const mon = parts[1]!;
  if (mon === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(mon + 1).padStart(2, '0')}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function ProfitabilityFilters({
  defaultMonth,
  defaultCustomerId,
  defaultSearch,
  customers,
}: ProfitabilityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete('page'); // Reset to page 1 on filter change
    startTransition(() => router.push(`?${params.toString()}`));
  }

  function handleMonthChange(month: string) {
    updateParams({ month });
  }

  function handleCustomerChange(value: string) {
    updateParams({ customerId: value === 'ALL' ? undefined : value });
  }

  function handleSearchChange(value: string) {
    updateParams({ search: value || undefined });
  }

  const currentMonth = getCurrentMonth();
  const isCurrentMonth = defaultMonth === currentMonth;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Month Picker */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => handleMonthChange(getPrevMonth(defaultMonth))}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <span className="min-w-[100px] text-center font-medium">
          {formatMonthLabel(defaultMonth)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => handleMonthChange(getNextMonth(defaultMonth))}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      {/* Customer Filter */}
      <Select
        value={defaultCustomerId || 'ALL'}
        onValueChange={handleCustomerChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All customers</SelectItem>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search order number..."
          defaultValue={defaultSearch}
          className="pl-9 pr-8"
          onChange={(e) => {
            if (e.target.value !== defaultSearch) {
              handleSearchChange(e.target.value);
            }
          }}
        />
        {defaultSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
            onClick={() => handleSearchChange('')}
          >
            <X className="size-3" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    </div>
  );
}
