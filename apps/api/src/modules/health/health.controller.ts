import type { RequestHandler } from "express";

import { ok } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getHealthCheck } from "./health.service";

export const getHealth: RequestHandler = asyncHandler(async (_req, res) => {
  const health = await getHealthCheck();
  res.status(health.status === "ok" ? 200 : 503).json(ok(health));
});
