import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateSupplierData,
  createSupplierSchema,
  type ListQuery,
  listQuerySchema,
  type UpdateSupplierData,
  updateSupplierSchema,
} from '@yamban/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SuppliersService } from './suppliers.service.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.suppliers.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.get(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierData) {
    return this.suppliers.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierData,
  ) {
    return this.suppliers.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.delete(id);
  }
}
