'use client';

import { categorySchema } from '@yamban/shared';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

interface CategoriesListProps {
  categories: Category[];
}

export function CategoriesList({ categories }: CategoriesListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    const parsed = categorySchema.safeParse({ name: newValue });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.name?.[0] ?? 'Invalid input.');
      return;
    }

    setPending(true);
    setError(null);

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newValue }),
    });

    if (res.ok) {
      setNewValue('');
      setShowAdd(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to create category.');
    }
    setPending(false);
  }

  async function handleUpdate(id: string) {
    const parsed = categorySchema.safeParse({ name: editValue });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.name?.[0] ?? 'Invalid input.');
      return;
    }

    setPending(true);
    setError(null);

    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editValue }),
    });

    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to update category.');
    }
    setPending(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);

    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to delete category.');
    }
    setDeletingId(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditValue(category.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
    setError(null);
  }

  function startAdd() {
    setShowAdd(true);
    setNewValue('');
    setError(null);
  }

  function cancelAdd() {
    setShowAdd(false);
    setNewValue('');
    setError(null);
  }

  return (
    <Surface className="mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Categories for organizing materials. Used in material forms and filters.
        </p>
        {!showAdd && (
          <Button variant="outline" size="sm" onClick={startAdd}>
            <Plus className="size-4" />
            Add category
          </Button>
        )}
      </div>

      {error && (
        <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showAdd && (
            <TableRow>
              <TableCell>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Category name"
                  className="h-8"
                  autoFocus
                  disabled={pending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') cancelAdd();
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={cancelAdd}
                    disabled={pending}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-success hover:text-success"
                    onClick={handleCreate}
                    disabled={pending}
                  >
                    <Check className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                {editingId === category.id ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8"
                    autoFocus
                    disabled={pending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(category.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                ) : (
                  <span className="font-medium">{category.name}</span>
                )}
              </TableCell>
              <TableCell>
                {editingId === category.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={cancelEdit}
                      disabled={pending}
                    >
                      <X className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-success hover:text-success"
                      onClick={() => handleUpdate(category.id)}
                      disabled={pending}
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => startEdit(category)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(category.id)}
                      disabled={deletingId === category.id}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && !showAdd && (
            <TableRow>
              <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                No categories yet. Add one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Surface>
  );
}
