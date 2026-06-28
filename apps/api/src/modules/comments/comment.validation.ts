import { z } from "zod";

import {
  mongoObjectIdSchema,
  nonEmptyStringSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const commentBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

export const commentIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const requestCommentListQuerySchema = baseListQuerySchema;

export const createRequestCommentBodySchema = z
  .object({
    body: nonEmptyStringSchema,
    isInternal: z.boolean().default(false)
  })
  .strict();

export const updateCommentBodySchema = z
  .object({
    body: nonEmptyStringSchema.optional(),
    isInternal: z.boolean().optional()
  })
  .strict()
  .refine(commentBodyHasUpdate, "At least one field must be provided");

export type CommentIdParams = z.infer<typeof commentIdParamsSchema>;
export type CreateRequestCommentBody = z.infer<
  typeof createRequestCommentBodySchema
>;
export type RequestCommentListQuery = z.infer<
  typeof requestCommentListQuerySchema
>;
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>;
