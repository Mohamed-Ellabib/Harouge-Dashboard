import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import { getCommentByIdForActor, updateComment } from "./comment.service";
import type {
  CommentIdParams,
  UpdateCommentBody
} from "./comment.validation";

export const getCommentController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<CommentIdParams>(res, "params");
    const comment = await getCommentByIdForActor(params.id, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ comment }));
  }
);

export const updateCommentController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<CommentIdParams>(res, "params");
    const body = getValidated<UpdateCommentBody>(res, "body");
    const comment = await updateComment(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ comment }));
  }
);
