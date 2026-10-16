import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '@yamban/shared';

export interface AuthedRequest extends Request {
  user: SessionUser;
}

/**
 * Parameter decorator to extract the current user or a specific property.
 *
 * @example
 * // Get the full user object
 * @CurrentUser() user: SessionUser
 *
 * // Get just the user ID
 * @CurrentUser('id') userId: string
 *
 * @see https://docs.nestjs.com/custom-decorators#param-decorators
 */
export const CurrentUser = createParamDecorator(
  (data: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    return data ? user?.[data] : user;
  },
);
