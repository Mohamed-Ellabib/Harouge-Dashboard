import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env";

const unsafeMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export function isUnsafeMethod(method: string): boolean {
  return unsafeMethods.has(method.toUpperCase());
}

export function createCsrfToken(): string {
  const nonce = randomBytes(32).toString("base64url");
  const signature = signCsrfNonce(nonce);

  return `${nonce}.${signature}`;
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(env.CSRF_COOKIE_NAME, token, {
    ...getCsrfCookieOptions(),
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(env.CSRF_COOKIE_NAME, getCsrfCookieOptions());
}

export function readCsrfCookie(req: Request): string | undefined {
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

    if (name !== env.CSRF_COOKIE_NAME) {
      continue;
    }

    return decodeURIComponent(trimmedPair.slice(separatorIndex + 1));
  }

  return undefined;
}

export function readCsrfHeader(req: Request): string | undefined {
  const headerValue = req.get(env.CSRF_HEADER_NAME);

  return headerValue?.trim() || undefined;
}

export function verifyCsrfToken(token: string): boolean {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [nonce, signature] = parts;

  if (!nonce || !signature) {
    return false;
  }

  const expectedSignature = signCsrfNonce(nonce);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function signCsrfNonce(nonce: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`csrf:${nonce}`)
    .digest("base64url");
}

function getCsrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    path: "/",
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE
  };
}
