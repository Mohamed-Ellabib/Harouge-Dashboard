import type { Response } from "express";

import { AppError } from "../errors/app-error";
import type { AuthenticatedUserContext } from "./auth-context";

export function getAuthUser(res: Response): AuthenticatedUserContext | undefined {
  return res.locals.authUser;
}

export function requireAuthUser(res: Response): AuthenticatedUserContext {
  const authUser = getAuthUser(res);

  if (!authUser) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return authUser;
}
