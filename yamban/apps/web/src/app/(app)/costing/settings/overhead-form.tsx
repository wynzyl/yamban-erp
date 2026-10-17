'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OverheadFormProps {
  currentAmount: string;
}

export function OverheadForm({ currentAmount }: OverheadFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(currentAmount);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      setError('Enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/overhead', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyAmount: amount }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to save.');
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor="monthlyAmount">Monthly overhead amount</Label>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
          <Input
            id="monthlyAmount"
            type="text"
            inputMode="decimal"
            pattern="^\d{1,12}(\.\d{1,2})?$"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-8"
            placeholder="0.00"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Enter your total monthly fixed costs (rent, utilities, insurance, subscriptions, etc.).
      </p>
    </form>
  );
}
