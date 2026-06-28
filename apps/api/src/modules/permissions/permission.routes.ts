import { Router } from "express";

import { requirePermission } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  createPermissionController,
  getPermissionController,
  listPermissionsController,
  updatePermissionController
} from "./permission.controller";
import {
  createPermissionBodySchema,
  permissionIdParamsSchema,
  permissionListQuerySchema,
  updatePermissionBodySchema
} from "./permission.validation";

export const permissionRouter = Router();

permissionRouter.get(
  "/",
  requirePermission({ action: "view", module: "permissions" }),
  validateRequest({ query: permissionListQuerySchema }),
  listPermissionsController
);

permissionRouter.post(
  "/",
  requirePermission({ action: "create", module: "permissions" }),
  validateRequest({ body: createPermissionBodySchema }),
  createPermissionController
);

permissionRouter.get(
  "/:id",
  requirePermission({ action: "view", module: "permissions" }),
  validateRequest({ params: permissionIdParamsSchema }),
  getPermissionController
);

permissionRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "permissions" }),
  validateRequest({
    body: updatePermissionBodySchema,
    params: permissionIdParamsSchema
  }),
  updatePermissionController
);
