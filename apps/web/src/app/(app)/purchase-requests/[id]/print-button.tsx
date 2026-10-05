'use client';

import { Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface PrintButtonProps {
  id: string;
}

export function PrintButton({ id }: PrintButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handlePrint() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${id}/print`, {
          method: 'PATCH',
        });
        if (res.ok) {
          router.refresh();
          // Trigger print dialog
          window.print();
        }
      } catch {
        // Handle error
      }
    });
  }

  return (
    <Button variant="outline" onClick={handlePrint} disabled={isPending}>
      <Printer className="size-4" />
      {isPending ? 'Printing...' : 'Print'}
    </Button>
  );
}
