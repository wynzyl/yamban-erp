import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Replaces shadcn's Card. Guideline: bordered surface, rounded-surface, no shadow,
 * no gradient KPI cards.
 */
function Surface({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="surface"
      className={cn('rounded-surface border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

function SurfaceHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return <header className={cn('border-b border-border px-5 py-3', className)} {...props} />;
}

function SurfaceTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('font-display text-[22px] font-semibold leading-tight', className)} {...props} />;
}

function SurfaceBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle };
