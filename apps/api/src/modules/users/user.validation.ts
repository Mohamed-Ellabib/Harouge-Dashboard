import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "../../shared/auth/passwords";
import { USER_STATUSES } from "../../shared/constants/user.constants";
import {
  enumSchema,
  mongoObjectIdSchema,
  nonEmptyStringSchema,
  optionalTrimmedStringSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const userBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const userIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const userListQuerySchema = baseListQuerySchema.extend({
  department: optionalTrimmedStringSchema,
  roleId: mongoObjectIdSchema.optional(),
  status: enumSchema(USER_STATUSES).optional()
});

export const createUserBodySchema = z
  .object({
    department: optionalTrimmedStringSchema,
    email: z.email().transform((value) => value.toLowerCase()),
    employeeId: optionalTrimmedStringSchema,
    fullName: nonEmptyStringSchema,
    jobTitle: optionalTrimmedStringSchema,
    location: optionalTrimmedStringSchema,
    notes: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value.length <= 500,
      "Notes must not exceed 500 characters"
    ),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )
      .max(128, "Password must not exceed 128 characters"),
    phone: optionalTrimmedStringSchema,
    roleId: mongoObjectIdSchema,
    status: enumSchema(USER_STATUSES).default("active")
  })
  .strict();

export const updateUserBodySchema = z
  .object({
    department: optionalTrimmedStringSchema,
    employeeId: optionalTrimmedStringSchema,
    fullName: nonEmptyStringSchema.optional(),
    jobTitle: optionalTrimmedStringSchema,
    location: optionalTrimmedStringSchema,
    notes: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value.length <= 500,
      "Notes must not exceed 500 characters"
    ),
    phone: optionalTrimmedStringSchema
  })
  .strict()
  .refine(userBodyHasUpdate, "At least one field must be provided");

export const updateUserStatusBodySchema = z
  .object({
    status: enumSchema(USER_STATUSES)
  })
  .strict();

export const assignUserRoleBodySchema = z
  .object({
    roleId: mongoObjectIdSchema
  })
  .strict();

export const resetUserPasswordBodySchema = z
  .object({
    mustChangePassword: z.boolean().default(true),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )
      .max(128, "Password must not exceed 128 characters")
  })
  .strict();

export type AssignUserRoleBody = z.infer<typeof assignUserRoleBodySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type ResetUserPasswordBody = z.infer<typeof resetUserPasswordBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
