'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface RemoveLineButtonProps {
  prId: string;
  lineId: string;
}

export function RemoveLineButton({ prId, lineId }: RemoveLineButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm('Remove this material from the purchase request?')) return;

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${prId}/lines/${lineId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.message ?? 'Failed to remove line.');
          setTimeout(() => setError(null), 3000);
        }
      } catch {
        setError('Failed to remove line.');
        setTimeout(() => setError(null), 3000);
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
      {error && (
        <span className="ml-2 text-xs text-destructive">{error}</span>
      )}
    </>
  );
}
