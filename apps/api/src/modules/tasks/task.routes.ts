import { Router } from "express";

import {
  requireAnyPermission,
  requirePermission
} from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  changeTaskStatusController,
  createTaskController,
  deleteTaskController,
  getTaskController,
  listTaskUpdatesController,
  listTasksController,
  reassignTaskController,
  updateTaskController,
  updateTaskProgressController
} from "./task.controller";
import {
  changeTaskStatusBodySchema,
  createTaskBodySchema,
  reassignTaskBodySchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  taskUpdateListQuerySchema,
  updateTaskBodySchema,
  updateTaskProgressBodySchema
} from "./task.validation";

export const taskRouter = Router();

taskRouter.get(
  "/",
  requirePermission({ action: "view", module: "tasks" }),
  validateRequest({ query: taskListQuerySchema }),
  listTasksController
);

taskRouter.post(
  "/",
  requirePermission({ action: "create", module: "tasks" }),
  validateRequest({ body: createTaskBodySchema }),
  createTaskController
);

taskRouter.patch(
  "/:id/status",
  requirePermission({ action: "change_status", module: "tasks" }),
  validateRequest({
    body: changeTaskStatusBodySchema,
    params: taskIdParamsSchema
  }),
  changeTaskStatusController
);

taskRouter.post(
  "/:id/progress",
  requireAnyPermission([
    { action: "update", module: "tasks" },
    { action: "create", module: "task_updates" }
  ]),
  validateRequest({
    body: updateTaskProgressBodySchema,
    params: taskIdParamsSchema
  }),
  updateTaskProgressController
);

taskRouter.post(
  "/:id/reassign",
  requirePermission({ action: "assign", module: "tasks" }),
  validateRequest({
    body: reassignTaskBodySchema,
    params: taskIdParamsSchema
  }),
  reassignTaskController
);

taskRouter.get(
  "/:id/updates",
  requireAnyPermission([
    { action: "view", module: "tasks" },
    { action: "view", module: "task_updates" }
  ]),
  validateRequest({
    params: taskIdParamsSchema,
    query: taskUpdateListQuerySchema
  }),
  listTaskUpdatesController
);

taskRouter.get(
  "/:id",
  requirePermission({ action: "view", module: "tasks" }),
  validateRequest({ params: taskIdParamsSchema }),
  getTaskController
);

taskRouter.delete(
  "/:id",
  requirePermission({ action: "update", module: "tasks" }),
  validateRequest({ params: taskIdParamsSchema }),
  deleteTaskController
);

taskRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "tasks" }),
  validateRequest({
    body: updateTaskBodySchema,
    params: taskIdParamsSchema
  }),
  updateTaskController
);
