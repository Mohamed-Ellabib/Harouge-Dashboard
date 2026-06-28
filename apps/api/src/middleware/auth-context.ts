import type { RequestHandler } from "express";

import { loadAuthenticatedUserContext } from "../shared/auth/auth-context-loader";
import {
  clearSessionCookie,
  readSessionCookie
} from "../shared/auth/session-cookie";
import { verifySessionToken } from "../shared/auth/session-token";

export const attachAuthContext: RequestHandler = async (req, res, next) => {
  try {
    const sessionCookie = readSessionCookie(req);

    if (!sessionCookie) {
      next();
      return;
    }

    const session = verifySessionToken(sessionCookie);

    if (!session) {
      clearSessionCookie(res);
      next();
      return;
    }

    const authUser = await loadAuthenticatedUserContext(
      session.userId,
      session.issuedAt,
      session.sessionVersion
    );

    if (!authUser) {
      clearSessionCookie(res);
      next();
      return;
    }

    res.locals.authUser = authUser;
    next();
  } catch (error) {
    next(error);
  }
};
