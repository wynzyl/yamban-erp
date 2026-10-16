'use client';

import { ORDER_STATUS_LABELS, type OrderStatus } from '@yamban/shared';
import { cn } from '@/lib/utils';

const styles: Record<OrderStatus, string> = {
  QUOTATION: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-primary/10 text-primary',
  IN_PRODUCTION: 'bg-info/10 text-info',
  READY: 'bg-success/10 text-success',
  RELEASED: 'bg-success text-success-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-control px-2 text-xs font-medium whitespace-nowrap',
        styles[status],
        className,
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
