import { z } from "zod";

import { PLATFORM_ROLES } from "@/features/platform-iam/domain/platform-authorization";
import { databaseIdSchema } from "@/lib/validation/identifiers";

export const createPlatformAdminAssignmentRequestSchema = z.object({
  userId: databaseIdSchema,
  roleKey: z.literal(PLATFORM_ROLES.ADMIN),
  expiresAt: z.iso.datetime().nullable().optional(),
}).strict();

export const platformRoleKeySchema = z.enum(PLATFORM_ROLES);
