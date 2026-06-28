export const PERMISSION_MODULES = [
  "roles",
  "permissions",
  "users",
  "sprints",
  "requests",
  "tasks",
  "task_updates",
  "comments",
  "audit_logs",
  "dashboard",
  "reports"
] as const;

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "update",
  "change_status",
  "assign",
  "review",
  "comment",
  "view_audit"
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionKey = `${PermissionModule}:${PermissionAction}`;

export const PERMISSION_KEYS = PERMISSION_MODULES.flatMap((module) =>
  PERMISSION_ACTIONS.map((action) => createPermissionKey({ action, module }))
) as PermissionKey[];

export interface PermissionRequirement {
  action: PermissionAction;
  module: PermissionModule;
}

export function createPermissionKey(
  requirement: PermissionRequirement
): PermissionKey {
  return `${requirement.module}:${requirement.action}`;
}
