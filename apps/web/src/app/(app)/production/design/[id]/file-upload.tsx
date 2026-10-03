'use client';

import { Download, FileImage, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  designJobId: string;
  currentFile: { id: string; fileName: string } | null;
}

async function uploadFile(designJobId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/design/${designJobId}/file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to upload file');
  }
  return res.json();
}

async function deleteFile(designJobId: string) {
  const res = await fetch(`/api/design/${designJobId}/file`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to delete file');
  }
  return res.json();
}

export function FileUpload({ designJobId, currentFile }: FileUploadProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      await uploadFile(designJobId, file);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteFile(designJobId);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const isLoading = isPending || uploading;

  return (
    <div className="space-y-3">
      {currentFile ? (
        <div className="flex items-center justify-between rounded-surface border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <FileImage className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">{currentFile.fileName}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`/api/design/${designJobId}/file/download`} download>
                <Download className="size-4" />
                Download
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-surface border border-dashed border-border p-6 text-center">
          <div className="space-y-2">
            <FileImage className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No design file uploaded</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,.psd,.ai,.cdr"
          onChange={handleUpload}
          disabled={isLoading}
          className="hidden"
          id="file-upload"
        />
        <Button
          variant={currentFile ? 'outline' : 'default'}
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="size-4" />
          {currentFile ? 'Replace file' : 'Upload design file'}
        </Button>
        <span className="text-xs text-muted-foreground">
          PNG, JPG, PDF, PSD, AI, CDR (max 10MB)
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
