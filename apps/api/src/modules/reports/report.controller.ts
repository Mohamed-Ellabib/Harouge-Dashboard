import type { RequestHandler } from "express";

import { getAuthUser } from "../../shared/auth/auth-access";
import { paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  listRequestReportRows,
  listTaskReportRows
} from "./report.service";
import type {
  RequestReportQuery,
  TaskReportQuery
} from "./report.validation";

export const listRequestReportController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<RequestReportQuery>(res, "query");
    const result = await listRequestReportRows(query, {
      actor: getAuthUser(res)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const listTaskReportController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<TaskReportQuery>(res, "query");
    const result = await listTaskReportRows(query, {
      actor: getAuthUser(res)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);
