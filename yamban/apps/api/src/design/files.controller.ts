import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { FilesService } from './files.service.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMETYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'image/vnd.adobe.photoshop',
  'application/postscript', // .ai
  'application/x-cdr', // .cdr
  'application/octet-stream', // fallback for .psd, .ai, .cdr
];

@Controller('design/:id/file')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  async get(@Param('id') designJobId: string) {
    const file = await this.files.getFile(designJobId);
    if (!file) throw new NotFoundException('No file uploaded.');
    return file;
  }

  @Get('download')
  async download(@Param('id') designJobId: string, @Res() res: Response) {
    const file = await this.files.getFileForDownload(designJobId);
    if (!file) throw new NotFoundException('No file uploaded.');

    const filePath = this.files.getFilePath(file.storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on disk.');
    }

    res.setHeader('Content-Type', file.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        // Check extension for design files that may not have proper mimetypes
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['png', 'jpg', 'jpeg', 'pdf', 'psd', 'ai', 'cdr'];

        if (allowedExtensions.includes(ext ?? '') || ALLOWED_MIMETYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Allowed: PNG, JPG, PDF, PSD, AI, CDR.'), false);
        }
      },
    }),
  )
  async upload(
    @Param('id') designJobId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');
    return this.files.upload(designJobId, file);
  }

  @Delete()
  async delete(@Param('id') designJobId: string) {
    await this.files.deleteFile(designJobId);
    return { success: true };
  }
}
