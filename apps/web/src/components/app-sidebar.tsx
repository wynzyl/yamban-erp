'use client';

import type { SessionUser } from '@yamban/shared';
import { ChevronRight, LogOut, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { DASHBOARD, NAV, type NavGroup, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  user: SessionUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex-row items-center justify-between border-b border-sidebar-border px-3">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <BrandMark />
        </Link>
        <SidebarTrigger className="size-8" />
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup className="py-2">
          <SidebarMenu>
            <NavMenuButton item={DASHBOARD} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>

        {/* Nav groups */}
        {NAV.map((group) => (
          <NavGroupCollapsible key={group.label} group={group} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserFooter user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function NavGroupCollapsible({ group, pathname }: { group: NavGroup; pathname: string }) {
  // Check if any item in this group is active
  const hasActiveItem = group.items.some((item) => isActive(item.href, pathname));

  // Start expanded if group has active item, collapsed otherwise
  const [open, setOpen] = useState(hasActiveItem);

  // Auto expand when navigating to an item in this group
  useEffect(() => {
    if (hasActiveItem && !open) {
      setOpen(true);
    }
  }, [hasActiveItem, open]);

  // Reset on pathname change (AC-7: group collapse state resets on navigation)
  // But keep expanded if this group has the active item
  useEffect(() => {
    setOpen(hasActiveItem);
  }, [pathname, hasActiveItem]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center gap-2 font-display text-sm font-semibold">
            {group.label}
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavMenuButton key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

function NavMenuButton({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className={cn(active && 'font-medium text-primary')}
      >
        <Link href={item.href} aria-current={active ? 'page' : undefined}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function UserFooter({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="space-y-2 p-2">
      {!isCollapsed && (
        <div className="px-2 pb-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      )}
      <div className={cn('flex', isCollapsed ? 'flex-col gap-1' : 'gap-1')}>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className={cn('justify-start', isCollapsed ? 'w-full px-2' : 'flex-1')}
          onClick={signOut}
          disabled={busy}
        >
          <LogOut className="size-4" />
          {!isCollapsed && <span>Sign out</span>}
        </Button>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  function toggle() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('yb-theme', next);
    } catch {
      /* private mode */
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Switch light or dark theme"
      onClick={toggle}
      className={cn(isCollapsed && 'w-full px-2')}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
