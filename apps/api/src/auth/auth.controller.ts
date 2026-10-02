import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type LoginInput, loginSchema, type SessionUser } from '@yamban/shared';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
} from './auth.constants.js';
import { AuthService, type IssuedTokens } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const tokens = await this.auth.login(body, meta(req));
    setAuthCookies(res, tokens);
    return tokens.user;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionUser> {
    const raw: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('Sign in to continue.');
    try {
      const tokens = await this.auth.refresh(raw, meta(req));
      setAuthCookies(res, tokens);
      return tokens.user;
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): Promise<SessionUser> {
    return this.auth.me(user.id);
  }
}

function meta(req: Request) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

function setAuthCookies(res: Response, t: IssuedTokens): void {
  res.cookie(ACCESS_COOKIE, t.accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, t.refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
}
