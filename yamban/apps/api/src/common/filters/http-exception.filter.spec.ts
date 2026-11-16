import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { createCustomerSchema } from '@yamban/shared';
import { describe, expect, it } from 'vitest';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

/** Runs the filter and returns the status and JSON body it sent. */
function run(exception: unknown) {
  let status = 0;
  let body: Record<string, unknown> = {};
  const res = {
    headersSent: false,
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      body = payload;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'POST', url: '/api/customers' }),
    }),
  } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return { status, body };
}

describe('HttpExceptionFilter', () => {
  it('puts message and fieldErrors at the top level for zod validation errors', () => {
    let err: unknown;
    try {
      new ZodValidationPipe(createCustomerSchema).transform({ firstName: '' });
    } catch (e) {
      err = e;
    }
    const { status, body } = run(err);
    expect(status).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Check the highlighted fields.');
    expect((body.fieldErrors as Record<string, string[]>).firstName?.[0]).toBe('Enter a first name.');
    expect(body.path).toBe('/api/customers');
    expect(typeof body.timestamp).toBe('string');
    expect(body).not.toHaveProperty('error');
  });

  it('passes a plain business-rule message through', () => {
    const { status, body } = run(new BadRequestException('Only quotations can be deleted. Cancel the order instead.'));
    expect(status).toBe(400);
    expect(body.message).toBe('Only quotations can be deleted. Cancel the order instead.');
    expect(body).not.toHaveProperty('fieldErrors');
  });

  it('keeps a machine-readable code when one is given', () => {
    const { status, body } = run(new ConflictException({ code: 'DOWN_PAYMENT_REQUIRED', message: 'No down payment recorded.' }));
    expect(status).toBe(409);
    expect(body.code).toBe('DOWN_PAYMENT_REQUIRED');
    expect(body.message).toBe('No down payment recorded.');
  });

  it('handles exceptions created with a bare string response', () => {
    const { status, body } = run(new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS));
    expect(status).toBe(429);
    expect(body.message).toBe('Too Many Requests');
  });

  it('turns class-validator message arrays into one message plus field errors', () => {
    const { body } = run(
      new BadRequestException([
        { property: 'email', message: 'email must be an email' },
        { property: 'email', message: 'email should not be empty' },
      ]),
    );
    expect(body.message).toBe('Check the highlighted fields.');
    expect(body.fieldErrors).toEqual({ email: ['email must be an email', 'email should not be empty'] });
  });

  it('uses plain string arrays as the message', () => {
    const { body } = run(new BadRequestException(['first problem', 'second problem']));
    expect(body.message).toBe('first problem second problem');
  });

  it('hides internals of unexpected errors', () => {
    const { status, body } = run(new Error('relation "orders" does not exist'));
    expect(status).toBe(500);
    expect(body.message).toBe('Something went wrong. Try again.');
    expect(JSON.stringify(body)).not.toContain('relation');
  });

  it('still reports not-found messages', () => {
    const { status, body } = run(new NotFoundException('Order not found.'));
    expect(status).toBe(404);
    expect(body.message).toBe('Order not found.');
  });
});
