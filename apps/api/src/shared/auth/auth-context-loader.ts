import { PermissionModel } from "../../modules/permissions/permission.model";
import { RoleModel } from "../../modules/roles/role.model";
import { UserModel } from "../../modules/users/user.model";
import type { PermissionKey } from "../constants/permission.constants";

import type { AuthenticatedUserContext } from "./auth-context";

export async function loadAuthenticatedUserContext(
  userId: string,
  sessionIssuedAt: number,
  sessionVersion: number
): Promise<AuthenticatedUserContext | undefined> {
  const user = await UserModel.findById(userId).select("+sessionVersion");

  if (!user || user.status !== "active") {
    return undefined;
  }

  if ((user.sessionVersion ?? 0) !== sessionVersion) {
    return undefined;
  }

  if (
    user.passwordChangedAt &&
    sessionIssuedAt < user.passwordChangedAt.getTime()
  ) {
    return undefined;
  }

  const role = await RoleModel.findById(user.roleId);

  if (!role) {
    return undefined;
  }

  const permissions = await PermissionModel.find({ roleId: role._id }).select("name");

  return {
    ...(user.department ? { department: user.department } : {}),
    email: user.email,
    fullName: user.fullName,
    id: String(user._id),
    mustChangePassword: user.mustChangePassword,
    permissions: permissions.map((permission) => permission.name as PermissionKey),
    roleId: String(role._id),
    roleKey: role.name,
    status: "active"
  };
}
