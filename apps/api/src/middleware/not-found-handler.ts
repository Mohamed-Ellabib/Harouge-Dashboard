import type { RequestHandler } from "express";

import { AppError } from "../shared/errors/app-error";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "route_not_found", `Route not found: ${req.method} ${req.originalUrl}`));
};
