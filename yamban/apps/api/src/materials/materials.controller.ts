import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateMaterialData,
  createMaterialSchema,
  type ListQuery,
  listQuerySchema,
  type UpdateMaterialData,
  updateMaterialSchema,
} from '@yamban/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { MaterialsService } from './materials.service.js';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.materials.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.materials.get(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createMaterialSchema)) body: CreateMaterialData) {
    return this.materials.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMaterialSchema)) body: UpdateMaterialData,
  ) {
    return this.materials.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.materials.delete(id);
  }
}
