'use client';

import { AlertTriangle, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface StartJobDialogProps {
  jobId: string;
  hasPaidDownPayment: boolean;
}

async function startJob(jobId: string, acknowledgeNoPayment: boolean) {
  const res = await fetch(`/api/production/jobs/${jobId}/start`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledgeNoPayment }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to start job');
  }
  return res.json();
}

export function StartJobDialog({ jobId, hasPaidDownPayment }: StartJobDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (acknowledgeNoPayment = false) => {
    setError(null);
    try {
      await startJob(jobId, acknowledgeNoPayment);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // If payment exists, start directly without dialog
  if (hasPaidDownPayment) {
    return (
      <Button size="sm" onClick={() => handleStart(false)} disabled={isPending}>
        <Play className="size-4" />
        Start printing
      </Button>
    );
  }

  // No payment - show confirmation dialog
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={isPending}>
          <Play className="size-4" />
          Start printing
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            No down payment recorded
          </AlertDialogTitle>
          <AlertDialogDescription>
            This order has no down payment on record. Do you want to proceed with printing anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleStart(true)} disabled={isPending}>
            Proceed without payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
