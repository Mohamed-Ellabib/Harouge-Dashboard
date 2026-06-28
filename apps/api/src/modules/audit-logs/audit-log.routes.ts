import { Router } from "express";

import { requireAnyPermission } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  getAuditLogController,
  listAuditLogsController
} from "./audit-log.controller";
import {
  auditLogIdParamsSchema,
  auditLogListQuerySchema
} from "./audit-log.validation";

export const auditLogRouter = Router();

const auditLogReadPermissions = [
  { action: "view", module: "audit_logs" },
  { action: "view_audit", module: "audit_logs" }
] as const;

auditLogRouter.get(
  "/",
  requireAnyPermission(auditLogReadPermissions),
  validateRequest({ query: auditLogListQuerySchema }),
  listAuditLogsController
);

auditLogRouter.get(
  "/:id",
  requireAnyPermission(auditLogReadPermissions),
  validateRequest({ params: auditLogIdParamsSchema }),
  getAuditLogController
);
