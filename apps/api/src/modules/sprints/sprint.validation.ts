import { z } from "zod";

import {
  SPRINT_AREAS,
  SPRINT_STATUSES
} from "../../shared/constants/sprint.constants";
import {
  enumSchema,
  mongoObjectIdSchema,
  nonEmptyStringSchema,
  optionalTrimmedStringSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const progressTargetSchema = z.coerce.number().int().min(0).max(100);

export const sprintIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const sprintListQuerySchema = baseListQuerySchema.safeExtend({
  ownerId: mongoObjectIdSchema.optional(),
  sprintArea: enumSchema(SPRINT_AREAS).optional(),
  status: enumSchema(SPRINT_STATUSES).optional()
});

export const createSprintBodySchema = z
  .object({
    active: z.boolean().default(false),
    code: nonEmptyStringSchema.max(24),
    description: optionalTrimmedStringSchema,
    name: nonEmptyStringSchema.max(120),
    notifyLater: z.boolean().default(false),
    ownerId: mongoObjectIdSchema,
    progressTarget: progressTargetSchema,
    sprintArea: enumSchema(SPRINT_AREAS),
    startDate: z.string().datetime(),
    status: enumSchema(SPRINT_STATUSES).default("planned"),
    targetDate: z.string().datetime()
  })
  .strict()
  .refine(
    (value) => Date.parse(value.startDate) <= Date.parse(value.targetDate),
    {
      message: "`startDate` must be before or equal to `targetDate`",
      path: ["targetDate"]
    }
  );

const sprintBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const updateSprintBodySchema = z
  .object({
    active: z.boolean().optional(),
    code: nonEmptyStringSchema.max(24).optional(),
    description: optionalTrimmedStringSchema,
    name: nonEmptyStringSchema.max(120).optional(),
    notifyLater: z.boolean().optional(),
    ownerId: mongoObjectIdSchema.optional(),
    progressTarget: progressTargetSchema.optional(),
    sprintArea: enumSchema(SPRINT_AREAS).optional(),
    startDate: z.string().datetime().optional(),
    status: enumSchema(SPRINT_STATUSES).optional(),
    targetDate: z.string().datetime().optional()
  })
  .strict()
  .refine(sprintBodyHasUpdate, "At least one field must be provided")
  .refine(
    (value) => {
      if (!value.startDate || !value.targetDate) {
        return true;
      }

      return Date.parse(value.startDate) <= Date.parse(value.targetDate);
    },
    {
      message: "`startDate` must be before or equal to `targetDate`",
      path: ["targetDate"]
    }
  );

export type CreateSprintBody = z.infer<typeof createSprintBodySchema>;
export type SprintIdParams = z.infer<typeof sprintIdParamsSchema>;
export type SprintListQuery = z.infer<typeof sprintListQuerySchema>;
export type UpdateSprintBody = z.infer<typeof updateSprintBodySchema>;
