import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

const projectRoot = path.resolve(__dirname, "../../../..");
const apiRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(apiRoot, ".env"), quiet: true });

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("ERP Sprint Progress System"),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(5000),
  API_BASE_URL: z.string().url().default("http://127.0.0.1:5000"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must use mongodb:// or mongodb+srv://"
    ),
  MONGODB_DB_NAME: z.string().min(1).default("itdcc"),
  MONGODB_AUTO_INDEX: booleanFromEnv.default(false),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(0),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10000),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10000),
  MONGODB_SOCKET_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(45000),
  AUTH_PROVIDER: z.literal("local").default("local"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  COOKIE_NAME: z.string().min(1).default("itdcc_session"),
  COOKIE_SECURE: booleanFromEnv.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  CSRF_COOKIE_NAME: z.string().min(1).default("itdcc_csrf"),
  CSRF_HEADER_NAME: z.string().min(1).default("x-csrf-token"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  AUTH_MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN: booleanFromEnv.default(true),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  CORS_ORIGIN: z.string().min(1).default("http://127.0.0.1:3000"),
  AUDIT_LOG_ENABLED: booleanFromEnv.default(true)
});

export type Env = z.infer<typeof envSchema>;

function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

const runtimeEnv = {
  ...process.env,
  API_PORT: process.env.API_PORT ?? process.env.PORT
};

const parsedEnv = envSchema.safeParse(runtimeEnv);

if (!parsedEnv.success) {
  throw new Error(`Invalid API environment configuration: ${formatEnvError(parsedEnv.error)}`);
}

export const env = Object.freeze(parsedEnv.data);
export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (env.MONGODB_MIN_POOL_SIZE > env.MONGODB_MAX_POOL_SIZE) {
  throw new Error(
    "Invalid API environment configuration: MONGODB_MIN_POOL_SIZE cannot exceed MONGODB_MAX_POOL_SIZE"
  );
}

if (env.COOKIE_SAME_SITE === "none" && !env.COOKIE_SECURE) {
  throw new Error(
    "Invalid API environment configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true"
  );
}

if (env.NODE_ENV === "production") {
  const productionErrors: string[] = [];

  if (!env.COOKIE_SECURE) {
    productionErrors.push("COOKIE_SECURE must be true in production");
  }

  if (!env.AUDIT_LOG_ENABLED) {
    productionErrors.push("AUDIT_LOG_ENABLED must be true in production");
  }

  if (env.SESSION_SECRET.length < 48 || /replace|change|example/i.test(env.SESSION_SECRET)) {
    productionErrors.push(
      "SESSION_SECRET must be a non-placeholder value of at least 48 characters in production"
    );
  }

  if (corsOrigins.some((origin) => origin === "*" || !origin.startsWith("https://"))) {
    productionErrors.push("CORS_ORIGIN must contain only explicit HTTPS origins in production");
  }

  if (productionErrors.length > 0) {
    throw new Error(
      `Invalid production environment configuration: ${productionErrors.join("; ")}`
    );
  }
}
