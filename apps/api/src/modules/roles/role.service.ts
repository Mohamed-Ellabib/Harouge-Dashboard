import { ROLE_DISPLAY_NAMES } from "../../shared/constants/role.constants";
import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import { assertSuperAdmin } from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import {
  buildPaginationMeta,
  type PaginationMeta
} from "../../shared/pagination/pagination";
import {
  buildSort,
  escapeRegex,
  isDuplicateKeyError,
  runInTransaction
} from "../../shared/database";
import { AppError } from "../../shared/errors/app-error";

import { RoleModel } from "./role.model";
import { serializeRole, type RoleDto } from "./role.dto";
import type {
  CreateRoleBody,
  RoleListQuery,
  UpdateRoleBody
} from "./role.validation";

export interface RoleListResult {
  data: RoleDto[];
  pagination: PaginationMeta;
}

export interface AccessManagementActionContext {
  actor?: AuthenticatedUserContext;
  actorId?: string;
  auditContext?: AuditRequestContext;
}

const allowedRoleSortFields = [
  "name",
  "displayName",
  "createdAt",
  "updatedAt"
] as const;

export async function listRoles(query: RoleListQuery): Promise<RoleListResult> {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: regex }, { displayName: regex }, { description: regex }];
  }

  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedRoleSortFields,
    "displayName"
  );
  const skip = (query.page - 1) * query.limit;
  const [roles, totalItems] = await Promise.all([
    RoleModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    RoleModel.countDocuments(filter)
  ]);

  return {
    data: roles.map(serializeRole),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function createRole(
  body: CreateRoleBody,
  context: AccessManagementActionContext
): Promise<RoleDto> {
  return runInTransaction(async () => {
    assertSuperAdmin(context.actor, "Only Super Admin can create roles");

  try {
    const role = await RoleModel.create({
      description: body.description,
      displayName: body.displayName ?? ROLE_DISPLAY_NAMES[body.name],
      isSystem: false,
      name: body.name
    });
    const serializedRole = serializeRole(role);

    await persistAuditLog({
      action: "create",
      actorId: context.actorId,
      context: context.auditContext,
      entityId: serializedRole.id,
      entityType: "role",
      newValue: serializedRole
    });

    return serializedRole;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, "role_already_exists", "Role already exists");
    }

    throw error;
    }
  });
}

export async function getRoleById(id: string): Promise<RoleDto> {
  const role = await RoleModel.findById(id);

  if (!role) {
    throw new AppError(404, "role_not_found", "Role not found");
  }

  return serializeRole(role);
}

export async function updateRole(
  id: string,
  body: UpdateRoleBody,
  context: AccessManagementActionContext
): Promise<RoleDto> {
  return runInTransaction(async () => {
    assertSuperAdmin(context.actor, "Only Super Admin can update roles");

  const role = await RoleModel.findById(id);

  if (!role) {
    throw new AppError(404, "role_not_found", "Role not found");
  }

  const oldValue = serializeRole(role);

  if (body.description !== undefined) {
    role.description = body.description;
  }

  if (body.displayName !== undefined) {
    role.displayName = body.displayName;
  }

  await role.save();
  const newValue = serializeRole(role);

  await persistAuditLog({
    action: "update",
    actorId: context.actorId,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "role",
    newValue,
    oldValue
  });

    return newValue;
  });
}
