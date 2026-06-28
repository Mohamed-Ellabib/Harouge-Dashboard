import { logger } from "../shared/logger/logger";

import { createDatabaseIndexes } from "./index-manager";
import { connectDatabase, disconnectDatabase, pingDatabase } from "./mongoose";

async function provisionIndexes(): Promise<void> {
  await connectDatabase();
  await pingDatabase();

  const results = await createDatabaseIndexes();

  logger.info({ models: results }, "MongoDB indexes provisioned");
}

provisionIndexes()
  .catch((error: unknown) => {
    logger.error({ error }, "MongoDB index provisioning failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
