'use client';

import { ORDER_STATUS_LABELS, type OrderStatus } from '@yamban/shared';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { FilterGroup } from '@/components/ui/filter-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAYMENT_FILTERS = [
  { value: '', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'balance', label: 'Balance' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

interface OrderSearchProps {
  defaultSearch?: string;
  defaultPaymentFilter?: string;
  defaultStatus?: string;
  showingCount?: number;
  totalCount?: number;
}

export function OrderSearch({
  defaultSearch = '',
  defaultPaymentFilter = '',
  defaultStatus = '',
  showingCount,
  totalCount,
}: OrderSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete('page');
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Payment tier filter tabs */}
      <FilterGroup
        options={PAYMENT_FILTERS}
        value={defaultPaymentFilter}
        onChange={(value) => updateParams({ payment: value })}
      />

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search customer or order number..."
          defaultValue={defaultSearch}
          className="w-[280px] pl-9"
          onChange={(e) => {
            const value = e.target.value;
            if (value !== defaultSearch) {
              updateParams({ search: value });
            }
          }}
        />
      </div>

      {/* Status dropdown filter */}
      <Select
        defaultValue={defaultStatus || 'ALL'}
        onValueChange={(value) => updateParams({ status: value === 'ALL' ? '' : value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {(Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Showing count */}
      {showingCount !== undefined && totalCount !== undefined && (
        <span className="ml-auto text-sm text-muted-foreground">
          Showing <strong className="font-semibold text-foreground">{showingCount}</strong> of{' '}
          <strong className="font-semibold text-foreground">{totalCount}</strong> orders
        </span>
      )}
    </div>
  );
}
