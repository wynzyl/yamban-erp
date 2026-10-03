import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { PRODUCTION_STAGES, type ProductionStage } from '@yamban/shared';
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
}
