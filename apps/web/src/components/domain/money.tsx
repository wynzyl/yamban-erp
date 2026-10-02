import { formatMoney } from '@yamban/shared';
import { cn } from '@/lib/utils';

/**
 * Every peso goes through here: ₱, two decimals, Plex Sans tabular figures.
 * Only a negative result is red (guideline: "Expenses are not red").
 */
export function Money({
  value,
  className,
  negativeIsProblem = true,
}: {
  value: number | string;
  className?: string;
  negativeIsProblem?: boolean;
}) {
  const n = Number(value);
  return (
    <span className={cn('yb-money', negativeIsProblem && n < 0 && 'neg', className)}>{formatMoney(value)}</span>
  );
}
