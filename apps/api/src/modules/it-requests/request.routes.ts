import { Router } from "express";

import {
  requireAnyPermission,
  requirePermission
} from "../../middleware/authorization";
import {
  createRequestCommentBodySchema,
  requestCommentListQuerySchema
} from "../comments/comment.validation";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  assignRequestController,
  changeRequestStatusController,
  createRequestCommentController,
  createRequestController,
  getRequestController,
  listRequestCommentsController,
  listRequestsController,
  updateRequestController
} from "./request.controller";
import {
  assignRequestBodySchema,
  changeRequestStatusBodySchema,
  createRequestBodySchema,
  requestIdParamsSchema,
  requestListQuerySchema,
  updateRequestBodySchema
} from "./request.validation";

export const requestRouter = Router();

requestRouter.get(
  "/",
  requirePermission({ action: "view", module: "requests" }),
  validateRequest({ query: requestListQuerySchema }),
  listRequestsController
);

requestRouter.post(
  "/",
  requirePermission({ action: "create", module: "requests" }),
  validateRequest({ body: createRequestBodySchema }),
  createRequestController
);

requestRouter.patch(
  "/:id/status",
  requirePermission({ action: "change_status", module: "requests" }),
  validateRequest({
    body: changeRequestStatusBodySchema,
    params: requestIdParamsSchema
  }),
  changeRequestStatusController
);

requestRouter.patch(
  "/:id/assign",
  requirePermission({ action: "assign", module: "requests" }),
  validateRequest({ body: assignRequestBodySchema, params: requestIdParamsSchema }),
  assignRequestController
);

requestRouter.get(
  "/:id/comments",
  requireAnyPermission([
    { action: "view", module: "requests" },
    { action: "view", module: "comments" }
  ]),
  validateRequest({
    params: requestIdParamsSchema,
    query: requestCommentListQuerySchema
  }),
  listRequestCommentsController
);

requestRouter.post(
  "/:id/comments",
  requireAnyPermission([
    { action: "comment", module: "requests" },
    { action: "create", module: "comments" }
  ]),
  validateRequest({
    body: createRequestCommentBodySchema,
    params: requestIdParamsSchema
  }),
  createRequestCommentController
);

requestRouter.get(
  "/:id",
  requirePermission({ action: "view", module: "requests" }),
  validateRequest({ params: requestIdParamsSchema }),
  getRequestController
);

requestRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "requests" }),
  validateRequest({ body: updateRequestBodySchema, params: requestIdParamsSchema }),
  updateRequestController
);
