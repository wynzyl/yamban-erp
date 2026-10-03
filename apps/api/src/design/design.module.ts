import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DesignController } from './design.controller.js';
import { DesignService } from './design.service.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [DesignController, FilesController],
  providers: [DesignService, FilesService],
  exports: [DesignService, FilesService],
})
export class DesignModule {}
