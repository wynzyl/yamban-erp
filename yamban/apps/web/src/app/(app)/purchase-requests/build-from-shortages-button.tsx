'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

export function BuildFromShortagesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/purchase-requests/build-from-shortages', {
          method: 'POST',
        });
        const data = await res.json();

        if (res.ok) {
          setResult(data.data);
          router.refresh();
          // Clear result after 5 seconds
          setTimeout(() => setResult(null), 5000);
        } else {
          setError(data.message ?? 'Failed to build from shortages');
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        setError('Failed to connect to server');
        setTimeout(() => setError(null), 5000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-sm text-muted-foreground">
          {result.created > 0 && `${result.created} created`}
          {result.created > 0 && result.updated > 0 && ', '}
          {result.updated > 0 && `${result.updated} updated`}
          {result.created === 0 && result.updated === 0 && 'No order shortages found'}
        </span>
      )}
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
      <Button onClick={handleClick} disabled={isPending}>
        <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Building...' : 'Build from shortages'}
      </Button>
    </div>
  );
}
