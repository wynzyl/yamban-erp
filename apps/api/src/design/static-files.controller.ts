import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { designFiles } from '../db/schema/index.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Controller('files')
export class StaticFilesController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Get(':key')
  async serveFile(@Param('key') storageKey: string, @Res() res: Response) {
    // Look up file metadata
    const [file] = await this.db
      .select({
        fileName: designFiles.fileName,
        fileType: designFiles.fileType,
      })
      .from(designFiles)
      .where(eq(designFiles.storageKey, storageKey))
      .limit(1);

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    const filePath = join(UPLOADS_DIR, storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on disk.');
    }

    res.setHeader('Content-Type', file.fileType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
