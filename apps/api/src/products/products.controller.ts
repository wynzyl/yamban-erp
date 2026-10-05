import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  addProductProcessSchema,
  createProductSchema,
  listQuerySchema,
  updateProductProcessSchema,
  updateProductSchema,
} from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: { page: number; pageSize: number; search?: string }) {
    return this.products.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createProductSchema)) data: ReturnType<typeof createProductSchema.parse>) {
    return this.products.create(data);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) data: ReturnType<typeof updateProductSchema.parse>,
  ) {
    return this.products.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.products.delete(id);
  }

  // Process management
  @Post(':id/processes')
  @Roles('OWNER')
  addProcess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addProductProcessSchema)) data: ReturnType<typeof addProductProcessSchema.parse>,
  ) {
    return this.products.addProcess(id, data);
  }

  @Patch(':id/processes/:processId')
  @Roles('OWNER')
  updateProcess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('processId', ParseUUIDPipe) processId: string,
    @Body(new ZodValidationPipe(updateProductProcessSchema)) data: ReturnType<typeof updateProductProcessSchema.parse>,
  ) {
    return this.products.updateProcess(id, processId, data);
  }

  @Delete(':id/processes/:processId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('OWNER')
  deleteProcess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('processId', ParseUUIDPipe) processId: string,
  ) {
    return this.products.deleteProcess(id, processId);
  }
}
