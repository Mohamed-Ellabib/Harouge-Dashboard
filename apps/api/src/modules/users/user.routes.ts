import { Router } from "express";

import {
  requireAnyPermission,
  requirePermission
} from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  assignUserRoleController,
  createUserController,
  getUserController,
  listUsersController,
  resetUserPasswordController,
  updateUserController,
  updateUserStatusController
} from "./user.controller";
import {
  assignUserRoleBodySchema,
  createUserBodySchema,
  resetUserPasswordBodySchema,
  updateUserBodySchema,
  updateUserStatusBodySchema,
  userIdParamsSchema,
  userListQuerySchema
} from "./user.validation";

export const userRouter = Router();

userRouter.get(
  "/",
  requireAnyPermission([
    { action: "view", module: "users" },
    { action: "view", module: "reports" }
  ]),
  validateRequest({ query: userListQuerySchema }),
  listUsersController
);

userRouter.post(
  "/",
  requirePermission({ action: "create", module: "users" }),
  validateRequest({ body: createUserBodySchema }),
  createUserController
);

userRouter.get(
  "/:id",
  requirePermission({ action: "view", module: "users" }),
  validateRequest({ params: userIdParamsSchema }),
  getUserController
);

userRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "users" }),
  validateRequest({ body: updateUserBodySchema, params: userIdParamsSchema }),
  updateUserController
);

userRouter.patch(
  "/:id/status",
  requirePermission({ action: "change_status", module: "users" }),
  validateRequest({
    body: updateUserStatusBodySchema,
    params: userIdParamsSchema
  }),
  updateUserStatusController
);

userRouter.patch(
  "/:id/role",
  requirePermission({ action: "assign", module: "users" }),
  validateRequest({ body: assignUserRoleBodySchema, params: userIdParamsSchema }),
  assignUserRoleController
);

userRouter.patch(
  "/:id/password",
  requirePermission({ action: "update", module: "users" }),
  validateRequest({
    body: resetUserPasswordBodySchema,
    params: userIdParamsSchema
  }),
  resetUserPasswordController
);
