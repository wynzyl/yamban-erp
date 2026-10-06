import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
  addProductProcessSchema,
  addRecipeMaterialSchema,
  createProductSchema,
  listQuerySchema,
  PRODUCTION_STAGES,
  type ProductionStage,
  updateProductProcessSchema,
  updateProductSchema,
  updateProductStageLaborRateSchema,
  updateRecipeMaterialSchema,
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

  // Stage labor rate management
  @Patch(':id/stages/:stageId/labor-rate')
  @Roles('OWNER')
  updateStageLaborRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body(new ZodValidationPipe(updateProductStageLaborRateSchema))
    data: ReturnType<typeof updateProductStageLaborRateSchema.parse>,
  ) {
    return this.products.updateStageLaborRate(id, stageId, data);
  }

  @Put(':id/labor-rates/:stage')
  @Roles('OWNER')
  upsertStageLaborRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stage') stage: string,
    @Body(new ZodValidationPipe(updateProductStageLaborRateSchema))
    data: ReturnType<typeof updateProductStageLaborRateSchema.parse>,
  ) {
    // Validate stage parameter
    if (!PRODUCTION_STAGES.includes(stage as ProductionStage)) {
      throw new BadRequestException(`Invalid stage: ${stage}. Must be one of: ${PRODUCTION_STAGES.join(', ')}`);
    }
    return this.products.upsertStageLaborRate(id, stage as ProductionStage, data);
  }

  // Recipe management
  @Post(':id/recipe')
  @Roles('OWNER')
  addRecipeMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addRecipeMaterialSchema)) data: ReturnType<typeof addRecipeMaterialSchema.parse>,
  ) {
    return this.products.addRecipeMaterial(id, data);
  }

  @Patch(':id/recipe/:recipeMaterialId')
  @Roles('OWNER')
  updateRecipeMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('recipeMaterialId', ParseUUIDPipe) recipeMaterialId: string,
    @Body(new ZodValidationPipe(updateRecipeMaterialSchema)) data: ReturnType<typeof updateRecipeMaterialSchema.parse>,
  ) {
    return this.products.updateRecipeMaterial(id, recipeMaterialId, data);
  }

  @Delete(':id/recipe/:recipeMaterialId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('OWNER')
  deleteRecipeMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('recipeMaterialId', ParseUUIDPipe) recipeMaterialId: string,
  ) {
    return this.products.deleteRecipeMaterial(id, recipeMaterialId);
  }
}
