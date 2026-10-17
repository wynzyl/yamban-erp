'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPresetDates } from '@/lib/date-utils';

// Re-export for backwards compatibility
export { getDefaultDateRange } from '@/lib/date-utils';

const PRESETS = [
  { label: 'This month', value: 'this_month' },
  { label: 'Last 30 days', value: 'last_30' },
  { label: 'Last month', value: 'last_month' },
  { label: 'This quarter', value: 'this_quarter' },
  { label: 'Last quarter', value: 'last_quarter' },
  { label: 'This year', value: 'this_year' },
  { label: 'Last year', value: 'last_year' },
  { label: 'Custom', value: 'custom' },
] as const;

const COMPARISON_OPTIONS = [
  { label: 'No comparison', value: 'none' },
  { label: 'Previous period', value: 'previous_period' },
  { label: 'Same period last year', value: 'same_period_last_year' },
] as const;

function detectPreset(startDate: string, endDate: string): string {
  for (const preset of PRESETS) {
    if (preset.value === 'custom') continue;
    const { startDate: ps, endDate: pe } = getPresetDates(preset.value);
    if (ps === startDate && pe === endDate) return preset.value;
  }
  return 'custom';
}

interface DateRangeFilterProps {
  defaultStartDate: string;
  defaultEndDate: string;
  defaultCompareWith?: string;
  showComparison?: boolean;
}

export function DateRangeFilter({
  defaultStartDate,
  defaultEndDate,
  defaultCompareWith = 'none',
  showComparison = true,
}: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const detectedPreset = detectPreset(defaultStartDate, defaultEndDate);
  const [preset, setPreset] = useState(detectedPreset);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [compareWith, setCompareWith] = useState(defaultCompareWith);

  const applyFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (showComparison && compareWith !== 'none') {
      params.set('compareWith', compareWith);
    } else {
      params.delete('compareWith');
    }
    params.delete('page');
    router.push(`${pathname}?${params}`);
  }, [router, pathname, searchParams, startDate, endDate, compareWith, showComparison]);

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(value);
      setStartDate(s);
      setEndDate(e);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === 'custom' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
        </>
      )}

      {showComparison && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Compare with</Label>
          <Select value={compareWith} onValueChange={setCompareWith}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="No comparison" />
            </SelectTrigger>
            <SelectContent>
              {COMPARISON_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={applyFilter}>Apply</Button>
    </div>
  );
}
