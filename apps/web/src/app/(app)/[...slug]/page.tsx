import { notFound } from 'next/navigation';
import { findNavItem } from '@/lib/nav';

/**
 * Placeholder for screens on the build plan (MVP spec §37) that do not exist yet.
 * Delete an entry's placeholder by adding a real route folder; it takes precedence.
 */
export default async function PlannedScreen({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const item = findNavItem(`/${slug.join('/')}`);
  if (!item) notFound();

  return (
    <div className="max-w-3xl">
      <p className="text-muted-foreground">{item.group}</p>
      <h1 className="font-display text-[32px] font-semibold leading-tight">{item.label}</h1>
      <p className="mt-6">This screen is planned for phase {item.phase} of the build.</p>
    </div>
  );
}
