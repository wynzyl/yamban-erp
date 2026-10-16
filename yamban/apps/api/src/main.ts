import 'reflect-metadata';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';
import { env } from './config/env.js';
import { mcp } from './mcp/mcp.strategy.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Requests arrive through the Next.js rewrite on the same machine; trust it for req.ip
  // so login rate limiting counts real clients, not the proxy.
  app.set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  // Global response interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor(app.get(Reflector)));

  // Global validation pipe with clean error formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const flattenErrors = (
          errs: ValidationError[],
          parentProperty = '',
        ): { property: string; message: string }[] => {
          return errs.flatMap((error) => {
            const propertyPath = parentProperty
              ? `${parentProperty}.${error.property}`
              : error.property;

            const messages: { property: string; message: string }[] = [];

            if (error.constraints) {
              messages.push(
                ...Object.values(error.constraints).map((message) => ({
                  property: propertyPath,
                  message,
                })),
              );
            }

            if (error.children && error.children.length > 0) {
              messages.push(...flattenErrors(error.children, propertyPath));
            }

            return messages;
          });
        };

        return new BadRequestException(flattenErrors(errors));
      },
    }),
  );

  // Set up MCP server
  mcp.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcp });
  await app.startAllMicroservices();

  await app.listen(env.API_PORT);
  Logger.log(`API listening on http://localhost:${env.API_PORT}/api`, 'Bootstrap');
  Logger.log(`MCP server available at http://localhost:${env.API_PORT}/mcp`, 'Bootstrap');
}

await bootstrap();
