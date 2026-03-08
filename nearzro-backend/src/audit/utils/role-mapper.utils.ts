// src/audit/utils/role-mapper.util.ts
import { Role } from '@prisma/client';

export function mapJwtRoleToPrismaRole(
  role?: string,
): Role | null {
  if (!role) return null;

  if (Object.values(Role).includes(role as Role)) {
    return role as Role;
  }

  return null; // Unknown / invalid role → null (safe)
}