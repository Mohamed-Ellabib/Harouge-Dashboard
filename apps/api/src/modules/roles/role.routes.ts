import { Router } from "express";

import {
  requireAnyPermission,
  requirePermission
} from "../../middleware/authorization";
import { listRolePermissionsController } from "../permissions/permission.controller";
import {
  permissionListQuerySchema,
  rolePermissionsParamsSchema
} from "../permissions/permission.validation";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  createRoleController,
  getRoleController,
  listRolesController,
  updateRoleController
} from "./role.controller";
import {
  createRoleBodySchema,
  roleIdParamsSchema,
  roleListQuerySchema,
  updateRoleBodySchema
} from "./role.validation";

export const roleRouter = Router();

roleRouter.get(
  "/",
  requirePermission({ action: "view", module: "roles" }),
  validateRequest({ query: roleListQuerySchema }),
  listRolesController
);

roleRouter.post(
  "/",
  requirePermission({ action: "create", module: "roles" }),
  validateRequest({ body: createRoleBodySchema }),
  createRoleController
);

roleRouter.get(
  "/:id/permissions",
  requireAnyPermission([
    { action: "view", module: "permissions" },
    { action: "view", module: "roles" }
  ]),
  validateRequest({
    params: rolePermissionsParamsSchema,
    query: permissionListQuerySchema
  }),
  listRolePermissionsController
);

roleRouter.get(
  "/:id",
  requirePermission({ action: "view", module: "roles" }),
  validateRequest({ params: roleIdParamsSchema }),
  getRoleController
);

roleRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "roles" }),
  validateRequest({ body: updateRoleBodySchema, params: roleIdParamsSchema }),
  updateRoleController
);
