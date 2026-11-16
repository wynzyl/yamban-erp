import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PRODUCTION_STAGES, type ProductionStage, startJobSchema } from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
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
    @CurrentUser('id') userId: string,
  ) {
    return this.production.startJob(id, data, userId);
  }

  @Patch('jobs/:id/complete')
  complete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.production.completeJob(id, userId);
  }

  @Get('ready')
  readyOrders() {
    return this.production.listReadyOrders();
  }

  @Patch('orders/:id/release')
  release(@Param('id') id: string) {
    return this.production.releaseOrder(id);
  }
}
