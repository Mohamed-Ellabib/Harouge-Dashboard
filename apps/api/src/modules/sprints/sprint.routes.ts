import { Router } from "express";

import { requirePermission } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  createSprintController,
  getSprintController,
  listSprintsController,
  updateSprintController
} from "./sprint.controller";
import {
  createSprintBodySchema,
  sprintIdParamsSchema,
  sprintListQuerySchema,
  updateSprintBodySchema
} from "./sprint.validation";

export const sprintRouter = Router();

sprintRouter.get(
  "/",
  requirePermission({ action: "view", module: "sprints" }),
  validateRequest({ query: sprintListQuerySchema }),
  listSprintsController
);

sprintRouter.post(
  "/",
  requirePermission({ action: "create", module: "sprints" }),
  validateRequest({ body: createSprintBodySchema }),
  createSprintController
);

sprintRouter.get(
  "/:id",
  requirePermission({ action: "view", module: "sprints" }),
  validateRequest({ params: sprintIdParamsSchema }),
  getSprintController
);

sprintRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "sprints" }),
  validateRequest({
    body: updateSprintBodySchema,
    params: sprintIdParamsSchema
  }),
  updateSprintController
);
