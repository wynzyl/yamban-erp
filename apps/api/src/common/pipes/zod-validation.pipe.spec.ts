import { BadRequestException } from '@nestjs/common';
import { createCustomerSchema } from '@yamban/shared';
import { describe, expect, it } from 'vitest';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(createCustomerSchema);

  it('normalises a PH mobile number and keeps names as entered', () => {
    const out = pipe.transform({ firstName: 'OLNP (KNIGHTS)', mobile: '0917 123 4567' });
    expect(out.firstName).toBe('OLNP (KNIGHTS)');
    expect(out.mobile).toBe('+639171234567');
  });

  it('returns field errors in the guideline voice', () => {
    try {
      pipe.transform({ firstName: '', mobile: '123' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { fieldErrors: Record<string, string[]> };
      expect(body.fieldErrors.firstName?.[0]).toBe('Enter a first name.');
      expect(body.fieldErrors.mobile?.[0]).toMatch(/PH mobile number/);
    }
  });
});
