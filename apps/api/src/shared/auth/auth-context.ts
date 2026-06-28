import type { PermissionKey } from "../constants/permission.constants";
import type { RoleKey } from "../constants/role.constants";

export interface AuthenticatedUserContext {
  email: string;
  department?: string;
  fullName: string;
  id: string;
  mustChangePassword: boolean;
  permissions: readonly PermissionKey[];
  roleId: string;
  roleKey: RoleKey;
  status: "active";
}
