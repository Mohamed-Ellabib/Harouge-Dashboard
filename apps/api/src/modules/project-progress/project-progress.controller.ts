import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";
import {
  getProjectProgress,
  updateProjectProgress
} from "./project-progress.service";
import type { UpdateProjectProgressBody } from "./project-progress.validation";

export const getProjectProgressController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const projectProgress = await getProjectProgress({
      actor: getAuthUser(res)
    });

    res.status(200).json(ok({ projectProgress }));
  }
);

export const updateProjectProgressController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<UpdateProjectProgressBody>(res, "body");
    const projectProgress = await updateProjectProgress(body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ projectProgress }));
  }
);
