'use client';

import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface EditDetailsFormProps {
  prId: string;
  currentNeededBy: string | null;
  currentNotes: string | null;
}

export function EditDetailsForm({
  prId,
  currentNeededBy,
  currentNotes,
}: EditDetailsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [neededBy, setNeededBy] = useState(currentNeededBy ?? '');
  const [notes, setNotes] = useState(currentNotes ?? '');

  function handleClose() {
    setNeededBy(currentNeededBy ?? '');
    setNotes(currentNotes ?? '');
    setIsOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${prId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            neededBy: neededBy || null,
            notes: notes || null,
          }),
        });

        if (res.ok) {
          setIsOpen(false);
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.message ?? 'Failed to update.');
        }
      } catch {
        setError('Failed to update.');
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Edit details"
      >
        <Pencil className="size-4" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="date"
        value={neededBy}
        onChange={(e) => setNeededBy(e.target.value)}
        className="h-7 rounded-control border border-input bg-card px-2 text-xs"
        title="Needed by"
      />
      <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={isPending}>
        {isPending ? '...' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleClose} disabled={isPending}>
        Cancel
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
