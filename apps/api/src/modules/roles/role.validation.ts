import { z } from "zod";

import { ROLE_KEYS } from "../../shared/constants/role.constants";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";
import {
  enumSchema,
  mongoObjectIdSchema,
  optionalTrimmedStringSchema
} from "../../shared/validation/common-schemas";

const roleBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const roleIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const roleListQuerySchema = baseListQuerySchema;

export const createRoleBodySchema = z
  .object({
    description: optionalTrimmedStringSchema,
    displayName: optionalTrimmedStringSchema,
    name: enumSchema(ROLE_KEYS)
  })
  .strict();

export const updateRoleBodySchema = z
  .object({
    description: optionalTrimmedStringSchema,
    displayName: optionalTrimmedStringSchema
  })
  .strict()
  .refine(roleBodyHasUpdate, "At least one field must be provided");

export type CreateRoleBody = z.infer<typeof createRoleBodySchema>;
export type RoleIdParams = z.infer<typeof roleIdParamsSchema>;
export type RoleListQuery = z.infer<typeof roleListQuerySchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;
