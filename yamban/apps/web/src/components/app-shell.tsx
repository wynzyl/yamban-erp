'use client';

import type { SessionUser } from '@yamban/shared';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {/* Mobile header with sidebar trigger */}
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger className="size-8" />
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
