'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Input } from '@/components/ui/input';

interface ProductSearchProps {
  defaultValue?: string;
}

export function ProductSearch({ defaultValue = '' }: ProductSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.delete('page');
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search products..."
        defaultValue={defaultValue}
        className="pl-9"
        onChange={(e) => {
          if (e.target.value !== defaultValue) {
            handleChange(e.target.value);
          }
        }}
      />
    </div>
  );
}
