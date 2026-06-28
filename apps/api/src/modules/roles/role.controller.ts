import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  createRole,
  getRoleById,
  listRoles,
  updateRole
} from "./role.service";
import type {
  CreateRoleBody,
  RoleIdParams,
  RoleListQuery,
  UpdateRoleBody
} from "./role.validation";

export const listRolesController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<RoleListQuery>(res, "query");
    const result = await listRoles(query);

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createRoleController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<CreateRoleBody>(res, "body");
    const actor = getAuthUser(res);
    const role = await createRole(body, {
      actor,
      actorId: actor?.id,
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ role }));
  }
);

export const getRoleController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const params = getValidated<RoleIdParams>(res, "params");
    const role = await getRoleById(params.id);

    res.status(200).json(ok({ role }));
  }
);

export const updateRoleController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RoleIdParams>(res, "params");
    const body = getValidated<UpdateRoleBody>(res, "body");
    const actor = getAuthUser(res);
    const role = await updateRole(params.id, body, {
      actor,
      actorId: actor?.id,
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ role }));
  }
);
