import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import {
  clearCsrfCookie,
  createCsrfToken,
  setCsrfCookie
} from "../../shared/auth/csrf-token";
import {
  clearSessionCookie,
  setSessionCookie
} from "../../shared/auth/session-cookie";
import { ok } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import { changePassword, login, logout } from "./auth.service";
import type { ChangePasswordBody, LoginBody } from "./auth.validation";

export const getCsrfController: RequestHandler = asyncHandler(async (_req, res) => {
  const csrfToken = createCsrfToken();

  setCsrfCookie(res, csrfToken);
  res.status(200).json(ok({ csrfToken }));
});

export const loginController: RequestHandler = asyncHandler(async (req, res) => {
  const body = getValidated<LoginBody>(res, "body");
  const session = await login({
    context: getAuditRequestContext(req),
    email: body.email,
    password: body.password
  });

  setSessionCookie(res, session.token);
  const csrfToken = createCsrfToken();
  setCsrfCookie(res, csrfToken);

  res.status(200).json(
    ok({
      csrfToken,
      session: {
        expiresAt: new Date(session.expiresAt).toISOString()
      },
      user: session.user
    })
  );
});

export const logoutController: RequestHandler = asyncHandler(async (req, res) => {
  const authUser = getAuthUser(res);

  await logout(authUser?.id, getAuditRequestContext(req));
  clearSessionCookie(res);
  clearCsrfCookie(res);

  res.status(200).json(ok({ loggedOut: true }));
});

export const getMeController: RequestHandler = asyncHandler(async (_req, res) => {
  res.status(200).json(ok({ user: getAuthUser(res) }));
});

export const changePasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const authUser = getAuthUser(res);
    const body = getValidated<ChangePasswordBody>(res, "body");
    const session = await changePassword({
      context: getAuditRequestContext(req),
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      userId: authUser?.id ?? ""
    });

    setSessionCookie(res, session.token);
    const csrfToken = createCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.status(200).json(
      ok({
        csrfToken,
        session: {
          expiresAt: new Date(session.expiresAt).toISOString()
        },
        user: session.user
      })
    );
  }
);
