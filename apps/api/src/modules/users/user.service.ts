import { Types } from "mongoose";

import { env } from "../../config/env";
import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import {
  assertCanAccessUserRecord,
  assertCanAdministerTargetUser,
  assertEnterpriseAdmin,
  isEnterpriseAdmin
} from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import { hashPassword } from "../../shared/auth/passwords";
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
import type { RoleDocument } from "../roles/role.model";

import { serializeUser, type UserDto } from "./user.dto";
import { UserModel } from "./user.model";
import type {
  AssignUserRoleBody,
  CreateUserBody,
  ResetUserPasswordBody,
  UpdateUserBody,
  UpdateUserStatusBody,
  UserListQuery
} from "./user.validation";

export interface UserListResult {
  data: UserDto[];
  pagination: PaginationMeta;
}

export interface UserActionContext {
  actor?: AuthenticatedUserContext;
  actorId?: string;
  auditContext?: AuditRequestContext;
}

const allowedUserSortFields = [
  "fullName",
  "email",
  "status",
  "department",
  "lastLoginAt",
  "createdAt",
  "updatedAt"
] as const;

export async function listUsers(
  query: UserListQuery,
  context: UserActionContext
): Promise<UserListResult> {
  if (!context.actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  const canAdministerUsers = isEnterpriseAdmin(context.actor);

  const filter: Record<string, unknown> = {};

  if (query.department) {
    filter.department = query.department;
  }

  if (query.roleId && canAdministerUsers) {
    filter.roleId = new Types.ObjectId(query.roleId);
  }

  if (canAdministerUsers && query.status) {
    filter.status = query.status;
  } else if (!canAdministerUsers) {
    filter.status = "active";
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [
      { fullName: regex },
      { email: regex },
      { jobTitle: regex },
      { department: regex },
      { phone: regex }
    ];
  }

  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedUserSortFields,
    "fullName"
  );
  const skip = (query.page - 1) * query.limit;
  const [users, totalItems] = await Promise.all([
    UserModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    UserModel.countDocuments(filter)
  ]);

  return {
    data: users.map(serializeUser),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function createUser(
  body: CreateUserBody,
  context: UserActionContext
): Promise<UserDto> {
  return runInTransaction(async () => {
    assertEnterpriseAdmin(context.actor);
    const targetRole = await getRoleOrThrow(body.roleId);
    assertCanAssignRole(targetRole, context.actor);

  try {
    const user = await UserModel.create({
      ...(body.department ? { department: body.department } : {}),
      email: body.email,
      ...(body.employeeId ? { employeeId: body.employeeId } : {}),
      failedLoginCount: 0,
      fullName: body.fullName,
      ...(body.jobTitle ? { jobTitle: body.jobTitle } : {}),
      ...(body.location ? { location: body.location } : {}),
      mustChangePassword: env.FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN,
      ...(body.notes ? { notes: body.notes } : {}),
      passwordHash: await hashPassword(body.password),
      ...(body.phone ? { phone: body.phone } : {}),
      roleId: new Types.ObjectId(body.roleId),
      status: body.status
    });
    const serializedUser = serializeUser(user);

    await persistAuditLog({
      action: "create",
      actorId: context.actorId,
      context: context.auditContext,
      entityId: serializedUser.id,
      entityType: "user",
      newValue: {
        ...serializedUser,
        passwordProvided: true
      }
    });

    return serializedUser;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, "user_already_exists", "User already exists");
    }

    throw error;
    }
  });
}

export async function getUserByIdForActor(
  id: string,
  context: UserActionContext
): Promise<UserDto> {
  const user = await UserModel.findById(id);

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  assertCanAccessUserRecord(user, context.actor);

  return serializeUser(user);
}

export async function updateUser(
  id: string,
  body: UpdateUserBody,
  context: UserActionContext
): Promise<UserDto> {
  return runInTransaction(async () => {
    const user = await UserModel.findById(id);

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  await assertCanAdministerUser(user, context.actor);

  const oldValue = serializeUser(user);

  if (body.department !== undefined) {
    user.department = body.department;
  }

  if (body.employeeId !== undefined) {
    user.employeeId = body.employeeId;
  }

  if (body.fullName !== undefined) {
    user.fullName = body.fullName;
  }

  if (body.jobTitle !== undefined) {
    user.jobTitle = body.jobTitle;
  }

  if (body.location !== undefined) {
    user.location = body.location;
  }

  if (body.notes !== undefined) {
    user.notes = body.notes;
  }

  if (body.phone !== undefined) {
    user.phone = body.phone;
  }

  await user.save();
  const newValue = serializeUser(user);

  await persistAuditLog({
    action: "update",
    actorId: context.actorId,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "user",
    newValue,
    oldValue
  });

    return newValue;
  });
}

export async function updateUserStatus(
  id: string,
  body: UpdateUserStatusBody,
  context: UserActionContext
): Promise<UserDto> {
  return runInTransaction(async () => {
    if (context.actorId === id && body.status !== "active") {
    throw new AppError(
      400,
      "cannot_change_own_status",
      "You cannot disable or suspend your own account"
    );
  }

  const user = await UserModel.findById(id);

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  await assertCanAdministerUser(user, context.actor);

  const oldValue = serializeUser(user);
  user.status = body.status;
  await user.save();
  const newValue = serializeUser(user);

  await persistAuditLog({
    action: "change_status",
    actorId: context.actorId,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "user",
    newValue,
    oldValue
  });

    return newValue;
  });
}

export async function assignUserRole(
  id: string,
  body: AssignUserRoleBody,
  context: UserActionContext
): Promise<UserDto> {
  return runInTransaction(async () => {
    if (context.actorId === id) {
    throw new AppError(
      400,
      "cannot_change_own_role",
      "You cannot change your own role"
    );
  }

  const role = await getRoleOrThrow(body.roleId);
  assertCanAssignRole(role, context.actor);

  const user = await UserModel.findById(id);

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  await assertCanAdministerUser(user, context.actor);

  const oldValue = serializeUser(user);
  user.roleId = new Types.ObjectId(body.roleId);
  await user.save();
  const newValue = serializeUser(user);

  await persistAuditLog({
    action: "assign",
    actorId: context.actorId,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "user",
    newValue,
    oldValue
  });

    return newValue;
  });
}

export async function resetUserPassword(
  id: string,
  body: ResetUserPasswordBody,
  context: UserActionContext
): Promise<UserDto> {
  return runInTransaction(async () => {
    if (context.actorId === id) {
    throw new AppError(
      400,
      "cannot_reset_own_password",
      "Use change password for your own account"
    );
  }

  const user = await UserModel.findById(id).select("+sessionVersion");

  if (!user) {
    throw new AppError(404, "user_not_found", "User not found");
  }

  await assertCanAdministerUser(user, context.actor);

  const oldValue = serializeUser(user);
  user.passwordHash = await hashPassword(body.password);
  user.passwordChangedAt = new Date();
  user.mustChangePassword = body.mustChangePassword;
  user.failedLoginCount = 0;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.set("lockedUntil", undefined);
  await user.save();
  const newValue = serializeUser(user);

  await persistAuditLog({
    action: "password_changed",
    actorId: context.actorId,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "user",
    newValue: {
      ...newValue,
      passwordResetByAdmin: true,
      passwordProvided: true
    },
    oldValue
  });

    return newValue;
  });
}

async function getRoleOrThrow(roleId: string): Promise<RoleDocument> {
  const role = await RoleModel.findById(roleId);

  if (!role) {
    throw new AppError(404, "role_not_found", "Role not found");
  }

  return role;
}

async function assertCanAdministerUser(
  user: Parameters<typeof assertCanAdministerTargetUser>[0],
  actor: AuthenticatedUserContext | undefined
): Promise<void> {
  assertCanAdministerTargetUser(user, actor);
  const targetRole = await getRoleOrThrow(String(user.roleId));

  if (targetRole.name === "super_admin" && actor.roleKey !== "super_admin") {
    throw new AppError(
      403,
      "super_admin_protected",
      "Only Super Admin can administer Super Admin accounts"
    );
  }
}

function assertCanAssignRole(
  role: RoleDocument,
  actor: AuthenticatedUserContext | undefined
): void {
  assertEnterpriseAdmin(actor);

  if (role.name === "super_admin" && actor.roleKey !== "super_admin") {
    throw new AppError(
      403,
      "super_admin_role_protected",
      "Only Super Admin can assign the Super Admin role"
    );
  }
}
