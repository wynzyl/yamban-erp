'use client';

import { User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignDialogProps {
  jobId: string;
  currentAssigneeId: string | null;
  designers: UserRow[];
}

async function assignDesigner(jobId: string, assignedToId: string | null) {
  const res = await fetch(`/api/design/${jobId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedToId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to assign designer');
  }
  return res.json();
}

export function AssignDialog({ jobId, currentAssigneeId, designers }: AssignDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (value: string) => {
    setError(null);
    const assignedToId = value === 'unassigned' ? null : value;
    try {
      await assignDesigner(jobId, assignedToId);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentAssigneeId ?? 'unassigned'}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-48">
          <User className="size-4 text-muted-foreground" />
          <SelectValue placeholder="Assign designer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {designers.map((designer) => (
            <SelectItem key={designer.id} value={designer.id}>
              {designer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
