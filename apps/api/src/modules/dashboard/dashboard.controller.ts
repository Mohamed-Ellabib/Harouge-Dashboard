import type { RequestHandler } from "express";

import { getAuthUser } from "../../shared/auth/auth-access";
import { ok } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  getDashboardActivity,
  getDashboardOverview,
  getDashboardSummary
} from "./dashboard.service";
import type { DashboardActivityQuery } from "./dashboard.validation";

export const getDashboardSummaryController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const summary = await getDashboardSummary({
      actor: getAuthUser(res)
    });

    res.status(200).json(ok({ summary }));
  }
);

export const getDashboardOverviewController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const overview = await getDashboardOverview({
      actor: getAuthUser(res)
    });

    res.status(200).json(ok({ overview }));
  }
);

export const getDashboardActivityController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = getValidated<DashboardActivityQuery>(res, "query");
    const activity = await getDashboardActivity(query, {
      actor: getAuthUser(res)
    });

    res.status(200).json(ok({ activity }));
  }
);
