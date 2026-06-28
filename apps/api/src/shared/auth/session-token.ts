import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { env } from "../../config/env";

export interface SessionTokenResult {
  expiresAt: number;
  issuedAt: number;
  sessionVersion: number;
  token: string;
  userId: string;
}

export interface VerifiedSessionToken {
  expiresAt: number;
  issuedAt: number;
  sessionVersion: number;
  userId: string;
}

const sessionPayloadSchema = z.object({
  expiresAt: z.number().int().positive(),
  issuedAt: z.number().int().positive(),
  sessionVersion: z.number().int().min(0),
  userId: z.string().regex(/^[a-f\d]{24}$/i)
});

export function createSessionToken(
  userId: string,
  sessionVersion: number
): SessionTokenResult {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + env.SESSION_TTL_HOURS * 60 * 60 * 1000;
  const payload = {
    expiresAt,
    issuedAt,
    sessionVersion,
    userId
  };
  const payloadPart = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signPayload(payloadPart);

  return {
    ...payload,
    token: `${payloadPart}.${signature}`
  };
}

export function verifySessionToken(
  token: string
): VerifiedSessionToken | undefined {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return undefined;
  }

  const [payloadPart, signature] = parts;

  if (!payloadPart || !signature || !isValidSignature(payloadPart, signature)) {
    return undefined;
  }

  try {
    const rawPayload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    ) as unknown;
    const parsedPayload = sessionPayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      return undefined;
    }

    if (parsedPayload.data.expiresAt <= Date.now()) {
      return undefined;
    }

    return parsedPayload.data;
  } catch {
    return undefined;
  }
}

function signPayload(payloadPart: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(payloadPart)
    .digest("base64url");
}

function isValidSignature(payloadPart: string, signature: string): boolean {
  const expectedSignature = signPayload(payloadPart);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
