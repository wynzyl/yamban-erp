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
} from '@/components/ui/alert-dialog';

interface StartJobDialogProps {
  jobId: string;
  hasPaidDownPayment: boolean;
}

/** API error envelope: `{ statusCode, message, fieldErrors?, code? }`. */
class StartJobError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function startJob(jobId: string, acknowledgeNoPayment: boolean) {
  const res = await fetch(`/api/production/jobs/${jobId}/start`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledgeNoPayment }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new StartJobError(data.message ?? 'Could not start printing.', data.code);
  }
  return res.json();
}

export function StartJobDialog({ jobId, hasPaidDownPayment }: StartJobDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isStarting, setIsStarting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (acknowledgeNoPayment: boolean) => {
    setError(null);
    setIsStarting(true);
    try {
      await startJob(jobId, acknowledgeNoPayment);
      setConfirmOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      // The board can be out of date: if the server finds no payment, ask instead of failing.
      if (err instanceof StartJobError && err.code === 'DOWN_PAYMENT_REQUIRED') {
        setConfirmOpen(true);
      } else {
        setError(err instanceof Error ? err.message : 'Could not start printing.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const busy = isPending || isStarting;

  return (
    <div>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => (hasPaidDownPayment ? handleStart(false) : setConfirmOpen(true))}
      >
        <Play className="size-4" />
        Start printing
      </Button>
      {error && !confirmOpen && <p className="mt-1 text-xs text-destructive">{error}</p>}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setError(null);
        }}
      >
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
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                // Keep the dialog open until the start succeeds, so an error stays visible.
                e.preventDefault();
                void handleStart(true);
              }}
            >
              Proceed without payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
