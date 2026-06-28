import { logger } from "../shared/logger/logger";

import { connectDatabase, disconnectDatabase } from "./mongoose";
import { seedErpSprintItems } from "./seeds/seed-erp-sprint-items";

async function run(): Promise<void> {
  await connectDatabase();
  const result = await seedErpSprintItems();
  logger.info({ result }, "ERP sprint items seed completed");
}

run()
  .catch((error: unknown) => {
    logger.error({ error }, "ERP sprint items seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
