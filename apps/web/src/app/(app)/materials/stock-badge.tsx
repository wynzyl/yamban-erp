import { cn } from '@/lib/utils';

interface StockBadgeProps {
  stock: number;
  reorderLevel: number;
  className?: string;
}

/**
 * Shows stock status: "Low" when stock is at or below reorder level.
 * Uses warning colors per Yamban guidelines (yellow for caution).
 */
export function StockBadge({ stock, reorderLevel, className }: StockBadgeProps) {
  if (reorderLevel <= 0 || stock > reorderLevel) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm bg-partial/10 px-1.5 py-0.5 text-xs font-medium text-partial',
        className,
      )}
    >
      Low
    </span>
  );
}
