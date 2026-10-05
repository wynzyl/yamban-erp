import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { designFiles, designJobs } from '../db/schema/index.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Image mimetypes that should be converted to WebP
const IMAGE_MIMETYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export interface DesignFile {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date;
}

@Injectable()
export class FilesService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Get file metadata for a design job */
  async getFile(designJobId: string): Promise<DesignFile | null> {
    const [file] = await this.db
      .select({
        id: designFiles.id,
        fileName: designFiles.fileName,
        fileType: designFiles.fileType,
        uploadedAt: designFiles.uploadedAt,
      })
      .from(designFiles)
      .where(eq(designFiles.designJobId, designJobId))
      .limit(1);

    return file ?? null;
  }

  /** Get full file info including storage key for download */
  async getFileForDownload(designJobId: string): Promise<{ storageKey: string; fileName: string; fileType: string } | null> {
    const [file] = await this.db
      .select({
        storageKey: designFiles.storageKey,
        fileName: designFiles.fileName,
        fileType: designFiles.fileType,
      })
      .from(designFiles)
      .where(eq(designFiles.designJobId, designJobId))
      .limit(1);

    return file ?? null;
  }

  /** Upload or replace design file */
  async upload(
    designJobId: string,
    file: Express.Multer.File,
  ): Promise<DesignFile> {
    // Verify design job exists
    const [job] = await this.db
      .select({ id: designJobs.id })
      .from(designJobs)
      .where(eq(designJobs.id, designJobId))
      .limit(1);

    if (!job) throw new NotFoundException('Design job not found.');

    // Delete existing file if any
    await this.deleteFile(designJobId);

    const isImage = IMAGE_MIMETYPES.includes(file.mimetype);
    let fileBuffer = file.buffer;
    let storageKey: string;
    let fileType: string;
    let fileName: string;

    if (isImage) {
      // Convert image to WebP format
      fileBuffer = await sharp(file.buffer)
        .webp({ quality: 85 })
        .toBuffer();

      storageKey = `${randomUUID()}.webp`;
      fileType = 'image/webp';
      // Keep original filename but change extension for display
      const baseName = file.originalname.replace(/\.[^/.]+$/, '');
      fileName = `${baseName}.webp`;
    } else {
      // Non-image files: keep original format
      const ext = file.originalname.split('.').pop() ?? 'bin';
      storageKey = `${randomUUID()}.${ext}`;
      fileType = file.mimetype;
      fileName = file.originalname;
    }

    // Write file to uploads directory
    const { writeFile } = await import('fs/promises');
    await writeFile(join(UPLOADS_DIR, storageKey), fileBuffer);

    // Insert file record
    const [inserted] = await this.db
      .insert(designFiles)
      .values({
        designJobId,
        fileName,
        storageKey,
        fileType,
        version: 1,
        isFinal: true,
      })
      .returning({
        id: designFiles.id,
        fileName: designFiles.fileName,
        fileType: designFiles.fileType,
        uploadedAt: designFiles.uploadedAt,
      });

    return inserted!;
  }

  /** Delete file for a design job */
  async deleteFile(designJobId: string): Promise<void> {
    const [existing] = await this.db
      .select({
        id: designFiles.id,
        storageKey: designFiles.storageKey,
      })
      .from(designFiles)
      .where(eq(designFiles.designJobId, designJobId))
      .limit(1);

    if (existing) {
      // Delete from disk
      try {
        await unlink(join(UPLOADS_DIR, existing.storageKey));
      } catch {
        // File may already be deleted, ignore
      }

      // Delete from database
      await this.db
        .delete(designFiles)
        .where(eq(designFiles.id, existing.id));
    }
  }

  /** Get full path to file on disk */
  getFilePath(storageKey: string): string {
    return join(UPLOADS_DIR, storageKey);
  }
}
