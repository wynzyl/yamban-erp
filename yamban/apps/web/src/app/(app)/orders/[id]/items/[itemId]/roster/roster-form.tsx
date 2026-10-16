'use client';

import {
  GARMENT_SIZES,
  SIZE_LABELS,
  updateRosterSchema,
  type GarmentSize,
} from '@yamban/shared';
import { FileSpreadsheet, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { mapRowsToRoster, toEditableRoster, type ParsedRosterEntry } from '@/lib/roster-import';
import { parseSpreadsheetFile } from '@/lib/spreadsheet';
import { RosterImportPreview } from './roster-import-preview';

interface OrderItemSize {
  id: string;
  orderItemId: string;
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface RosterEntry {
  id: string;
  orderItemId: string;
  playerName: string;
  jerseyNumber: string | null;
  size: GarmentSize;
  shortSize: GarmentSize | null;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: number;
  subtotal: string;
  sizes: OrderItemSize[];
  roster: RosterEntry[];
}

interface RosterEditFormProps {
  orderId: string;
  item: OrderItem;
}

interface EditableRosterEntry {
  playerName: string;
  jerseyNumber: string;
  size: GarmentSize;
  shortSize: GarmentSize | null;
}

export function RosterEditForm({ orderId, item }: RosterEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [roster, setRoster] = useState<EditableRosterEntry[]>(
    item.roster.map((r) => ({
      playerName: r.playerName,
      jerseyNumber: r.jerseyNumber ?? '',
      size: r.size,
      shortSize: r.shortSize,
    })),
  );

  // File import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importEntries, setImportEntries] = useState<ParsedRosterEntry[]>([]);
  const [importFileName, setImportFileName] = useState('');

  const availableSizes = item.sizes.filter((s) => s.quantity > 0);
  const defaultSize: GarmentSize = availableSizes[0]?.size ?? 'M';

  function addEntry() {
    setRoster([...roster, { playerName: '', jerseyNumber: '', size: defaultSize, shortSize: null }]);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    try {
      const rows = await parseSpreadsheetFile(file);
      const entries = mapRowsToRoster(rows, defaultSize);
      setImportEntries(entries);
      setImportFileName(file.name);
      setImportPreviewOpen(true);
    } catch {
      setError('Failed to parse file. Make sure it is a valid spreadsheet.');
    }
  }

  function handleImportConfirm() {
    // Replace roster with imported entries (AC-10)
    setRoster(toEditableRoster(importEntries));
    setImportPreviewOpen(false);
    setImportEntries([]);
    setImportFileName('');
  }

  function handleImportCancel() {
    // Close dialog, leave roster unchanged (AC-11)
    setImportPreviewOpen(false);
    setImportEntries([]);
    setImportFileName('');
  }

  function removeEntry(index: number) {
    setRoster(roster.filter((_, i) => i !== index));
  }

  function updateEntry(
    index: number,
    field: 'playerName' | 'jerseyNumber' | 'size' | 'shortSize',
    value: string | null,
  ) {
    setRoster(
      roster.map((entry, i) => {
        if (i !== index) return entry;
        if (field === 'size') {
          return { ...entry, size: value as GarmentSize };
        }
        if (field === 'shortSize') {
          return { ...entry, shortSize: value ? (value as GarmentSize) : null };
        }
        return { ...entry, [field]: value ?? '' };
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filteredRoster = roster
      .filter((r) => r.playerName.trim())
      .map((r) => ({
        playerName: r.playerName.trim(),
        jerseyNumber: r.jerseyNumber.trim() || undefined,
        size: r.size,
        shortSize: r.shortSize,
      }));

    const data = { roster: filteredRoster };

    const result = updateRosterSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid roster data.');
      return;
    }

    const res = await fetch(`/api/orders/${orderId}/items/${item.id}/roster`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || 'Failed to update roster.');
      return;
    }

    startTransition(() => router.push(`/orders/${orderId}`));
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Label className="text-base font-medium">Lineup</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods,.numbers"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="size-3" />
              Import from file
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addEntry}>
              <Plus className="size-3" />
              Add player
            </Button>
          </div>
        </div>

        {roster.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No players added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {roster.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Name"
                  className="flex-1"
                  value={entry.playerName}
                  onChange={(e) => updateEntry(index, 'playerName', e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="#"
                  className="w-16"
                  value={entry.jerseyNumber}
                  onChange={(e) => updateEntry(index, 'jerseyNumber', e.target.value)}
                />
                <Select
                  value={entry.size}
                  onValueChange={(size) => updateEntry(index, 'size', size)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GARMENT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {SIZE_LABELS[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={entry.shortSize ?? ''}
                  onValueChange={(size) => updateEntry(index, 'shortSize', size || null)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Short" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {GARMENT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {SIZE_LABELS[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(index)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableSizes.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Available sizes:{' '}
              {availableSizes.map((s) => `${SIZE_LABELS[s.size]} (${s.quantity})`).join(', ')}
            </p>
          </div>
        )}
      </Surface>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save roster'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <RosterImportPreview
        open={importPreviewOpen}
        onOpenChange={setImportPreviewOpen}
        entries={importEntries}
        fileName={importFileName}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
      />
    </form>
  );
}
