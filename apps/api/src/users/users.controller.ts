import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { type CreateUserInput, createUserSchema, type UserRole, USER_ROLES } from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { UsersService } from './users.service.js';

/** Staff accounts are created by the owner. There is no public sign-up. */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('role') role?: string) {
    // Validate role if provided
    const validRole = role && (USER_ROLES as readonly string[]).includes(role)
      ? (role as UserRole)
      : undefined;
    return this.users.list(validRole);
  }

  @Roles('OWNER')
  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.users.create(body);
  }
}
