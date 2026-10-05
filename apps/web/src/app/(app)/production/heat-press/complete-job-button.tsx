'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface CompleteJobButtonProps {
  jobId: string;
}

async function completeJob(jobId: string) {
  const res = await fetch(`/api/production/jobs/${jobId}/complete`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to complete job');
  }
  return res.json();
}

export function CompleteJobButton({ jobId }: CompleteJobButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setError(null);
    try {
      await completeJob(jobId);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div>
      <Button size="sm" onClick={handleComplete} disabled={isPending}>
        <Check className="size-4" />
        Mark complete
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
