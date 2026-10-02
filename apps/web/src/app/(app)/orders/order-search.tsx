'use client';

import { ORDER_STATUS_LABELS, type OrderStatus } from '@yamban/shared';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrderSearchProps {
  defaultSearch?: string;
  defaultStatus?: string;
}

export function OrderSearch({ defaultSearch = '', defaultStatus = '' }: OrderSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

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
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders..."
          defaultValue={defaultSearch}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value;
            if (value !== defaultSearch) {
              updateParams({ search: value });
            }
          }}
        />
      </div>
      <Select
        defaultValue={defaultStatus}
        onValueChange={(value) => updateParams({ status: value === 'ALL' ? '' : value })}
      >
        <SelectTrigger className="w-[180px]">
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
    </div>
  );
}
