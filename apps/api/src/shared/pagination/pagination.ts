import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const sortOrderSchema = z.enum(["asc", "desc"]);

export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  sortBy: z.string().trim().min(1).optional(),
  sortOrder: sortOrderSchema.default("desc")
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationOptions extends PaginationQuery {
  skip: number;
}

export interface PaginationMeta {
  hasNextPage?: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  totalItems?: number;
  totalPages?: number;
}

export function parsePaginationQuery(query: unknown): PaginationOptions {
  const parsed = paginationQuerySchema.parse(query);

  return {
    ...parsed,
    skip: (parsed.page - 1) * parsed.limit
  };
}

export function buildPaginationMeta(options: {
  limit: number;
  page: number;
  totalItems?: number;
}): PaginationMeta {
  const totalPages =
    typeof options.totalItems === "number"
      ? Math.ceil(options.totalItems / options.limit)
      : undefined;

  return {
    hasNextPage:
      typeof totalPages === "number" ? options.page < totalPages : undefined,
    hasPreviousPage: options.page > 1,
    limit: options.limit,
    page: options.page,
    ...(typeof options.totalItems === "number"
      ? { totalItems: options.totalItems }
      : {}),
    ...(typeof totalPages === "number" ? { totalPages } : {})
  };
}
