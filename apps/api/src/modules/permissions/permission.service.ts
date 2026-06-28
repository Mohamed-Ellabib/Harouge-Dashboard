import { Types } from "mongoose";

import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import { assertSuperAdmin } from "../../shared/auth/access-policies";
import {
  createPermissionKey,
  type PermissionAction,
  type PermissionModule
} from "../../shared/constants/permission.constants";
import {
  buildSort,
  escapeRegex,
  isDuplicateKeyError,
  runInTransaction
} from "../../shared/database";
import { AppError } from "../../shared/errors/app-error";
import {
  buildPaginationMeta,
  type PaginationMeta
} from "../../shared/pagination/pagination";
import { RoleModel } from "../roles/role.model";
import type { AccessManagementActionContext } from "../roles/role.service";

import { serializePermission, type PermissionDto } from "./permission.dto";
import { PermissionModel } from "./permission.model";
import type {
  CreatePermissionBody,
  PermissionListQuery,
  UpdatePermissionBody
} from "./permission.validation";

export interface PermissionListResult {
  data: PermissionDto[];
  pagination: PaginationMeta;
}

const allowedPermissionSortFields = [
  "name",
  "displayName",
  "module",
  "createdAt",
  "updatedAt"
] as const;

export async function listPermissions(
  query: PermissionListQuery
): Promise<PermissionListResult> {
  const filter = buildPermissionFilter(query);

  return listPermissionsWithFilter(filter, query);
}

export async function listPermissionsForRole(
  roleId: string,
  query: PermissionListQuery
): Promise<PermissionListResult> {
  await assertRoleExists(roleId);

  return listPermissionsWithFilter(
    {
      ...buildPermissionFilter(query),
      roleId: new Types.ObjectId(roleId)
    },
    query
  );
}

export async function createPermission(
  body: CreatePermissionBody,
  context: AccessManagementActionContext
): Promise<PermissionDto> {
  return runInTransaction(async () => {
    assertSuperAdmin(context.actor, "Only Super Admin can create permissions");
    await assertRoleExists(body.roleId);

  const permissionName = createPermissionKey({
    action: body.action,
    module: body.module
  });

  try {
    const permission = await PermissionModel.create({
      description: body.description,
      displayName: body.displayName ?? createPermissionDisplayName(body.module, body.action),
      module: body.module,
      name: permissionName,
      roleId: new Types.ObjectId(body.roleId)
    });
    const serializedPermission = serializePermission(permission);

    await persistAuditLog({
      action: "create",
      actorId: context.actorId,
      context: context.auditContext,
      entityId: serializedPermission.id,
      entityType: "permission",
      newValue: serializedPermission
    });

    return serializedPermission;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        409,
        "permission_already_exists",
        "Permission already exists for this role"
      );
    }

    throw error;
    }
  });
}

export async function getPermissionById(id: string): Promise<PermissionDto> {
  const permission = await PermissionModel.findById(id);

  if (!permission) {
    throw new AppError(404, "permission_not_found", "Permission not found");
  }

  return serializePermission(permission);
}

export async function updatePermission(
  id: string,
  body: UpdatePermissionBody,
  context: AccessManagementActionContext
): Promise<PermissionDto> {
  return runInTransaction(async () => {
    assertSuperAdmin(context.actor, "Only Super Admin can update permissions");

  const permission = await PermissionModel.findById(id);

  if (!permission) {
    throw new AppError(404, "permission_not_found", "Permission not found");
  }

  const oldValue = serializePermission(permission);
  const currentAction = getPermissionAction(permission.name);
  const nextModule = body.module ?? permission.module;
  const nextAction = body.action ?? currentAction;

  permission.module = nextModule;
  permission.name = createPermissionKey({
    action: nextAction,
    module: nextModule
  });

  if (body.description !== undefined) {
    permission.description = body.description;
  }

  if (body.displayName !== undefined) {
    permission.displayName = body.displayName;
  } else if (body.action || body.module) {
    permission.displayName = createPermissionDisplayName(nextModule, nextAction);
  }

  try {
    await permission.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        409,
        "permission_already_exists",
        "Permission already exists for this role"
      );
    }

    throw error;
  }

  const newValue = serializePermission(permission);

  await persistAuditLog({
    action: "update",
    actorId: context.actorId,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "permission",
    newValue,
    oldValue
  });

    return newValue;
  });
}

async function listPermissionsWithFilter(
  filter: Record<string, unknown>,
  query: PermissionListQuery
): Promise<PermissionListResult> {
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedPermissionSortFields,
    "module"
  );
  const skip = (query.page - 1) * query.limit;
  const [permissions, totalItems] = await Promise.all([
    PermissionModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    PermissionModel.countDocuments(filter)
  ]);

  return {
    data: permissions.map(serializePermission),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

function buildPermissionFilter(query: PermissionListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.module) {
    filter.module = query.module;
  }

  if (query.roleId) {
    filter.roleId = new Types.ObjectId(query.roleId);
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: regex }, { displayName: regex }, { description: regex }];
  }

  return filter;
}

async function assertRoleExists(roleId: string): Promise<void> {
  const roleExists = await RoleModel.exists({ _id: roleId });

  if (!roleExists) {
    throw new AppError(404, "role_not_found", "Role not found");
  }
}

function createPermissionDisplayName(
  module: PermissionModule,
  action: PermissionAction
): string {
  return `${capitalize(action.replaceAll("_", " "))} ${module.replaceAll("_", " ")}`;
}

function getPermissionAction(permissionName: string): PermissionAction {
  const action = permissionName.split(":")[1] as PermissionAction | undefined;

  if (!action) {
    throw new AppError(500, "invalid_permission_key", "Invalid permission key");
  }

  return action;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
