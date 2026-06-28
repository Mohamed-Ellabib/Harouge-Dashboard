export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSort(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc",
  allowedSortFields: readonly string[],
  defaultSortBy: string
): Record<string, 1 | -1> {
  const field =
    sortBy && allowedSortFields.includes(sortBy) ? sortBy : defaultSortBy;

  return {
    [field]: sortOrder === "asc" ? 1 : -1
  };
}
