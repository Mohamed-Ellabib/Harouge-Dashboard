import type { RequestHandler } from "express";

import {
  createPermissionKey,
  type PermissionRequirement
} from "../shared/constants/permission.constants";
import type { RoleKey } from "../shared/constants/role.constants";
import { AppError } from "../shared/errors/app-error";
import { getAuthUser } from "../shared/auth/auth-access";
import type { AuthenticatedUserContext } from "../shared/auth/auth-context";

export function isSuperAdmin(user: AuthenticatedUserContext): boolean {
  return user.roleKey === "super_admin";
}

export function hasPermission(
  user: AuthenticatedUserContext,
  requirement: PermissionRequirement
): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }

  return user.permissions.includes(createPermissionKey(requirement));
}

export const requireAuthentication: RequestHandler = (_req, res, next) => {
  if (!getAuthUser(res)) {
    next(new AppError(401, "authentication_required", "Authentication is required"));
    return;
  }

  next();
};

export function requireRole(roleKey: RoleKey): RequestHandler {
  return (_req, res, next) => {
    const authUser = getAuthUser(res);

    if (!authUser) {
      next(new AppError(401, "authentication_required", "Authentication is required"));
      return;
    }

    if (authUser.roleKey !== roleKey) {
      next(new AppError(403, "role_denied", "Role access denied"));
      return;
    }

    next();
  };
}

export function requireAnyRole(roleKeys: readonly RoleKey[]): RequestHandler {
  return (_req, res, next) => {
    const authUser = getAuthUser(res);

    if (!authUser) {
      next(new AppError(401, "authentication_required", "Authentication is required"));
      return;
    }

    if (!roleKeys.includes(authUser.roleKey)) {
      next(new AppError(403, "role_denied", "Role access denied"));
      return;
    }

    next();
  };
}

export function requirePermission(
  requirement: PermissionRequirement
): RequestHandler {
  return (_req, res, next) => {
    const authUser = getAuthUser(res);

    if (!authUser) {
      next(new AppError(401, "authentication_required", "Authentication is required"));
      return;
    }

    if (!hasPermission(authUser, requirement)) {
      next(new AppError(403, "permission_denied", "Permission denied"));
      return;
    }

    next();
  };
}

export function requireAnyPermission(
  requirements: readonly PermissionRequirement[]
): RequestHandler {
  return (_req, res, next) => {
    const authUser = getAuthUser(res);

    if (!authUser) {
      next(new AppError(401, "authentication_required", "Authentication is required"));
      return;
    }

    const allowed = requirements.some((requirement) =>
      hasPermission(authUser, requirement)
    );

    if (!allowed) {
      next(new AppError(403, "permission_denied", "Permission denied"));
      return;
    }

    next();
  };
}
