import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthedRequest } from '../common/decorators/current-user.decorator.js';
import { IS_PUBLIC } from '../common/decorators/public.decorator.js';
import { ACCESS_COOKIE } from './auth.constants.js';
import type { AccessPayload } from './tokens.js';

/** Global guard: every route needs a valid access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token: string | undefined = req.cookies?.[ACCESS_COOKIE] ?? bearer;
    if (!token) throw new UnauthorizedException('Sign in to continue.');

    try {
      const p = await this.jwt.verifyAsync<AccessPayload>(token);
      req.user = { id: p.sub, email: p.email, name: p.name, role: p.role };
      return true;
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
  }
}
