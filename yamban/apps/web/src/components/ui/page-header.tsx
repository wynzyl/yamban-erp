import type * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** Optional count badge shown after the title. */
  count?: number;
  /** Optional description below the title. */
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, count, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        <h1 className="font-display text-[32px] font-semibold leading-tight">
          {title}
          {count !== undefined && (
            <span className="ml-2 align-middle text-lg font-normal text-muted-foreground">
              {count.toLocaleString()}
            </span>
          )}
        </h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}
