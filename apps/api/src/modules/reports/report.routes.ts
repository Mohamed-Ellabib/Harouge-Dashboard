import { Router } from "express";

import { requirePermission } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  listRequestReportController,
  listTaskReportController
} from "./report.controller";
import {
  requestReportQuerySchema,
  taskReportQuerySchema
} from "./report.validation";

export const reportRouter = Router();

reportRouter.get(
  "/requests",
  requirePermission({ action: "view", module: "reports" }),
  validateRequest({ query: requestReportQuerySchema }),
  listRequestReportController
);

reportRouter.get(
  "/tasks",
  requirePermission({ action: "view", module: "reports" }),
  validateRequest({ query: taskReportQuerySchema }),
  listTaskReportController
);
