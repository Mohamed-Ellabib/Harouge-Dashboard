import { z } from "zod";

import {
  PRIORITIES,
  REQUEST_STATUSES,
  REQUEST_TYPES
} from "../../shared/constants/request.constants";
import {
  enumSchema,
  mongoObjectIdSchema,
  nonEmptyStringSchema,
  optionalTrimmedStringSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const requestBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const requestIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const requestListQuerySchema = baseListQuerySchema
  .extend({
    assignedTo: mongoObjectIdSchema.optional(),
    priority: enumSchema(PRIORITIES).optional(),
    requestedBy: mongoObjectIdSchema.optional(),
    requestedForDepartment: optionalTrimmedStringSchema,
    requiredDateFrom: z.string().datetime().optional(),
    requiredDateTo: z.string().datetime().optional(),
    status: enumSchema(REQUEST_STATUSES).optional(),
    type: enumSchema(REQUEST_TYPES).optional()
  })
  .refine(
    (value) => {
      if (!value.requiredDateFrom || !value.requiredDateTo) {
        return true;
      }

      return Date.parse(value.requiredDateFrom) <= Date.parse(value.requiredDateTo);
    },
    {
      message: "`requiredDateFrom` must be before or equal to `requiredDateTo`",
      path: ["requiredDateFrom"]
    }
  );

export const createRequestBodySchema = z
  .object({
    description: optionalTrimmedStringSchema,
    priority: enumSchema(PRIORITIES).default("medium"),
    requestedForDepartment: optionalTrimmedStringSchema,
    requiredDate: z.string().datetime().optional(),
    title: nonEmptyStringSchema,
    type: enumSchema(REQUEST_TYPES).default("support")
  })
  .strict();

export const updateRequestBodySchema = z
  .object({
    description: optionalTrimmedStringSchema,
    priority: enumSchema(PRIORITIES).optional(),
    requestedForDepartment: optionalTrimmedStringSchema,
    requiredDate: z.string().datetime().optional(),
    title: nonEmptyStringSchema.optional(),
    type: enumSchema(REQUEST_TYPES).optional()
  })
  .strict()
  .refine(requestBodyHasUpdate, "At least one field must be provided");

export const changeRequestStatusBodySchema = z
  .object({
    status: enumSchema(REQUEST_STATUSES)
  })
  .strict();

export const assignRequestBodySchema = z
  .object({
    assignedTo: mongoObjectIdSchema
  })
  .strict();

export type AssignRequestBody = z.infer<typeof assignRequestBodySchema>;
export type ChangeRequestStatusBody = z.infer<
  typeof changeRequestStatusBodySchema
>;
export type CreateRequestBody = z.infer<typeof createRequestBodySchema>;
export type RequestIdParams = z.infer<typeof requestIdParamsSchema>;
export type RequestListQuery = z.infer<typeof requestListQuerySchema>;
export type UpdateRequestBody = z.infer<typeof updateRequestBodySchema>;
