import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type ListPurchaseRequestsQuery,
  listPurchaseRequestsQuerySchema,
  type ReceivePurchaseRequestData,
  receivePurchaseRequestSchema,
  type UpdatePurchaseRequestData,
  updatePurchaseRequestSchema,
} from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';

@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly purchaseRequests: PurchaseRequestsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listPurchaseRequestsQuerySchema)) q: ListPurchaseRequestsQuery) {
    return this.purchaseRequests.list(q);
  }

  @Get('shortages')
  calculateShortages() {
    return this.purchaseRequests.calculateShortages();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseRequests.get(id);
  }

  @Post('build-from-shortages')
  buildFromShortages() {
    return this.purchaseRequests.buildFromShortages();
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePurchaseRequestSchema)) body: UpdatePurchaseRequestData,
  ) {
    return this.purchaseRequests.update(id, body);
  }

  @Patch(':id/print')
  markPrinted(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseRequests.markPrinted(id);
  }

  @Patch(':id/receive')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(receivePurchaseRequestSchema)) body: ReceivePurchaseRequestData,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchaseRequests.receive(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseRequests.cancel(id);
  }
}
