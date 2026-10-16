import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  error: string | object;
}

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Don't send a response if headers are already sent
    if (response.headersSent) {
      this.logger.error('Headers already sent, cannot send error response');
      return;
    }

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    const body: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: errorResponse,
    };

    // Log all errors
    const logMessage = `${request.method} ${request.url} - ${status}`;
    if (isHttpException) {
      this.logger.warn(logMessage, this.safeStringify(errorResponse));
    } else {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json(body);
  }

  private safeStringify(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return '[Unable to stringify error response]';
    }
  }
}
