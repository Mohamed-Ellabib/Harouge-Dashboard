import type { PermissionDocument } from "./permission.model";

export interface PermissionDto {
  createdAt?: Date;
  description?: string;
  displayName: string;
  id: string;
  module: string;
  name: string;
  roleId: string;
  updatedAt?: Date;
}

export function serializePermission(permission: PermissionDocument): PermissionDto {
  return {
    ...(permission.createdAt ? { createdAt: permission.createdAt } : {}),
    ...(permission.description ? { description: permission.description } : {}),
    displayName: permission.displayName,
    id: String(permission._id),
    module: permission.module,
    name: permission.name,
    roleId: String(permission.roleId),
    ...(permission.updatedAt ? { updatedAt: permission.updatedAt } : {})
  };
}
