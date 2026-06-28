import type { RequestHandler } from "express";

import { getAuthUser } from "../shared/auth/auth-access";
import {
  isUnsafeMethod,
  readCsrfCookie,
  readCsrfHeader,
  verifyCsrfToken
} from "../shared/auth/csrf-token";
import { AppError } from "../shared/errors/app-error";

const csrfExemptPaths = new Set(["/auth/csrf", "/auth/login"]);

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (!isUnsafeMethod(req.method) || csrfExemptPaths.has(req.path)) {
    next();
    return;
  }

  if (!getAuthUser(res)) {
    next();
    return;
  }

  const csrfCookie = readCsrfCookie(req);
  const csrfHeader = readCsrfHeader(req);

  if (
    !csrfCookie ||
    !csrfHeader ||
    csrfCookie !== csrfHeader ||
    !verifyCsrfToken(csrfCookie)
  ) {
    next(new AppError(403, "csrf_token_invalid", "CSRF token is invalid"));
    return;
  }

  next();
};
