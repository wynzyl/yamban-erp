'use client';

import type { DesignApprovalStatus } from '@yamban/shared';
import { Check, RotateCcw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface StatusActionsProps {
  jobId: string;
  currentStatus: DesignApprovalStatus;
}

async function updateStatus(jobId: string, approvalStatus: DesignApprovalStatus) {
  const res = await fetch(`/api/design/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvalStatus }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to update status');
  }
  return res.json();
}

export function StatusActions({ jobId, currentStatus }: StatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (newStatus: DesignApprovalStatus) => {
    setError(null);
    try {
      await updateStatus(jobId, newStatus);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (currentStatus === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-success" />
        Design approved
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'DRAFTING' && (
          <Button onClick={() => handleAction('FOR_APPROVAL')} disabled={isPending}>
            <Send className="size-4" />
            Submit for approval
          </Button>
        )}

        {currentStatus === 'FOR_APPROVAL' && (
          <>
            <Button onClick={() => handleAction('APPROVED')} disabled={isPending}>
              <Check className="size-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('REVISION_REQUESTED')}
              disabled={isPending}
            >
              <RotateCcw className="size-4" />
              Request revision
            </Button>
          </>
        )}

        {currentStatus === 'REVISION_REQUESTED' && (
          <Button onClick={() => handleAction('FOR_APPROVAL')} disabled={isPending}>
            <Send className="size-4" />
            Submit for approval
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
