'use client';

import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportColumn {
  header: string;
  accessor: string | ((row: Record<string, unknown>) => string | number);
}

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
}

export function ExportButton({ data, columns, filename }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  function getValue(row: Record<string, unknown>, accessor: ExportColumn['accessor']): string | number {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    const value = row[accessor];
    if (value === null || value === undefined) return '';
    return String(value);
  }

  function exportToExcel() {
    setExporting(true);
    try {
      const headers = columns.map((c) => c.header);
      const rows = data.map((row) => columns.map((c) => getValue(row, c.accessor)));

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      XLSX.writeFile(wb, `${filename}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  function exportToCsv() {
    setExporting(true);
    try {
      const headers = columns.map((c) => c.header);
      const rows = data.map((row) => columns.map((c) => getValue(row, c.accessor)));

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function print() {
    window.print();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          <Download className="size-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="size-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCsv}>
          <FileSpreadsheet className="size-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={print}>
          <Printer className="size-4" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
