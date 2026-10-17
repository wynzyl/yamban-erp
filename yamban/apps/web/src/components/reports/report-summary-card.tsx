import type { ComparisonData } from '@yamban/shared';
import { Money } from '@/components/domain/money';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { ComparisonIndicator } from './comparison-indicator';

interface ReportSummaryCardProps {
  label: string;
  data: ComparisonData;
  isMoney?: boolean;
  invertComparison?: boolean;
}

export function ReportSummaryCard({
  label,
  data,
  isMoney = true,
  invertComparison = false,
}: ReportSummaryCardProps) {
  return (
    <Surface>
      <SurfaceBody className="py-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="font-display text-2xl font-semibold">
            {isMoney ? <Money value={data.value} /> : data.value}
          </p>
          <ComparisonIndicator
            changePercent={data.changePercent}
            changeDirection={data.changeDirection}
            invertColors={invertComparison}
          />
        </div>
        {data.previousValue !== null && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            vs {isMoney ? <Money value={data.previousValue} /> : data.previousValue}
          </p>
        )}
      </SurfaceBody>
    </Surface>
  );
}

interface SimpleMetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  isMoney?: boolean;
}

export function SimpleMetricCard({ label, value, subtext, isMoney = true }: SimpleMetricCardProps) {
  return (
    <Surface>
      <SurfaceBody className="py-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold">
          {isMoney ? <Money value={value} /> : value}
        </p>
        {subtext && <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>}
      </SurfaceBody>
    </Surface>
  );
}
