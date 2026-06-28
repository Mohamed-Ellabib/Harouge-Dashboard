import type { PaginationOptions } from "../pagination/pagination";

export type SortDirection = "asc" | "desc";

export interface SortOptions<TSortField extends string = string> {
  direction: SortDirection;
  field: TSortField;
}

export interface ListOptions<
  TFilter extends Record<string, unknown> = Record<string, unknown>,
  TSortField extends string = string
> {
  filter?: TFilter;
  pagination: PaginationOptions;
  sort?: SortOptions<TSortField>;
}

export interface ListResult<TEntity> {
  items: TEntity[];
  totalItems: number;
}

export interface RepositoryWriteOptions {
  actorId?: string;
  requestId?: string;
}
