import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonIndicatorProps {
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'flat' | null;
  invertColors?: boolean;
  className?: string;
}

export function ComparisonIndicator({
  changePercent,
  changeDirection,
  invertColors = false,
  className,
}: ComparisonIndicatorProps) {
  if (changePercent === null || changeDirection === null) {
    return <span className={cn('text-sm text-muted-foreground', className)}>N/A</span>;
  }

  const isPositive = changeDirection === 'up';
  const isNegative = changeDirection === 'down';

  const colorClass = invertColors
    ? isPositive
      ? 'text-destructive'
      : isNegative
        ? 'text-success'
        : 'text-muted-foreground'
    : isPositive
      ? 'text-success'
      : isNegative
        ? 'text-destructive'
        : 'text-muted-foreground';

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const formattedPercent = Math.abs(changePercent).toFixed(1);

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-sm', colorClass, className)}>
      <Icon className="size-3.5" />
      {formattedPercent}%
    </span>
  );
}
