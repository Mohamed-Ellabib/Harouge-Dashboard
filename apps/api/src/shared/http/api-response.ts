import type { PaginationMeta } from "../pagination/pagination";

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<TData>(
  data: TData,
  options: { message?: string; meta?: Record<string, unknown> } = {}
): ApiSuccessResponse<TData> {
  return {
    success: true,
    data,
    ...(options.message ? { message: options.message } : {}),
    ...(options.meta ? { meta: options.meta } : {})
  };
}

export function paginatedOk<TItem>(
  data: TItem[],
  pagination: PaginationMeta,
  options: { message?: string; meta?: Record<string, unknown> } = {}
): ApiSuccessResponse<TItem[]> {
  return ok(data, {
    ...options,
    meta: {
      ...(options.meta ?? {}),
      pagination
    }
  });
}

export function fail(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };
}
