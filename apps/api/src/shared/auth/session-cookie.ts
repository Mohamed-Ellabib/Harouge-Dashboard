import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env";

const cookiePath = "/";

export function readSessionCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookiePair of cookieHeader.split(";")) {
    const trimmedPair = cookiePair.trim();
    const separatorIndex = trimmedPair.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    const name = trimmedPair.slice(0, separatorIndex);

    if (name !== env.COOKIE_NAME) {
      continue;
    }

    const value = trimmedPair.slice(separatorIndex + 1);

    return decodeURIComponent(value);
  }

  return undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    ...getSessionCookieOptions(),
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, getSessionCookieOptions());
}

function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: cookiePath,
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE
  };
}
