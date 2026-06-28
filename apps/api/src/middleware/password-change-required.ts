import type { RequestHandler } from "express";

import { getAuthUser } from "../shared/auth/auth-access";
import { AppError } from "../shared/errors/app-error";

const allowedPaths = new Set([
  "/auth/change-password",
  "/auth/csrf",
  "/auth/login",
  "/auth/logout",
  "/auth/me"
]);

export const enforceRequiredPasswordChange: RequestHandler = (req, res, next) => {
  const authUser = getAuthUser(res);

  if (!authUser?.mustChangePassword || allowedPaths.has(req.path)) {
    next();
    return;
  }

  next(
    new AppError(
      403,
      "password_change_required",
      "Password change is required before accessing this resource"
    )
  );
};
