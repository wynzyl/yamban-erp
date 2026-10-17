import type { OverheadSettingsResponse } from '@yamban/shared';
import { Settings } from 'lucide-react';
import type { Metadata } from 'next';
import { Money } from '@/components/domain/money';
import { PageHeader } from '@/components/ui/page-header';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { OverheadForm } from './overhead-form';

export const metadata: Metadata = { title: 'Costing settings' };

export default async function CostingSettingsPage() {
  const overhead = await apiFetch<OverheadSettingsResponse | null>('/settings/overhead').catch(
    () => null,
  );

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Costing settings"
        description="Configure overhead for profit margin calculations"
      />

      <Surface className="mt-6">
        <SurfaceHeader>
          <SurfaceTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Monthly overhead
          </SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <p className="text-sm text-muted-foreground">
            The monthly overhead amount (rent, utilities, insurance, etc.) is divided equally among
            all orders confirmed in that month when calculating profit margins.
          </p>

          {overhead && (
            <div className="mt-4 rounded-control border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Current monthly overhead</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                <Money value={overhead.monthlyAmount} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last updated: {new Date(overhead.updatedAt).toLocaleDateString('en-PH')}
              </p>
            </div>
          )}

          {!overhead && (
            <div className="mt-4 rounded-control border border-partial bg-partial/10 p-4">
              <p className="text-sm text-partial-text">
                Overhead is not configured. Profit margin reports will show margins without overhead
                allocation until you set a value.
              </p>
            </div>
          )}

          <div className="mt-6">
            <OverheadForm currentAmount={overhead?.monthlyAmount ?? ''} />
          </div>
        </SurfaceBody>
      </Surface>
    </div>
  );
}
