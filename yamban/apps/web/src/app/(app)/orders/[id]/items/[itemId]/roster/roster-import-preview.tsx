'use client';

import { formatSize } from '@yamban/shared';
import { AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { allSizesValid, type ParsedRosterEntry } from '@/lib/roster-import';

interface RosterImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ParsedRosterEntry[];
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RosterImportPreview({
  open,
  onOpenChange,
  entries,
  fileName,
  onConfirm,
  onCancel,
}: RosterImportPreviewProps) {
  const hasInvalidSizes = !allSizesValid(entries);
  const invalidCount = entries.filter((e) => !e.sizeValid || !e.shortSizeValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Import preview
          </DialogTitle>
          <DialogDescription>
            {entries.length} {entries.length === 1 ? 'row' : 'rows'} found in {fileName}
          </DialogDescription>
        </DialogHeader>

        {hasInvalidSizes && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">
                {invalidCount} {invalidCount === 1 ? 'row has' : 'rows have'} invalid sizes
              </p>
              <p className="text-destructive/80">
                Rows with unrecognized sizes are highlighted below. They will use a default size if
                you proceed.
              </p>
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-20">Number</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-24">Short</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No data found in file
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow
                    key={index}
                    className={!entry.sizeValid || !entry.shortSizeValid ? 'bg-destructive/5' : undefined}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>{entry.playerName || <span className="text-muted-foreground">(blank)</span>}</TableCell>
                    <TableCell>{entry.jerseyNumber || <span className="text-muted-foreground">(blank)</span>}</TableCell>
                    <TableCell>
                      <span className={!entry.sizeValid ? 'text-destructive font-medium' : ''}>
                        {formatSize(entry.size)}
                      </span>
                      {!entry.sizeValid && (
                        <span className="ml-1 text-xs text-destructive">(invalid)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.shortSize ? (
                        <>
                          <span className={!entry.shortSizeValid ? 'text-destructive font-medium' : ''}>
                            {formatSize(entry.shortSize)}
                          </span>
                          {!entry.shortSizeValid && (
                            <span className="ml-1 text-xs text-destructive">(invalid)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={entries.length === 0}>
            Import {entries.length} {entries.length === 1 ? 'player' : 'players'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
