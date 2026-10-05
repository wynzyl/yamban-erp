'use client';

import { INVENTORY_TXN_TYPES, INVENTORY_TXN_TYPE_LABELS, type InventoryTxnType } from '@yamban/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { NativeSelect } from '@/components/ui/select';

export function TransactionTypeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type') ?? '';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) {
      params.set('type', e.target.value);
    } else {
      params.delete('type');
    }
    params.delete('page'); // Reset to page 1 when filtering
    router.push(`?${params}`);
  }

  return (
    <NativeSelect value={currentType} onChange={handleChange} className="w-40">
      <option value="">All types</option>
      {INVENTORY_TXN_TYPES.map((type) => (
        <option key={type} value={type}>
          {INVENTORY_TXN_TYPE_LABELS[type as InventoryTxnType]}
        </option>
      ))}
    </NativeSelect>
  );
}
