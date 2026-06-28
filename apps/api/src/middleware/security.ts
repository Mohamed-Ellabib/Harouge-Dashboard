import cors from "cors";
import type { Application } from "express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

import { corsOrigins, env } from "../config/env";

export function registerSecurityMiddleware(app: Application): void {
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin: corsOrigins
    })
  );
  app.use(
    rateLimit({
      legacyHeaders: false,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    })
  );
  app.use(
    "/api/auth/login",
    rateLimit({
      legacyHeaders: false,
      limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
}
