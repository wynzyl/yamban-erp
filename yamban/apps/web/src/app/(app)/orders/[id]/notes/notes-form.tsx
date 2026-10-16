'use client';

import { updateOrderNotesSchema } from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

interface NotesEditFormProps {
  orderId: string;
  notes: string | null;
}

export function NotesEditForm({ orderId, notes }: NotesEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(notes ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data = { notes: value || undefined };

    const result = updateOrderNotesSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid notes.');
      return;
    }

    const res = await fetch(`/api/orders/${orderId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || 'Failed to update notes.');
      return;
    }

    startTransition(() => router.push(`/orders/${orderId}`));
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={6}
            placeholder="Add notes about this order..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </Surface>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save notes'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
