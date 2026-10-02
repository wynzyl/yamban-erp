import { cn } from '@/lib/utils';

interface CustomerAvatarProps {
  firstName: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Displays customer initials. Colour is derived from the name for consistency. */
export function CustomerAvatar({ firstName, lastName, size = 'md', className }: CustomerAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const colorIndex = hashString(firstName + (lastName ?? '')) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIndex];

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold uppercase',
        color,
        size === 'sm' && 'size-7 text-xs',
        size === 'md' && 'size-9 text-sm',
        size === 'lg' && 'size-12 text-lg',
        className,
      )}
    >
      {initials}
    </span>
  );
}

function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName?.trim().charAt(0) ?? '';
  return (first + last).toUpperCase() || '?';
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Neutral avatar colours that don't conflict with payment/stock semantics.
 * Uses muted tones only (no partial, success, destructive).
 */
const AVATAR_COLORS = [
  'bg-primary/15 text-primary',
  'bg-muted text-foreground',
  'bg-primary/10 text-primary',
  'bg-muted text-muted-foreground',
  'bg-primary/20 text-primary',
];
