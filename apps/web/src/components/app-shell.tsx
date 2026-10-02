'use client';

import type { SessionUser } from '@yamban/shared';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { DASHBOARD, NAV, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <BrandMark />
        <Button variant="ghost" size="icon" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="hidden h-16 items-center px-5 lg:flex">
          <BrandMark />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4 pt-3 lg:pt-0" onClick={() => setOpen(false)}>
          <NavLink item={DASHBOARD} />
          {NAV.map((group) => (
            <div key={group.label} className="mt-5">
              <p className="px-2 pb-1 font-display text-base font-semibold text-muted-foreground">{group.label}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <UserFooter user={user} />
      </aside>

      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block rounded-control px-2 py-1.5 text-sm text-foreground hover:bg-muted',
        active && 'bg-muted font-medium text-primary',
      )}
    >
      {item.label}
    </Link>
  );
}

function UserFooter({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="border-t border-border p-3">
      <div className="px-2 pb-2">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={signOut} disabled={busy}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}

function ThemeToggle() {
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
    <Button variant="ghost" size="sm" aria-label="Switch light or dark theme" onClick={toggle}>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
