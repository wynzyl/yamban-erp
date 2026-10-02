import { formatMoney } from '@yamban/shared';
import { cn } from '@/lib/utils';

export type PaymentTier = 'unpaid' | 'partial' | 'paid' | 'overdue';

/**
 * The four payment tiers (guideline: States). Nothing else gets a status colour;
 * production stages stay neutral.
 */
export function paymentTier(total: number, paid: number, daysOverdue = 0): PaymentTier {
  const balance = total - paid;
  if (balance <= 0) return 'paid';
  if (daysOverdue > 0) return 'overdue';
  return paid > 0 ? 'partial' : 'unpaid';
}

const styles: Record<PaymentTier, string> = {
  unpaid: 'border border-input text-foreground',
  partial: 'bg-partial text-partial-foreground',
  paid: 'bg-success text-success-foreground',
  overdue: 'bg-destructive text-destructive-foreground',
};

export function PaymentChip({
  total,
  paid,
  daysOverdue = 0,
  className,
}: {
  total: number | string;
  paid: number | string;
  daysOverdue?: number;
  className?: string;
}) {
  const t = Number(total);
  const p = Number(paid);
  const tier = paymentTier(t, p, daysOverdue);
  // The partial chip states the balance, not the word "partial". Overdue states its age.
  const text =
    tier === 'paid'
      ? 'Paid'
      : tier === 'overdue'
        ? `Overdue ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`
        : tier === 'partial'
          ? `Balance ${formatMoney(t - p)}`
          : 'Unpaid';

  return (
    <span
      data-tier={tier}
      className={cn(
        'inline-flex h-6 items-center rounded-control px-2 text-xs font-medium whitespace-nowrap',
        tier === 'partial' && 'yb-money',
        styles[tier],
        className,
      )}
    >
      {text}
    </span>
  );
}
