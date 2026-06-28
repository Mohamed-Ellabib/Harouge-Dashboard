import pino from "pino";

import { env } from "../../config/env";

export const logger = pino({
  base: undefined,
  level: env.NODE_ENV === "test" ? "silent" : "info",
  messageKey: "message",
  redact: {
    censor: "[REDACTED]",
    paths: [
      "password",
      "passwordHash",
      "token",
      "req.headers.authorization",
      "req.headers.cookie",
      `req.headers[\"${env.CSRF_HEADER_NAME.toLowerCase()}\"]`,
      "res.headers[\"set-cookie\"]"
    ]
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
