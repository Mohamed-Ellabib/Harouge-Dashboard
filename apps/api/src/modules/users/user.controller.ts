import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  assignUserRole,
  createUser,
  getUserByIdForActor,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus
} from "./user.service";
import type {
  AssignUserRoleBody,
  CreateUserBody,
  ResetUserPasswordBody,
  UpdateUserBody,
  UpdateUserStatusBody,
  UserIdParams,
  UserListQuery
} from "./user.validation";

export const listUsersController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<UserListQuery>(res, "query");
    const result = await listUsers(query, {
      actor: getAuthUser(res),
      actorId: getAuthUser(res)?.id
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createUserController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<CreateUserBody>(res, "body");
    const user = await createUser(body, {
      actorId: getAuthUser(res)?.id,
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ user }));
  }
);

export const getUserController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const params = getValidated<UserIdParams>(res, "params");
    const user = await getUserByIdForActor(params.id, {
      actor: getAuthUser(res),
      actorId: getAuthUser(res)?.id
    });

    res.status(200).json(ok({ user }));
  }
);

export const updateUserController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<UserIdParams>(res, "params");
    const body = getValidated<UpdateUserBody>(res, "body");
    const user = await updateUser(params.id, body, {
      actorId: getAuthUser(res)?.id,
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ user }));
  }
);

export const updateUserStatusController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<UserIdParams>(res, "params");
    const body = getValidated<UpdateUserStatusBody>(res, "body");
    const user = await updateUserStatus(params.id, body, {
      actorId: getAuthUser(res)?.id,
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ user }));
  }
);

export const assignUserRoleController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<UserIdParams>(res, "params");
    const body = getValidated<AssignUserRoleBody>(res, "body");
    const user = await assignUserRole(params.id, body, {
      actorId: getAuthUser(res)?.id,
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ user }));
  }
);

export const resetUserPasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<UserIdParams>(res, "params");
    const body = getValidated<ResetUserPasswordBody>(res, "body");
    const user = await resetUserPassword(params.id, body, {
      actorId: getAuthUser(res)?.id,
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ user }));
  }
);
