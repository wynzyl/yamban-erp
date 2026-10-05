import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PurchaseRequestsController } from './purchase-requests.controller.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
