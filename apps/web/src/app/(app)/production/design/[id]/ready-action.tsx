'use client';

import { Check, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface ReadyActionProps {
  designJobId: string;
  hasFile: boolean;
  isReady: boolean;
}

async function markReady(designJobId: string) {
  const res = await fetch(`/api/design/${designJobId}/ready`, {
    method: 'POST',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to mark ready');
  }
  return res.json();
}

export function ReadyAction({ designJobId, hasFile, isReady }: ReadyActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReady = async () => {
    setError(null);
    try {
      await markReady(designJobId);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (isReady) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <Check className="size-4" />
        Ready for printing
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleReady}
        disabled={!hasFile || isPending}
        title={!hasFile ? 'Upload a design file first' : undefined}
      >
        <Printer className="size-4" />
        Ready for print
      </Button>

      {!hasFile && (
        <p className="text-sm text-muted-foreground">
          Upload a design file before marking ready for print.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
