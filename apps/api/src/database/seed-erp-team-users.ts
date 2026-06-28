import { logger } from "../shared/logger/logger";

import { connectDatabase, disconnectDatabase } from "./mongoose";
import { seedErpTeamUsers } from "./seeds/seed-erp-team-users";

async function run(): Promise<void> {
  await connectDatabase();
  const result = await seedErpTeamUsers();
  logger.info({ result }, "ERP team users seed completed");
}

run()
  .catch((error: unknown) => {
    logger.error({ error }, "ERP team users seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
