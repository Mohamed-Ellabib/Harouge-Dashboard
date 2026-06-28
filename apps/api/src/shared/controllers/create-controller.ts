import type { Request, RequestHandler } from "express";

import { asyncHandler } from "../http/async-handler";
import type { ControllerHandler } from "./controller.types";

export function createController<TRequest extends Request = Request>(
  handler: ControllerHandler<TRequest>
): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    await handler(req as TRequest, res, next);
  });
}
