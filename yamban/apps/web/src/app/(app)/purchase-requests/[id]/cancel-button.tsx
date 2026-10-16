'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface CancelButtonProps {
  id: string;
}

export function CancelButton({ id }: CancelButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleCancel() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          router.push('/purchase-requests');
          router.refresh();
        }
      } catch {
        // Handle error
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Cancel this PR?</span>
        <Button variant="destructive" size="sm" onClick={handleCancel} disabled={isPending}>
          {isPending ? 'Cancelling...' : 'Yes, cancel'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)} disabled={isPending}>
          No
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={() => setShowConfirm(true)}>
      <Trash2 className="size-4" />
      Cancel PR
    </Button>
  );
}
