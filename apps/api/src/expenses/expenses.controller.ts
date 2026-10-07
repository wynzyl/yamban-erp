import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createExpenseSchema,
  listExpenseQuerySchema,
  updateExpenseSchema,
} from '@yamban/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ExpensesService } from './expenses.service.js';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listExpenseQuerySchema))
    query: ReturnType<typeof listExpenseQuerySchema.parse>,
  ) {
    return this.expenses.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.expenses.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createExpenseSchema))
    data: ReturnType<typeof createExpenseSchema.parse>,
    @CurrentUser('id') userId: string,
  ) {
    return this.expenses.create(data, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema))
    data: ReturnType<typeof updateExpenseSchema.parse>,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.expenses.update(id, data, userId, userRole);
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.expenses.delete(id);
  }
}
