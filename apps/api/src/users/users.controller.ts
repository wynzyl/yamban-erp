import { Body, Controller, Get, Post } from '@nestjs/common';
import { type CreateUserInput, createUserSchema } from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { UsersService } from './users.service.js';

/** Staff accounts are created by the owner. There is no public sign-up. */
@Roles('OWNER')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.users.create(body);
  }
}
