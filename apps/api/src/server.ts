import type { Server } from "node:http";

import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./database/mongoose";
import { createApp } from "./app";
import { logger } from "./shared/logger/logger";

async function bootstrap(): Promise<Server> {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.API_PORT, env.API_HOST, () => {
    logger.info(
      {
        host: env.API_HOST,
        port: env.API_PORT
      },
      "API server started"
    );
  });

  return server;
}

function registerShutdown(server: Server): void {
  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutdown signal received");

    server.close((error) => {
      void disconnectDatabase()
        .catch((disconnectError) => {
          logger.error({ error: disconnectError }, "MongoDB disconnect failed");
        })
        .finally(() => {
          if (error) {
            logger.error({ error }, "HTTP server shutdown failed");
            process.exit(1);
          }

          logger.info("API server stopped");
          process.exit(0);
        });
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap()
  .then(registerShutdown)
  .catch((error) => {
    logger.fatal({ error }, "API server failed to start");
    process.exit(1);
  });
