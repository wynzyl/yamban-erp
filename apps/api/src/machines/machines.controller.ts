import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  type CreateMachineData,
  createMachineSchema,
  type UpdateMachineData,
  updateMachineSchema,
} from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { MachinesService } from './machines.service.js';

@Controller('machines')
export class MachinesController {
  constructor(private readonly machines: MachinesService) {}

  @Get()
  list() {
    return this.machines.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.machines.get(id);
  }

  @Post()
  @Roles('OWNER')
  create(@Body(new ZodValidationPipe(createMachineSchema)) body: CreateMachineData) {
    return this.machines.create(body);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMachineSchema)) body: UpdateMachineData,
  ) {
    return this.machines.update(id, body);
  }

  @Delete(':id')
  @Roles('OWNER')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.machines.delete(id);
  }
}
