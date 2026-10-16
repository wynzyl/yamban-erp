'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface OrderedButtonProps {
  id: string;
}

export function OrderedButton({ id }: OrderedButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await fetch(`/api/purchase-requests/${id}/order`, {
        method: 'PATCH',
      });

      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <Send className="size-4" />
      {isPending ? 'Updating...' : 'Mark as ordered'}
    </Button>
  );
}
