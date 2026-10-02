import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { createProductSchema, listQuerySchema, updateProductSchema } from '@yamban/shared';
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
}
