import { formatRoll } from '@yamban/shared';
import { cn } from '@/lib/utils';

export type StockState = 'healthy' | 'low' | 'out';

/**
 * The product's signature: a roll shown the way a cutter reads a tape.
 * Remaining yards fill from the left; the used part is the cutting-table grey.
 * Colour only changes for stock state: low is tape yellow, out is red chalk.
 */
export function TapeGauge({
  label,
  remaining,
  rollLength,
  state = 'healthy',
  tickEvery = 12,
  className,
}: {
  label: string;
  remaining: number;
  rollLength: number;
  state?: StockState;
  tickEvery?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (remaining / rollLength) * 100));
  const ticks: number[] = [];
  for (let v = 0; v <= rollLength; v += tickEvery) ticks.push(v);

  const fill = state === 'out' ? 'bg-destructive' : state === 'low' ? 'bg-partial' : 'bg-primary';

  return (
    <figure className={cn('w-full', className)}>
      <figcaption className="mb-2 flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="yb-measure text-muted-foreground">{formatRoll(remaining, rollLength)} left</span>
      </figcaption>
      <div
        role="meter"
        aria-label={`${label}: ${formatRoll(remaining, rollLength)} left`}
        aria-valuemin={0}
        aria-valuemax={rollLength}
        aria-valuenow={remaining}
        className="relative h-6 overflow-hidden rounded-control bg-muted"
      >
        <div className={cn('h-full', fill)} style={{ width: `${pct}%` }} />
        {ticks.map((v) => (
          <span
            key={v}
            aria-hidden
            className="absolute bottom-0 h-2 w-px bg-foreground/40"
            style={{ left: `${(v / rollLength) * 100}%` }}
          />
        ))}
      </div>
      <div aria-hidden className="relative mt-1 h-4 font-display text-xs text-muted-foreground">
        {ticks.map((v, i) => (
          <span
            key={v}
            className={cn(
              'absolute',
              i === 0 ? '' : i === ticks.length - 1 && v === rollLength ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: `${(v / rollLength) * 100}%` }}
          >
            {v}
          </span>
        ))}
      </div>
    </figure>
  );
}
