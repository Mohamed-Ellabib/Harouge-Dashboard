import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  createSprint,
  getSprintByIdForActor,
  listSprints,
  updateSprint
} from "./sprint.service";
import type {
  CreateSprintBody,
  SprintIdParams,
  SprintListQuery,
  UpdateSprintBody
} from "./sprint.validation";

export const listSprintsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = getValidated<SprintListQuery>(res, "query");
    const result = await listSprints(query, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createSprintController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<CreateSprintBody>(res, "body");
    const sprint = await createSprint(body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ sprint }));
  }
);

export const getSprintController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<SprintIdParams>(res, "params");
    const sprint = await getSprintByIdForActor(params.id, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ sprint }));
  }
);

export const updateSprintController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<SprintIdParams>(res, "params");
    const body = getValidated<UpdateSprintBody>(res, "body");
    const sprint = await updateSprint(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ sprint }));
  }
);
