import mongoose from "mongoose";

import { env } from "../config/env";
import { logger } from "../shared/logger/logger";

export type DatabaseStatus =
  | "connected"
  | "connecting"
  | "disconnecting"
  | "disconnected";

const readyStateMap: Record<number, DatabaseStatus> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

export interface DatabaseHealth {
  databaseName?: string;
  host?: string;
  readyState: number;
  status: DatabaseStatus;
}

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  mongoose.set("strictQuery", true);
  mongoose.set("autoIndex", env.MONGODB_AUTO_INDEX);
  mongoose.set("transactionAsyncLocalStorage", true);

  await mongoose.connect(env.MONGODB_URI, {
    appName: env.APP_NAME,
    connectTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
    dbName: env.MONGODB_DB_NAME,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: env.MONGODB_SOCKET_TIMEOUT_MS
  });

  logger.info(
    {
      databaseName: mongoose.connection.name,
      host: mongoose.connection.host
    },
    "MongoDB connected"
  );
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}

export function getDatabaseHealth(): DatabaseHealth {
  const readyState = mongoose.connection.readyState;

  return {
    ...(mongoose.connection.name ? { databaseName: mongoose.connection.name } : {}),
    ...(mongoose.connection.host ? { host: mongoose.connection.host } : {}),
    readyState,
    status: readyStateMap[readyState] ?? "disconnected"
  };
}

export async function pingDatabase(): Promise<void> {
  const database = mongoose.connection.db;

  if (!database || mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected.");
  }

  await database.command({ ping: 1 });
}
