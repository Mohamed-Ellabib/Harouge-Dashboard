import { api, type ModuleProgressRecord, type TaskReportRow } from "../../api/client";
import type { TaskModuleDefinition } from "./taskModules";

export function moduleProgressKey(module: string, subModule?: string): string {
  return JSON.stringify([module, subModule ?? null]);
}

export function mergeProgressCatalog(catalog: TaskModuleDefinition[], items: TaskReportRow[], saved: ModuleProgressRecord[]): TaskModuleDefinition[] {
  const modules = new Map<string, Set<string>>();
  const add = (name: string, sub?: string) => {
    if (!modules.has(name)) modules.set(name, new Set());
    if (sub) modules.get(name)!.add(sub);
  };
  for (const module of catalog) {
    add(module.name);
    for (const sub of module.subModules) add(module.name, sub);
  }
  for (const item of items) if (item.mainModule?.trim()) add(item.mainModule.trim(), item.subModule?.trim());
  for (const entry of saved) add(entry.module, entry.subModule);
  return [...modules].map(([name, subs]) => ({ name, subModules: [...subs] }));
}

export async function loadProgressTasks(): Promise<TaskReportRow[]> {
  const items: TaskReportRow[] = [];
  for (let page = 1; ; page++) {
    const result = await api.getTaskReport({ limit: 100, page, sortBy: "createdAt", sortOrder: "asc" });
    items.push(...result.data);
    if (!(result.pagination.hasNextPage ?? (page < (result.pagination.totalPages ?? page)))) return items;
  }
}
