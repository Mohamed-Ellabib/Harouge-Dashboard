import mongoose from "mongoose";

import { logger } from "../shared/logger/logger";

import {
  connectDatabase,
  disconnectDatabase,
  getDatabaseHealth,
  pingDatabase
} from "./mongoose";

async function checkDatabase(): Promise<void> {
  await connectDatabase();
  await pingDatabase();

  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("MongoDB database handle is unavailable.");
  }

  const collections = await database
    .listCollections({}, { nameOnly: true })
    .toArray();

  logger.info(
    {
      collections: collections.map((collection) => collection.name).sort(),
      health: getDatabaseHealth()
    },
    "MongoDB connectivity check passed"
  );
}

checkDatabase()
  .catch((error: unknown) => {
    logger.error({ error }, "MongoDB connectivity check failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
