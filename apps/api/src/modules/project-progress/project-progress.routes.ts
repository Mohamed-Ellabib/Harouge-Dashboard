import { Router } from "express";

import { requirePermission } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";
import {
  getProjectProgressController,
  updateProjectProgressController
} from "./project-progress.controller";
import { updateProjectProgressBodySchema } from "./project-progress.validation";

export const projectProgressRouter = Router();

projectProgressRouter.get(
  "/",
  requirePermission({ action: "view", module: "dashboard" }),
  getProjectProgressController
);

projectProgressRouter.patch(
  "/",
  requirePermission({ action: "update", module: "sprints" }),
  validateRequest({ body: updateProjectProgressBodySchema }),
  updateProjectProgressController
);
