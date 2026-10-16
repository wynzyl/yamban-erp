import { z } from 'zod';

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required.')
    .max(50, 'Name must be 50 characters or less.')
    .regex(/^[A-Za-z0-9_\s]+$/, 'Name can only contain letters, numbers, spaces, and underscores.'),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryData = z.output<typeof categorySchema>;
