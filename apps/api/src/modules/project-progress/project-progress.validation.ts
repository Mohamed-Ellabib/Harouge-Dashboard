import { z } from "zod";

import { optionalTrimmedStringSchema } from "../../shared/validation/common-schemas";
import { projectProgressTimelineStageStatuses } from "./project-progress.model";

const projectProgressBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

const projectProgressTimelineStageSchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format"),
    id: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().min(1).max(80),
    status: z.enum(projectProgressTimelineStageStatuses)
  })
  .strict();

export const updateProjectProgressBodySchema = z
  .object({
    note: optionalTrimmedStringSchema,
    percentage: z.coerce.number().int().min(0).max(100).optional(),
    timelineStages: z.array(projectProgressTimelineStageSchema).min(1).max(10).optional()
  })
  .strict()
  .refine(projectProgressBodyHasUpdate, "At least one field must be provided");

export type UpdateProjectProgressBody = z.infer<
  typeof updateProjectProgressBodySchema
>;
