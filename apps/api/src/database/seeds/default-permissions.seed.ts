import {
  createPermissionKey,
  type PermissionAction,
  type PermissionKey,
  type PermissionModule
} from "../../shared/constants/permission.constants";
import type { RoleKey } from "../../shared/constants/role.constants";

export interface DefaultPermissionSeed {
  description: string;
  displayName: string;
  module: PermissionModule;
  name: PermissionKey;
}

type PermissionRequirementSeed = {
  action: PermissionAction;
  module: PermissionModule;
};

const systemAdminPermissions: readonly PermissionRequirementSeed[] = [
  { action: "view", module: "roles" },
  { action: "create", module: "roles" },
  { action: "update", module: "roles" },
  { action: "view", module: "permissions" },
  { action: "create", module: "permissions" },
  { action: "update", module: "permissions" },
  { action: "view", module: "users" },
  { action: "create", module: "users" },
  { action: "update", module: "users" },
  { action: "change_status", module: "users" },
  { action: "assign", module: "users" },
  { action: "view", module: "audit_logs" },
  { action: "view_audit", module: "audit_logs" }
];

const requestPermissions: readonly PermissionRequirementSeed[] = [
  { action: "view", module: "requests" },
  { action: "create", module: "requests" },
  { action: "update", module: "requests" },
  { action: "change_status", module: "requests" },
  { action: "assign", module: "requests" },
  { action: "comment", module: "requests" },
  { action: "view", module: "comments" },
  { action: "create", module: "comments" },
  { action: "update", module: "comments" }
];

const taskManagementPermissions: readonly PermissionRequirementSeed[] = [
  { action: "view", module: "tasks" },
  { action: "create", module: "tasks" },
  { action: "update", module: "tasks" },
  { action: "change_status", module: "tasks" },
  { action: "assign", module: "tasks" },
  { action: "review", module: "tasks" },
  { action: "view", module: "task_updates" },
  { action: "create", module: "task_updates" }
];

const sprintManagementPermissions: readonly PermissionRequirementSeed[] = [
  { action: "view", module: "sprints" },
  { action: "create", module: "sprints" },
  { action: "update", module: "sprints" },
  { action: "change_status", module: "sprints" },
  { action: "assign", module: "sprints" },
  { action: "review", module: "sprints" }
];

const visibilityPermissions: readonly PermissionRequirementSeed[] = [
  { action: "view", module: "dashboard" },
  { action: "view", module: "reports" }
];

const employeePermissions: readonly PermissionRequirementSeed[] = [
  { action: "view", module: "sprints" },
  { action: "view", module: "requests" },
  { action: "comment", module: "requests" },
  { action: "view", module: "tasks" },
  { action: "update", module: "tasks" },
  { action: "change_status", module: "tasks" },
  { action: "view", module: "task_updates" },
  { action: "create", module: "task_updates" },
  { action: "create", module: "comments" },
  { action: "view", module: "reports" }
];

export const defaultPermissionRequirementsByRole: Record<
  RoleKey,
  readonly PermissionRequirementSeed[]
> = {
  employee: employeePermissions,
  it_manager: [
    { action: "view", module: "users" },
    { action: "update", module: "users" },
    ...sprintManagementPermissions,
    ...requestPermissions,
    ...taskManagementPermissions,
    ...visibilityPermissions,
    { action: "view", module: "audit_logs" },
    { action: "view_audit", module: "audit_logs" }
  ],
  supervisor: [
    { action: "view", module: "requests" },
    { action: "create", module: "requests" },
    { action: "update", module: "requests" },
    { action: "change_status", module: "requests" },
    { action: "assign", module: "requests" },
    { action: "comment", module: "requests" },
    { action: "view", module: "sprints" },
    { action: "create", module: "sprints" },
    { action: "update", module: "sprints" },
    { action: "change_status", module: "sprints" },
    { action: "assign", module: "sprints" },
    ...taskManagementPermissions,
    { action: "view", module: "comments" },
    { action: "create", module: "comments" },
    { action: "view", module: "dashboard" },
    { action: "view", module: "reports" }
  ],
  super_admin: [
    ...systemAdminPermissions,
    ...sprintManagementPermissions,
    ...requestPermissions,
    ...taskManagementPermissions,
    ...visibilityPermissions
  ]
};

export function createDefaultPermissionSeed(
  requirement: PermissionRequirementSeed
): DefaultPermissionSeed {
  const permissionKey = createPermissionKey(requirement);
  const readableAction = requirement.action.replaceAll("_", " ");
  const readableModule = requirement.module.replaceAll("_", " ");

  return {
    description: `Allows ${readableAction} access for ${readableModule}.`,
    displayName: `${capitalize(readableAction)} ${readableModule}`,
    module: requirement.module,
    name: permissionKey
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
