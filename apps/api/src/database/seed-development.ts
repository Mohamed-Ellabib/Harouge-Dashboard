import { logger } from "../shared/logger/logger";

import { connectDatabase, disconnectDatabase } from "./mongoose";
import { seedDevelopmentData } from "./seeds/seed-development-data";

async function runDevelopmentSeed(): Promise<void> {
  if (process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
    logger.warn(
      "Development data seed skipped. Set ALLOW_DEVELOPMENT_SEED=true to run it intentionally."
    );
    return;
  }

  await connectDatabase();
  const result = await seedDevelopmentData();
  logger.info({ result }, "Development data seed completed");
}

runDevelopmentSeed()
  .catch((error: unknown) => {
    logger.error({ error }, "Development data seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
