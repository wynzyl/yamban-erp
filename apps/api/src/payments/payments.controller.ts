import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { createPaymentSchema, listQuerySchema, updatePaymentSchema } from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: { page: number; pageSize: number; search?: string }) {
    return this.payments.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.payments.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPaymentSchema)) data: ReturnType<typeof createPaymentSchema.parse>,
    @CurrentUser('id') userId: string,
  ) {
    return this.payments.create(data, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) data: ReturnType<typeof updatePaymentSchema.parse>,
  ) {
    return this.payments.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.payments.delete(id);
  }
}
