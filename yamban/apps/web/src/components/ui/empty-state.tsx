import type * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** The main message. Follow voice guidelines: short, specific, no emoji. */
  message: string;
  /** Optional call to action text. */
  action?: string;
  /** Icon to display above the message. */
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Empty state display following Yamban voice guidelines.
 * Messages are short, specific, in the shop's own words. No emoji.
 */
export function EmptyState({ message, action, icon, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <p className="text-foreground">{message}</p>
      {action && <p className="mt-1 text-sm text-muted-foreground">{action}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
