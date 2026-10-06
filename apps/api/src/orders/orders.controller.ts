import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import type { UserRole } from '@yamban/shared';
import {
  addOrderItemSchema,
  createOrderSchema,
  editOrderSchema,
  listQuerySchema,
  updateItemPricesSchema,
  updateOrderNotesSchema,
  updateOrderSchema,
  updateRosterSchema,
} from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ResponseMessage('Orders retrieved successfully')
  list(
    @Query(new ZodValidationPipe(listQuerySchema.extend({ status: listQuerySchema.shape.search })))
    query: { page: number; pageSize: number; search?: string; status?: string },
    @CurrentUser('role') role: UserRole,
  ) {
    return this.orders.list(query, role);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser('role') role: UserRole) {
    return this.orders.get(id, role);
  }

  @Get(':id/editable')
  async isEditable(@Param('id') id: string) {
    const editable = await this.orders.isEditable(id);
    return { editable };
  }

  @Get(':id/edit-permissions')
  async getEditPermissions(@Param('id') id: string) {
    return this.orders.getEditPermissions(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createOrderSchema)) data: ReturnType<typeof createOrderSchema.parse>,
    @CurrentUser('id') userId: string,
  ) {
    return this.orders.create(data, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateOrderSchema)) data: ReturnType<typeof updateOrderSchema.parse>) {
    return this.orders.update(id, data);
  }

  @Put(':id')
  editOrder(@Param('id') id: string, @Body(new ZodValidationPipe(editOrderSchema)) data: ReturnType<typeof editOrderSchema.parse>) {
    return this.orders.editOrder(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.orders.delete(id);
  }

  @Put(':id/items/:itemId/roster')
  updateRoster(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateRosterSchema)) data: ReturnType<typeof updateRosterSchema.parse>,
  ) {
    return this.orders.editRoster(id, itemId, data);
  }

  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addOrderItemSchema)) data: ReturnType<typeof addOrderItemSchema.parse>,
  ) {
    return this.orders.addOrderItem(id, data);
  }

  @Patch(':id/items/:itemId/prices')
  updatePrices(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateItemPricesSchema)) data: ReturnType<typeof updateItemPricesSchema.parse>,
  ) {
    return this.orders.updateItemPrices(id, itemId, data);
  }

  @Patch(':id/notes')
  updateNotes(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrderNotesSchema)) data: ReturnType<typeof updateOrderNotesSchema.parse>,
  ) {
    return this.orders.updateOrderNotes(id, data);
  }
}
