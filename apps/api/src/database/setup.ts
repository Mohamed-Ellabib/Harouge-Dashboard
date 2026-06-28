import { logger } from "../shared/logger/logger";

import { createDatabaseIndexes } from "./index-manager";
import { connectDatabase, disconnectDatabase, pingDatabase } from "./mongoose";
import { seedDatabase } from "./seed-runner";

async function setupDatabase(): Promise<void> {
  await connectDatabase();
  await pingDatabase();

  const indexResults = await createDatabaseIndexes();
  await seedDatabase();

  logger.info(
    {
      indexedModels: indexResults.map((result) => result.model)
    },
    "MongoDB setup completed"
  );
}

setupDatabase()
  .catch((error: unknown) => {
    logger.error({ error }, "MongoDB setup failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
