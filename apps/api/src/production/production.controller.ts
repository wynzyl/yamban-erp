import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PRODUCTION_STAGES, type ProductionStage, startJobSchema } from '@yamban/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ProductionService } from './production.service.js';

@Controller('production')
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get('board/:stage')
  board(@Param('stage') stage: string) {
    // Validate stage parameter
    if (!PRODUCTION_STAGES.includes(stage as ProductionStage)) {
      throw new BadRequestException(`Invalid stage: ${stage}`);
    }
    return this.production.listByStage(stage as ProductionStage);
  }

  @Get('dashboard')
  dashboard() {
    return this.production.getDashboardCounts();
  }

  @Patch('jobs/:id/start')
  start(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(startJobSchema)) data: ReturnType<typeof startJobSchema.parse>,
  ) {
    return this.production.startJob(id, data);
  }

  @Patch('jobs/:id/complete')
  complete(@Param('id') id: string) {
    return this.production.completeJob(id);
  }
}
