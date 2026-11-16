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

/**
 * Every error the API sends has this shape. The web app reads `message` and
 * `fieldErrors` from the top level (web/src/lib/api.ts and the client forms).
 */
export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  /** Per-field messages from ZodValidationPipe (or class-validator). */
  fieldErrors?: Record<string, string[]>;
  /** Machine-readable reason, e.g. DOWN_PAYMENT_REQUIRED. */
  code?: string;
  path: string;
  timestamp: string;
}

const UNEXPECTED = 'Something went wrong. Try again.';
const CHECK_FIELDS = 'Check the highlighted fields.';

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
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw: unknown = isHttpException ? exception.getResponse() : undefined;

    const body: ErrorResponseBody = {
      statusCode: status,
      ...(isHttpException ? normalise(raw, exception.message) : { message: UNEXPECTED }),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const logMessage = `${request.method} ${request.url} - ${status}`;
    if (isHttpException) {
      this.logger.warn(logMessage, this.safeStringify(raw));
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

type Normalised = Pick<ErrorResponseBody, 'message' | 'fieldErrors' | 'code'>;

/**
 * Flattens the shapes Nest exceptions carry:
 *  - 'text'                                      new HttpException('text', 429)
 *  - { message: 'text', error, statusCode }      new BadRequestException('text')
 *  - { message, fieldErrors }                    ZodValidationPipe
 *  - { message, code }                           new ConflictException({ code, message })
 *  - { message: [{ property, message }], … }     class-validator exceptionFactory in main.ts
 *  - { message: ['a', 'b'], … }                  Nest's default ValidationPipe
 */
function normalise(raw: unknown, fallback: string): Normalised {
  if (typeof raw === 'string') return { message: raw };
  if (Array.isArray(raw)) return fromArray(raw, fallback);
  if (!raw || typeof raw !== 'object') return { message: fallback };

  const obj = raw as Record<string, unknown>;
  const out: Normalised = Array.isArray(obj.message)
    ? fromArray(obj.message, fallback)
    : { message: typeof obj.message === 'string' && obj.message ? obj.message : fallback };

  if (isFieldErrors(obj.fieldErrors)) out.fieldErrors = obj.fieldErrors;
  if (typeof obj.code === 'string') out.code = obj.code;
  return out;
}

function fromArray(items: unknown[], fallback: string): Normalised {
  const fieldErrors: Record<string, string[]> = {};
  const plain: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      plain.push(item);
    } else if (item && typeof item === 'object') {
      const { property, message } = item as { property?: unknown; message?: unknown };
      if (typeof property === 'string' && typeof message === 'string') {
        (fieldErrors[property] ??= []).push(message);
      }
    }
  }
  if (Object.keys(fieldErrors).length) return { message: CHECK_FIELDS, fieldErrors };
  return { message: plain.length ? plain.join(' ') : fallback };
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
