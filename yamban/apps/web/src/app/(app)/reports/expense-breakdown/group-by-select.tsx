'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const OPTIONS = [
  { label: 'By category', value: 'category' },
  { label: 'By supplier', value: 'supplier' },
  { label: 'By month', value: 'month' },
] as const;

interface GroupBySelectProps {
  defaultValue: string;
}

export function GroupBySelect({ defaultValue }: GroupBySelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('groupBy', value);
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Group by</Label>
      <Select value={defaultValue} onValueChange={handleChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select grouping" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
