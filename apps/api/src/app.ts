import fs from "node:fs";
import path from "node:path";

import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { httpLogger } from "./middleware/http-logger";
import { notFoundHandler } from "./middleware/not-found-handler";
import { requestContext } from "./middleware/request-context";
import { registerSecurityMiddleware } from "./middleware/security";
import { apiRouter } from "./routes/api.routes";

export function createApp(): express.Application {
  const app = express();

  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  app.use(requestContext);
  app.use(httpLogger);
  registerSecurityMiddleware(app);

  app.use("/api", apiRouter);
  app.use("/api", notFoundHandler);

  registerFrontendMiddleware(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function registerFrontendMiddleware(app: express.Application): void {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const webDistPath = path.resolve(__dirname, "../../web/dist");
  const indexPath = path.join(webDistPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    return;
  }

  app.use(express.static(webDistPath, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(indexPath);
  });
}
