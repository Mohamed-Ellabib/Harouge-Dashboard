import { Types } from "mongoose";

import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import {
  assertCanMutateRequest,
  assertCanUseInternalComments,
  assertCanViewRequest,
  buildRequestVisibilityFilter,
  isEnterpriseAdmin
} from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import type { RequestStatus } from "../../shared/constants/request.constants";
import {
  buildSort,
  escapeRegex,
  isDuplicateKeyError,
  runInTransaction
} from "../../shared/database";
import { AppError } from "../../shared/errors/app-error";
import {
  buildPaginationMeta,
  type PaginationMeta
} from "../../shared/pagination/pagination";
import { CommentModel } from "../comments/comment.model";
import { serializeComment, type CommentDto } from "../comments/comment.dto";
import type {
  CreateRequestCommentBody,
  RequestCommentListQuery
} from "../comments/comment.validation";
import { UserModel } from "../users/user.model";
import { TaskModel } from "../tasks/task.model";

import { generateRequestCode } from "./request-code";
import { serializeRequest, type RequestDto } from "./request.dto";
import { ItRequestModel, type ItRequestDocument } from "./request.model";
import type {
  AssignRequestBody,
  ChangeRequestStatusBody,
  CreateRequestBody,
  RequestListQuery,
  UpdateRequestBody
} from "./request.validation";

export interface RequestActionContext {
  actor?: AuthenticatedUserContext;
  auditContext?: AuditRequestContext;
}

export interface RequestListResult {
  data: RequestDto[];
  pagination: PaginationMeta;
}

export interface RequestCommentListResult {
  data: CommentDto[];
  pagination: PaginationMeta;
}

const allowedRequestSortFields = [
  "requestCode",
  "title",
  "status",
  "priority",
  "type",
  "requiredDate",
  "createdAt",
  "updatedAt"
] as const;

const allowedCommentSortFields = ["createdAt"] as const;

export async function listRequests(
  query: RequestListQuery,
  context: RequestActionContext
): Promise<RequestListResult> {
  const actor = getRequiredActor(context);
  const filter = combineFilters(
    buildRequestFilter(query),
    buildRequestVisibilityFilter(actor)
  );
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedRequestSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [requests, totalItems] = await Promise.all([
    ItRequestModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    ItRequestModel.countDocuments(filter)
  ]);

  return {
    data: requests.map(serializeRequest),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function createRequest(
  body: CreateRequestBody,
  context: RequestActionContext
): Promise<RequestDto> {
  const actorId = getRequiredActorId(context);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await runInTransaction(async () => {
        const request = await ItRequestModel.create({
          ...(body.description ? { description: body.description } : {}),
          priority: body.priority,
          requestCode: await generateRequestCode(),
          requestedBy: new Types.ObjectId(actorId),
          ...(body.requestedForDepartment
            ? { requestedForDepartment: body.requestedForDepartment }
            : {}),
          ...(body.requiredDate
            ? { requiredDate: new Date(body.requiredDate) }
            : {}),
          status: "submitted",
          title: body.title,
          type: body.type
        });
        const serializedRequest = serializeRequest(request);

        await persistAuditLog({
          action: "create",
          actorId,
          context: context.auditContext,
          entityId: serializedRequest.id,
          entityType: "request",
          newValue: serializedRequest
        });

        return serializedRequest;
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    503,
    "request_code_generation_failed",
    "Unable to generate a unique request code"
  );
}

export async function getRequestByIdForActor(
  id: string,
  context: RequestActionContext
): Promise<RequestDto> {
  const request = await findRequestOrThrow(id);
  assertCanViewRequest(request, context.actor);

  return serializeRequest(request);
}

export async function updateRequest(
  id: string,
  body: UpdateRequestBody,
  context: RequestActionContext
): Promise<RequestDto> {
  return runInTransaction(async () => {
    const request = await findRequestOrThrow(id);
    assertCanMutateRequest(request, context.actor, "update");

  const oldValue = serializeRequest(request);

  if (body.description !== undefined) {
    request.description = body.description;
  }

  if (body.priority !== undefined) {
    request.priority = body.priority;
  }

  if (body.requestedForDepartment !== undefined) {
    request.requestedForDepartment = body.requestedForDepartment;
  }

  if (body.requiredDate !== undefined) {
    request.requiredDate = new Date(body.requiredDate);
  }

  if (body.title !== undefined) {
    request.title = body.title;
  }

  if (body.type !== undefined) {
    request.type = body.type;
  }

  await request.save();
  const newValue = serializeRequest(request);

  await persistAuditLog({
    action: "update",
    actorId: context.actor?.id,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "request",
    newValue,
    oldValue
  });

    return newValue;
  });
}

export async function changeRequestStatus(
  id: string,
  body: ChangeRequestStatusBody,
  context: RequestActionContext
): Promise<RequestDto> {
  return runInTransaction(async () => {
    const request = await findRequestOrThrow(id);
    assertCanMutateRequest(request, context.actor, "change_status");
    assertValidRequestStatusTransition(request, body.status, context.actor);

    if (body.status === "closed" && request.status !== "closed") {
      const hasActiveTasks = await TaskModel.exists({
        requestId: request._id,
        status: { $nin: ["completed", "cancelled"] }
      });

      if (hasActiveTasks) {
        throw new AppError(
          409,
          "request_has_active_tasks",
          "Request cannot be closed while linked tasks are active"
        );
      }
    }

  const oldValue = serializeRequest(request);
  request.status = body.status;

  if (body.status === "closed") {
    request.closedAt = new Date();
  } else if (oldValue.status === "closed") {
    request.set("closedAt", undefined);
  }

  await request.save();
  const newValue = serializeRequest(request);

  await persistAuditLog({
    action: "change_status",
    actorId: context.actor?.id,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "request",
    newValue,
    oldValue
  });

    return newValue;
  });
}

export async function assignRequest(
  id: string,
  body: AssignRequestBody,
  context: RequestActionContext
): Promise<RequestDto> {
  return runInTransaction(async () => {
    const request = await findRequestOrThrow(id);
    assertCanMutateRequest(request, context.actor, "assign");
    await assertActiveUserExists(body.assignedTo);

  const oldValue = serializeRequest(request);
  request.assignedTo = new Types.ObjectId(body.assignedTo);

  if (request.status === "draft" || request.status === "submitted") {
    request.status = "assigned";
  }

  await request.save();
  const newValue = serializeRequest(request);

  await persistAuditLog({
    action: "assign",
    actorId: context.actor?.id,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "request",
    newValue,
    oldValue
  });

    return newValue;
  });
}

export async function listRequestComments(
  requestId: string,
  query: RequestCommentListQuery,
  context: RequestActionContext
): Promise<RequestCommentListResult> {
  const request = await findRequestOrThrow(requestId);
  assertCanViewRequest(request, context.actor);

  const filter: Record<string, unknown> = {
    requestId: new Types.ObjectId(requestId)
  };

  if (!isEnterpriseAdmin(context.actor)) {
    filter.isInternal = false;
  }

  if (query.search) {
    filter.body = new RegExp(escapeRegex(query.search), "i");
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {})
    };
  }

  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedCommentSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [comments, totalItems] = await Promise.all([
    CommentModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    CommentModel.countDocuments(filter)
  ]);

  return {
    data: comments.map(serializeComment),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function createRequestComment(
  requestId: string,
  body: CreateRequestCommentBody,
  context: RequestActionContext
): Promise<CommentDto> {
  return runInTransaction(async () => {
    const request = await findRequestOrThrow(requestId);
    assertCanMutateRequest(request, context.actor, "comment");

  const actorId = getRequiredActorId(context);

  if (body.isInternal) {
    assertCanUseInternalComments(context.actor);
  }

  const comment = await CommentModel.create({
    body: body.body,
    createdBy: new Types.ObjectId(actorId),
    isInternal: body.isInternal,
    requestId: request._id
  });
  const serializedComment = serializeComment(comment);

  await persistAuditLog({
    action: "comment",
    actorId,
    context: context.auditContext,
    entityId: serializedComment.id,
    entityType: "comment",
    newValue: serializedComment
  });

    return serializedComment;
  });
}

function buildRequestFilter(query: RequestListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.assignedTo) {
    filter.assignedTo = new Types.ObjectId(query.assignedTo);
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.requestedBy) {
    filter.requestedBy = new Types.ObjectId(query.requestedBy);
  }

  if (query.requestedForDepartment) {
    filter.requestedForDepartment = query.requestedForDepartment;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {})
    };
  }

  if (query.requiredDateFrom || query.requiredDateTo) {
    filter.requiredDate = {
      ...(query.requiredDateFrom
        ? { $gte: new Date(query.requiredDateFrom) }
        : {}),
      ...(query.requiredDateTo ? { $lte: new Date(query.requiredDateTo) } : {})
    };
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [
      { requestCode: regex },
      { title: regex },
      { description: regex },
      { requestedForDepartment: regex }
    ];
  }

  return filter;
}

function combineFilters(
  firstFilter: Record<string, unknown>,
  secondFilter: Record<string, unknown>
): Record<string, unknown> {
  if (Object.keys(firstFilter).length === 0) {
    return secondFilter;
  }

  if (Object.keys(secondFilter).length === 0) {
    return firstFilter;
  }

  return {
    $and: [firstFilter, secondFilter]
  };
}

async function findRequestOrThrow(id: string): Promise<ItRequestDocument> {
  const request = await ItRequestModel.findById(id);

  if (!request) {
    throw new AppError(404, "request_not_found", "Request not found");
  }

  return request;
}

async function assertActiveUserExists(userId: string): Promise<void> {
  const userExists = await UserModel.exists({
    _id: userId,
    status: "active"
  });

  if (!userExists) {
    throw new AppError(
      404,
      "assigned_user_not_found",
      "Assigned user was not found or is not active"
    );
  }
}

const requestStatusTransitions: Record<RequestStatus, readonly RequestStatus[]> = {
  assigned: ["in_progress", "completed", "rejected", "cancelled", "closed"],
  cancelled: ["closed"],
  closed: ["assigned", "in_progress", "completed", "rejected", "cancelled"],
  completed: ["in_progress", "closed"],
  draft: ["submitted", "cancelled"],
  in_progress: ["completed", "rejected", "cancelled"],
  rejected: ["closed"],
  submitted: ["assigned", "rejected", "cancelled"]
};

function assertValidRequestStatusTransition(
  request: ItRequestDocument,
  nextStatus: RequestStatus,
  actor: AuthenticatedUserContext | undefined
): void {
  if (request.status === nextStatus) {
    return;
  }

  if (request.status === "closed" && !isEnterpriseAdmin(actor)) {
    throw new AppError(
      403,
      "closed_request_locked",
      "Closed requests can only be reopened by Super Admin or IT Manager"
    );
  }

  if (!requestStatusTransitions[request.status].includes(nextStatus)) {
    throw new AppError(
      400,
      "invalid_request_status_transition",
      `Cannot change request status from ${request.status} to ${nextStatus}`
    );
  }

  if (
    ["assigned", "in_progress", "completed"].includes(nextStatus) &&
    !request.assignedTo
  ) {
    throw new AppError(
      400,
      "request_assignment_required",
      "Request must be assigned before using this status"
    );
  }
}

function getRequiredActor(
  context: RequestActionContext
): AuthenticatedUserContext {
  if (!context.actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return context.actor;
}

function getRequiredActorId(context: RequestActionContext): string {
  if (!context.actor?.id) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return context.actor.id;
}
