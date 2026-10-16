import { PRODUCTION_STAGE_LABELS, type ProductionStage } from '@yamban/shared';
import { cn } from '@/lib/utils';

interface StageIndicatorProps {
  /** Production stage value from the API */
  stage: ProductionStage | string;
  className?: string;
}

/**
 * Stage indicator with dot. Production stages never get their own colours;
 * the current stage is shown in primary (guideline: States).
 */
export function StageIndicator({ stage, className }: StageIndicatorProps) {
  // Get the display label, falling back to the raw stage value if unknown
  const label =
    PRODUCTION_STAGE_LABELS[stage as ProductionStage] ??
    stage.charAt(0) + stage.slice(1).toLowerCase().replace(/_/g, ' ');

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      <span className="font-medium text-primary">{label}</span>
    </span>
  );
}
