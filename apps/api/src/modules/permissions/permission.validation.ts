import { z } from "zod";

import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES
} from "../../shared/constants/permission.constants";
import {
  enumSchema,
  mongoObjectIdSchema,
  optionalTrimmedStringSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const permissionBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const permissionIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const rolePermissionsParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const permissionListQuerySchema = baseListQuerySchema.extend({
  module: enumSchema(PERMISSION_MODULES).optional(),
  roleId: mongoObjectIdSchema.optional()
});

export const createPermissionBodySchema = z
  .object({
    action: enumSchema(PERMISSION_ACTIONS),
    description: optionalTrimmedStringSchema,
    displayName: optionalTrimmedStringSchema,
    module: enumSchema(PERMISSION_MODULES),
    roleId: mongoObjectIdSchema
  })
  .strict();

export const updatePermissionBodySchema = z
  .object({
    action: enumSchema(PERMISSION_ACTIONS).optional(),
    description: optionalTrimmedStringSchema,
    displayName: optionalTrimmedStringSchema,
    module: enumSchema(PERMISSION_MODULES).optional()
  })
  .strict()
  .refine(permissionBodyHasUpdate, "At least one field must be provided");

export type CreatePermissionBody = z.infer<typeof createPermissionBodySchema>;
export type PermissionIdParams = z.infer<typeof permissionIdParamsSchema>;
export type PermissionListQuery = z.infer<typeof permissionListQuerySchema>;
export type RolePermissionsParams = z.infer<typeof rolePermissionsParamsSchema>;
export type UpdatePermissionBody = z.infer<typeof updatePermissionBodySchema>;
