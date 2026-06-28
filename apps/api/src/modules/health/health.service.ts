import { env } from "../../config/env";
import { getDatabaseHealth, pingDatabase } from "../../database/mongoose";

export interface HealthCheck {
  appName: string;
  database: ReturnType<typeof getDatabaseHealth>;
  environment: string;
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
}

export async function getHealthCheck(): Promise<HealthCheck> {
  const database = getDatabaseHealth();
  let databaseResponsive = false;

  try {
    await pingDatabase();
    databaseResponsive = true;
  } catch {
    databaseResponsive = false;
  }

  return {
    appName: env.APP_NAME,
    database,
    environment: env.NODE_ENV,
    status:
      database.status === "connected" && databaseResponsive ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  };
}
