import { Module } from '@nestjs/common';
import { CostingModule } from '../costing/costing.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { JobTransitions } from './job-transitions.service.js';
import { ProductionController } from './production.controller.js';
import { ProductionService } from './production.service.js';

@Module({
  imports: [CostingModule, InventoryModule],
  controllers: [ProductionController],
  providers: [ProductionService, JobTransitions],
  exports: [ProductionService, JobTransitions],
})
export class ProductionModule {}
