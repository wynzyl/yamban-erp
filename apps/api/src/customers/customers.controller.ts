import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateCustomerData,
  createCustomerSchema,
  type ListQuery,
  listQuerySchema,
  type UpdateCustomerData,
  updateCustomerSchema,
} from '@yamban/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.customers.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.get(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerData) {
    return this.customers.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerData,
  ) {
    return this.customers.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.delete(id);
  }
}
