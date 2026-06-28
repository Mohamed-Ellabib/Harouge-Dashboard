import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";
import { fail } from "../shared/http/api-response";
import { logger } from "../shared/logger/logger";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json(fail("validation_error", "Validation failed", error.flatten()));
    return;
  }

  if (error instanceof AppError) {
    res
      .status(error.statusCode)
      .json(fail(error.code, error.expose ? error.message : "Unexpected server error", error.details));
    return;
  }

  if (error instanceof Error && error.name === "VersionError") {
    res
      .status(409)
      .json(
        fail(
          "concurrent_modification",
          "The record changed while it was being updated. Reload and try again."
        )
      );
    return;
  }

  logger.error({ error }, "Unhandled API error");

  res.status(500).json(
    fail(
      "internal_server_error",
      "Unexpected server error",
      env.NODE_ENV === "development" && error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined
    )
  );
};
