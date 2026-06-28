import { Router } from "express";

import {
  requireAnyPermission,
  requirePermission
} from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  getCommentController,
  updateCommentController
} from "./comment.controller";
import {
  commentIdParamsSchema,
  updateCommentBodySchema
} from "./comment.validation";

export const commentRouter = Router();

commentRouter.get(
  "/:id",
  requireAnyPermission([
    { action: "view", module: "comments" },
    { action: "view", module: "requests" }
  ]),
  validateRequest({ params: commentIdParamsSchema }),
  getCommentController
);

commentRouter.patch(
  "/:id",
  requirePermission({ action: "update", module: "comments" }),
  validateRequest({
    body: updateCommentBodySchema,
    params: commentIdParamsSchema
  }),
  updateCommentController
);
