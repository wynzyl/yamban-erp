import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  type ListCostingQuery,
  listCostingQuerySchema,
  type ProductionCostReportQuery,
  productionCostReportQuerySchema,
} from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { CostingService } from './costing.service.js';

@Controller('costing')
export class CostingController {
  constructor(private readonly costing: CostingService) {}

  @Get('orders')
  listOrders(@Query(new ZodValidationPipe(listCostingQuerySchema)) q: ListCostingQuery) {
    return this.costing.listOrderCosts(q);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.costing.getOrderCostDetail(id);
  }

  @Get('reports/production-cost')
  @Roles('OWNER')
  getProductionCostReport(
    @Query(new ZodValidationPipe(productionCostReportQuerySchema)) q: ProductionCostReportQuery,
  ) {
    return this.costing.getProductionCostReport(q.month);
  }
}
