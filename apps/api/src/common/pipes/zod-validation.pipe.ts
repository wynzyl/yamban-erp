import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z, type ZodType } from 'zod';

/**
 * Validates and transforms input with a zod schema from @yamban/shared,
 * so the web form and the API enforce the same rules.
 *
 *   @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerData
 */
export class ZodValidationPipe<T extends ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException({
      message: 'Check the highlighted fields.',
      fieldErrors: z.flattenError(result.error).fieldErrors,
    });
  }
}
