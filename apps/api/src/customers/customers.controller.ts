import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateCustomerData,
  createCustomerSchema,
  listQuerySchema,
  type UpdateCustomerData,
  updateCustomerSchema,
} from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { CustomersService, type CustomerListQuery } from './customers.service.js';

// Extended query schema for customer list
const customerListQuerySchema = listQuerySchema.extend({
  sortBy: listQuerySchema.shape.search,
  sortOrder: listQuerySchema.shape.search,
  municipality: listQuerySchema.shape.search,
});

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query(new ZodValidationPipe(customerListQuerySchema)) q: CustomerListQuery) {
    return this.customers.list(q);
  }

  @Get('municipalities')
  getMunicipalities() {
    return this.customers.getMunicipalities();
  }

  @Get('organizations')
  getOrganizations() {
    return this.customers.getOrganizations();
  }

  @Get('with-orders')
  @Roles('OWNER')
  listWithOrders() {
    return this.customers.listWithOrders();
  }

  @Get(':id/orders')
  getOrders(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.getOrders(id);
  }

  @Get(':id/summary')
  getSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.getSummary(id);
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
