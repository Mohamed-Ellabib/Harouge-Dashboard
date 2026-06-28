import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  createPermission,
  getPermissionById,
  listPermissions,
  listPermissionsForRole,
  updatePermission
} from "./permission.service";
import type {
  CreatePermissionBody,
  PermissionIdParams,
  PermissionListQuery,
  RolePermissionsParams,
  UpdatePermissionBody
} from "./permission.validation";

export const listPermissionsController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<PermissionListQuery>(res, "query");
    const result = await listPermissions(query);

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const listRolePermissionsController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const params = getValidated<RolePermissionsParams>(res, "params");
    const query = getValidated<PermissionListQuery>(res, "query");
    const result = await listPermissionsForRole(params.id, query);

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createPermissionController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<CreatePermissionBody>(res, "body");
    const actor = getAuthUser(res);
    const permission = await createPermission(body, {
      actor,
      actorId: actor?.id,
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ permission }));
  }
);

export const getPermissionController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const params = getValidated<PermissionIdParams>(res, "params");
    const permission = await getPermissionById(params.id);

    res.status(200).json(ok({ permission }));
  }
);

export const updatePermissionController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<PermissionIdParams>(res, "params");
    const body = getValidated<UpdatePermissionBody>(res, "body");
    const actor = getAuthUser(res);
    const permission = await updatePermission(params.id, body, {
      actor,
      actorId: actor?.id,
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ permission }));
  }
);
