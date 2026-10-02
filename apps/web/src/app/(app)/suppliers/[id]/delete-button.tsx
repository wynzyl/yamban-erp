'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';

export function DeleteSupplierButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setPending(true);
    setError(undefined);
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) {
      router.push('/suppliers');
      router.refresh();
      return;
    }
    setPending(false);
    setError('Failed to delete supplier. They may be linked to materials or purchases.');
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{name}</strong> from your supplier list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={pending} className="bg-destructive hover:bg-destructive/90">
            {pending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
