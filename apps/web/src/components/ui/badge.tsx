import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex h-6 items-center rounded-control px-2 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        outline: 'border border-input bg-card text-foreground',
        secondary: 'bg-muted text-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-partial/10 text-partial',
        destructive: 'bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
