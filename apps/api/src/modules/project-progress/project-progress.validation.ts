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
    modulePercentages: z.array(z.object({
      module: z.string().trim().min(1).max(120),
      subModule: z.string().trim().min(1).max(120).optional(),
      percentage: z.number().int().min(0).max(100)
    }).strict()).max(2000).refine((entries) => {
      const keys = entries.map((entry) => JSON.stringify([entry.module, entry.subModule ?? null]));
      return new Set(keys).size === keys.length;
    }, "Each module or submodule can appear only once.").optional(),
    sprintPercentages: z.object({
      development: z.number().int().min(0).max(100),
      facility: z.number().int().min(0).max(100),
      infrastructure: z.number().int().min(0).max(100),
      master_data_collection: z.number().int().min(0).max(100)
    }).strict().optional(),
    percentage: z.coerce.number().int().min(0).max(100).optional(),
    timelineStages: z.array(projectProgressTimelineStageSchema).min(1).max(10).optional()
  })
  .strict()
  .refine(projectProgressBodyHasUpdate, "At least one field must be provided");

export type UpdateProjectProgressBody = z.infer<
  typeof updateProjectProgressBodySchema
>;
