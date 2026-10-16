'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DeleteProcessButtonProps {
  productId: string;
  processId: string;
}

export function DeleteProcessButton({ productId, processId }: DeleteProcessButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const res = await fetch(`/api/products/${productId}/processes/${processId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
