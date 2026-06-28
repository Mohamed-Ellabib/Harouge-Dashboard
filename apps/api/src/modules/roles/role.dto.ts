import type { Role, RoleDocument } from "./role.model";

export interface RoleDto {
  createdAt?: Date;
  description?: string;
  displayName: string;
  id: string;
  isSystem: boolean;
  name: Role["name"];
  updatedAt?: Date;
}

export function serializeRole(role: RoleDocument): RoleDto {
  return {
    ...(role.createdAt ? { createdAt: role.createdAt } : {}),
    ...(role.description ? { description: role.description } : {}),
    displayName: role.displayName,
    id: String(role._id),
    isSystem: role.isSystem,
    name: role.name,
    ...(role.updatedAt ? { updatedAt: role.updatedAt } : {})
  };
}
