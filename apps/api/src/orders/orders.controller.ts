import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { createOrderSchema, listQuerySchema, updateOrderSchema } from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listQuerySchema.extend({ status: listQuerySchema.shape.search })))
    query: { page: number; pageSize: number; search?: string; status?: string },
  ) {
    return this.orders.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.get(id);
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

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.orders.delete(id);
  }
}
