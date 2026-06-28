import { z } from "zod";

import { paginationQuerySchema } from "../pagination/pagination";

export const searchQuerySchema = z.object({
  search: z.string().trim().min(1).optional()
});

export const dateRangeQuerySchema = z
  .object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  })
  .refine(
    (value) => {
      if (!value.dateFrom || !value.dateTo) {
        return true;
      }

      return Date.parse(value.dateFrom) <= Date.parse(value.dateTo);
    },
    {
      message: "`dateFrom` must be before or equal to `dateTo`",
      path: ["dateFrom"]
    }
  );

export const baseListQuerySchema = paginationQuerySchema
  .merge(searchQuerySchema)
  .merge(dateRangeQuerySchema);

export type BaseListQuery = z.infer<typeof baseListQuerySchema>;
