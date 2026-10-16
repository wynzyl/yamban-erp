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
        // Mark as printed first
        const res = await fetch(`/api/purchase-requests/${id}/print`, {
          method: 'PATCH',
        });
        if (res.ok) {
          // Navigate to print page
          router.push(`/purchase-requests/${id}/print`);
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
