import { connectDatabase, disconnectDatabase } from "./mongoose";
import { seedDatabase } from "./seed-runner";
import { logger } from "../shared/logger/logger";

async function runSeed(): Promise<void> {
  await connectDatabase();
  await seedDatabase();
}

runSeed()
  .catch((error: unknown) => {
    logger.error({ error }, "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
