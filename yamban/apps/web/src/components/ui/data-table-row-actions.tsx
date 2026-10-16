'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ActionItem =
  | {
      type?: 'action';
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      onClick?: () => void;
      href?: string;
      variant?: 'default' | 'destructive';
      disabled?: boolean;
    }
  | { type: 'separator' };

interface DataTableRowActionsProps {
  actions: ActionItem[];
  className?: string;
}

export function DataTableRowActions({
  actions,
  className,
}: DataTableRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn('data-[state=open]:bg-muted', className)}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, index) => {
          if (action.type === 'separator') {
            return <DropdownMenuSeparator key={index} />;
          }

          const Icon = action.icon;

          if (action.href) {
            return (
              <DropdownMenuItem key={index} asChild disabled={action.disabled}>
                <Link href={action.href}>
                  {Icon && <Icon className="size-4" />}
                  {action.label}
                </Link>
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              variant={action.variant}
              disabled={action.disabled}
            >
              {Icon && <Icon className="size-4" />}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
