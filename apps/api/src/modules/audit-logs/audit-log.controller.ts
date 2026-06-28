import type { RequestHandler } from "express";

import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import { getAuditLogById, listAuditLogs } from "./audit-log.service";
import type {
  AuditLogIdParams,
  AuditLogListQuery
} from "./audit-log.validation";

export const listAuditLogsController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<AuditLogListQuery>(res, "query");
    const result = await listAuditLogs(query, {
      actor: getAuthUser(res)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const getAuditLogController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const params = getValidated<AuditLogIdParams>(res, "params");
    const auditLog = await getAuditLogById(params.id, {
      actor: getAuthUser(res)
    });

    res.status(200).json(ok({ auditLog }));
  }
);
