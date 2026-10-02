import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@yamban/shared';

export const ROLES = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
