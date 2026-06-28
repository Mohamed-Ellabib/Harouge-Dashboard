import { z } from "zod";

import { optionalTrimmedStringSchema } from "../../shared/validation/common-schemas";

const projectProgressBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const updateProjectProgressBodySchema = z
  .object({
    note: optionalTrimmedStringSchema,
    percentage: z.coerce.number().int().min(0).max(100).optional()
  })
  .strict()
  .refine(projectProgressBodyHasUpdate, "At least one field must be provided");

export type UpdateProjectProgressBody = z.infer<
  typeof updateProjectProgressBodySchema
>;
