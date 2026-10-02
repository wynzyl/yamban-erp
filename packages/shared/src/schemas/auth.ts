import { z } from 'zod';
import { USER_ROLES } from '../enums.js';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  role: z.enum(USER_ROLES),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** What the API returns for the signed-in user. Never includes the password hash. */
export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: z.enum(USER_ROLES),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
