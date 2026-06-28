import { Router } from "express";

import { requirePermission } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  getDashboardActivityController,
  getDashboardOverviewController,
  getDashboardSummaryController
} from "./dashboard.controller";
import { dashboardActivityQuerySchema } from "./dashboard.validation";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/overview",
  requirePermission({ action: "view", module: "dashboard" }),
  getDashboardOverviewController
);

dashboardRouter.get(
  "/summary",
  requirePermission({ action: "view", module: "dashboard" }),
  getDashboardSummaryController
);

dashboardRouter.get(
  "/activity",
  requirePermission({ action: "view", module: "dashboard" }),
  validateRequest({ query: dashboardActivityQuerySchema }),
  getDashboardActivityController
);
