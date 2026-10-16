import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  type ListInventoryQuery,
  listInventoryQuerySchema,
  type RecordAdjustmentData,
  recordAdjustmentSchema,
  type RecordWasteData,
  recordWasteSchema,
} from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  listTransactions(@Query(new ZodValidationPipe(listInventoryQuerySchema)) q: ListInventoryQuery) {
    return this.inventory.listTransactions(q);
  }

  @Get('stock')
  getStockSummary() {
    return this.inventory.getStockSummary();
  }

  @Get('stock/:materialId')
  getMaterialStock(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.inventory.getMaterialStock(materialId);
  }

  @Post('adjustment')
  recordAdjustment(
    @Body(new ZodValidationPipe(recordAdjustmentSchema)) body: RecordAdjustmentData,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventory.recordAdjustment(body, userId);
  }

  @Post('waste')
  recordWaste(
    @Body(new ZodValidationPipe(recordWasteSchema)) body: RecordWasteData,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventory.recordWaste(body, userId);
  }
}
