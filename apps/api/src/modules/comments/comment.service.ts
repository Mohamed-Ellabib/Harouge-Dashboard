import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import {
  assertCanMutateRequest,
  assertCanUseInternalComments,
  assertCanViewRequest,
  isEnterpriseAdmin
} from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import { AppError } from "../../shared/errors/app-error";
import { runInTransaction } from "../../shared/database";
import { ItRequestModel, type ItRequestDocument } from "../it-requests/request.model";

import { serializeComment, type CommentDto } from "./comment.dto";
import { CommentModel, type CommentDocument } from "./comment.model";
import type { UpdateCommentBody } from "./comment.validation";

export interface CommentActionContext {
  actor?: AuthenticatedUserContext;
  auditContext?: AuditRequestContext;
}

export async function getCommentByIdForActor(
  id: string,
  context: CommentActionContext
): Promise<CommentDto> {
  const comment = await findCommentOrThrow(id);
  const request = await findCommentRequestOrThrow(comment);

  assertCanViewComment(comment, request, context.actor);

  return serializeComment(comment);
}

export async function updateComment(
  id: string,
  body: UpdateCommentBody,
  context: CommentActionContext
): Promise<CommentDto> {
  return runInTransaction(async () => {
    const comment = await findCommentOrThrow(id);
    const request = await findCommentRequestOrThrow(comment);

  assertCanUpdateComment(comment, request, context.actor);

  if (body.isInternal === true) {
    assertCanUseInternalComments(context.actor);
  }

  const oldValue = serializeComment(comment);

  if (body.body !== undefined) {
    comment.body = body.body;
  }

  if (body.isInternal !== undefined) {
    comment.isInternal = body.isInternal;
  }

  await comment.save();
  const newValue = serializeComment(comment);

  await persistAuditLog({
    action: "update",
    actorId: context.actor?.id,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "comment",
    newValue,
    oldValue
  });

    return newValue;
  });
}

async function findCommentOrThrow(id: string): Promise<CommentDocument> {
  const comment = await CommentModel.findById(id);

  if (!comment) {
    throw new AppError(404, "comment_not_found", "Comment not found");
  }

  return comment;
}

async function findCommentRequestOrThrow(
  comment: CommentDocument
): Promise<ItRequestDocument> {
  const request = await ItRequestModel.findById(comment.requestId);

  if (!request) {
    throw new AppError(404, "request_not_found", "Request not found");
  }

  return request;
}

function assertCanViewComment(
  comment: CommentDocument,
  request: ItRequestDocument,
  actor: AuthenticatedUserContext | undefined
): asserts actor is AuthenticatedUserContext {
  assertCanViewRequest(request, actor);

  if (!comment.isInternal || isEnterpriseAdmin(actor)) {
    return;
  }

  throw new AppError(403, "comment_access_denied", "Comment access denied");
}

function assertCanUpdateComment(
  comment: CommentDocument,
  request: ItRequestDocument,
  actor: AuthenticatedUserContext | undefined
): asserts actor is AuthenticatedUserContext {
  assertCanViewComment(comment, request, actor);
  assertCanMutateRequest(request, actor, "comment");

  if (isEnterpriseAdmin(actor)) {
    return;
  }

  if (String(comment.createdBy) === actor.id && !comment.isInternal) {
    return;
  }

  throw new AppError(403, "comment_update_denied", "Comment update denied");
}
