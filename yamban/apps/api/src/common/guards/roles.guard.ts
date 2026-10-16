import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@yamban/shared';
import type { AuthedRequest } from '../decorators/current-user.decorator.js';
import { ROLES } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest<AuthedRequest>();
    // OWNER can do everything.
    if (user && (user.role === 'OWNER' || required.includes(user.role))) return true;
    throw new ForbiddenException('Your role cannot do this.');
  }
}
