import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";
import type {
  CreateRequestCommentBody,
  RequestCommentListQuery
} from "../comments/comment.validation";

import {
  assignRequest,
  changeRequestStatus,
  createRequest,
  createRequestComment,
  getRequestByIdForActor,
  listRequestComments,
  listRequests,
  updateRequest
} from "./request.service";
import type {
  AssignRequestBody,
  ChangeRequestStatusBody,
  CreateRequestBody,
  RequestIdParams,
  RequestListQuery,
  UpdateRequestBody
} from "./request.validation";

export const listRequestsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = getValidated<RequestListQuery>(res, "query");
    const result = await listRequests(query, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<CreateRequestBody>(res, "body");
    const request = await createRequest(body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ request }));
  }
);

export const getRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RequestIdParams>(res, "params");
    const request = await getRequestByIdForActor(params.id, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ request }));
  }
);

export const updateRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RequestIdParams>(res, "params");
    const body = getValidated<UpdateRequestBody>(res, "body");
    const request = await updateRequest(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ request }));
  }
);

export const changeRequestStatusController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RequestIdParams>(res, "params");
    const body = getValidated<ChangeRequestStatusBody>(res, "body");
    const request = await changeRequestStatus(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ request }));
  }
);

export const assignRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RequestIdParams>(res, "params");
    const body = getValidated<AssignRequestBody>(res, "body");
    const request = await assignRequest(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ request }));
  }
);

export const listRequestCommentsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RequestIdParams>(res, "params");
    const query = getValidated<RequestCommentListQuery>(res, "query");
    const result = await listRequestComments(params.id, query, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createRequestCommentController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<RequestIdParams>(res, "params");
    const body = getValidated<CreateRequestCommentBody>(res, "body");
    const comment = await createRequestComment(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ comment }));
  }
);
