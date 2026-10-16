import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { updateDesignJobSchema, assignDesignJobSchema } from '@yamban/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { DesignService } from './design.service.js';

@Controller('design')
export class DesignController {
  constructor(private readonly design: DesignService) {}

  @Get('board')
  board() {
    return this.design.listBoard();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.design.get(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDesignJobSchema)) data: ReturnType<typeof updateDesignJobSchema.parse>,
  ) {
    return this.design.update(id, data);
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignDesignJobSchema)) data: ReturnType<typeof assignDesignJobSchema.parse>,
  ) {
    return this.design.assign(id, data);
  }

  @Post(':id/ready')
  markReady(@Param('id') id: string) {
    return this.design.markReady(id);
  }
}
