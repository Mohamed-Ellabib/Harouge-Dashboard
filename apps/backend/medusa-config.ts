import { defineConfig, loadEnv, MedusaError } from "@medusajs/framework/utils";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createPlatformLoginRedirectPlugin } from "./src/admin/platform-login-redirect";

const localDatabaseGuard = process.env.LABIBTECH_LOCAL_DATABASE_GUARD
const supabaseDevelopmentGuard =
  process.env.LABIBTECH_SUPABASE_DEVELOPMENT_GUARD
const disposableTestDatabaseGuard =
  process.env.LABIBTECH_DISPOSABLE_TEST_DATABASE_GUARD
const expectedSupabaseDevelopmentGuard = "validated-v1"
const expectedDisposableTestDatabaseGuard = "validated-v1"
const phase3aSmokeGuard = process.env.PHASE3A_STOREFRONT_SMOKE
const phase3bSmokeGuard = process.env.PHASE3B_COMMERCE_SMOKE

const invalidDatabaseConfiguration = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const parseDatabaseUrl = (value: string | undefined, message: string) => {
  try {
    return new URL(value || "")
  } catch {
    return invalidDatabaseConfiguration(message)
  }
}

const processIsAlive = (pid: number) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch (error: any) {
    return error?.code !== "ESRCH"
  }
}

if (
  (phase3aSmokeGuard && phase3aSmokeGuard !== "guarded-local-phase3a") ||
  (phase3bSmokeGuard && phase3bSmokeGuard !== "guarded-local-phase3b")
) {
  invalidDatabaseConfiguration("The storefront smoke guard is invalid.")
}

if (
  localDatabaseGuard &&
  localDatabaseGuard !== "validated-v1"
) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "The local database guard is invalid.",
  )
}

if (
  supabaseDevelopmentGuard &&
  supabaseDevelopmentGuard !== expectedSupabaseDevelopmentGuard
) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "The Supabase development database guard is invalid.",
  )
}

if (
  disposableTestDatabaseGuard &&
  disposableTestDatabaseGuard !== expectedDisposableTestDatabaseGuard
) {
  invalidDatabaseConfiguration(
    "The disposable test database guard is invalid.",
  )
}

if (
  [
    localDatabaseGuard,
    supabaseDevelopmentGuard,
    disposableTestDatabaseGuard,
  ].filter(Boolean).length > 1
) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Only one guarded development database may be selected.",
  )
}

if (
  localDatabaseGuard !== "validated-v1" &&
  supabaseDevelopmentGuard !== expectedSupabaseDevelopmentGuard &&
  disposableTestDatabaseGuard !== expectedDisposableTestDatabaseGuard
) {
  loadEnv(process.env.NODE_ENV || "development", process.cwd());
}

if (localDatabaseGuard === "validated-v1") {
  const localDatabaseUrl = parseDatabaseUrl(
    process.env.DATABASE_URL,
    "The validated local database URL is invalid.",
  )

  if (
    localDatabaseUrl.protocol !== "postgres:" &&
    localDatabaseUrl.protocol !== "postgresql:"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The validated local database must use PostgreSQL.",
    )
  }

  if (
    localDatabaseUrl.hostname !== "127.0.0.1" ||
    localDatabaseUrl.port !== "55433" ||
    localDatabaseUrl.pathname !== "/labibtech_commerce_local"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The validated local database identity is invalid.",
    )
  }
}

if (disposableTestDatabaseGuard === expectedDisposableTestDatabaseGuard) {
  const testDatabaseUrl = parseDatabaseUrl(
    process.env.DATABASE_URL,
    "The disposable test database URL is invalid.",
  )
  const approvedTestDatabaseUrl = parseDatabaseUrl(
    process.env.TEST_DATABASE_URL,
    "The approved disposable test database URL is invalid.",
  )
  testDatabaseUrl.searchParams.sort()
  approvedTestDatabaseUrl.searchParams.sort()
  const expectedLockPath = resolve(
    tmpdir(),
    "medusa-phase05",
    "test-data",
    "locks",
    "disposable-postgres-run.lock",
  )

  if (
    process.env.NODE_ENV !== "test" ||
    testDatabaseUrl.toString() !== approvedTestDatabaseUrl.toString() ||
    !["postgres:", "postgresql:"].includes(testDatabaseUrl.protocol) ||
    !["127.0.0.1", "localhost", "::1"].includes(testDatabaseUrl.hostname) ||
    testDatabaseUrl.pathname !== "/medusa_phase05_disposable" ||
    process.env.DISPOSABLE_DATABASE_RUN_LOCK_HELD !== "true" ||
    resolve(process.env.DISPOSABLE_DATABASE_LOCK_PATH || "") !==
      expectedLockPath ||
    !process.env.LABIBTECH_DISPOSABLE_TEST_RUN_TOKEN
  ) {
    invalidDatabaseConfiguration(
      "The disposable test database identity is invalid.",
    )
  }

  try {
    const lock = JSON.parse(readFileSync(expectedLockPath, "utf8"))
    const runToken = process.env.LABIBTECH_DISPOSABLE_TEST_RUN_TOKEN || ""
    const actualHash = createHash("sha256").update(runToken).digest()
    const expectedHash = /^[a-f0-9]{64}$/.test(lock.runTokenHash || "")
      ? Buffer.from(lock.runTokenHash, "hex")
      : Buffer.alloc(0)
    const ownerPid = Number(lock.pid)
    const childPid = Number(lock.childPid)
    const childOwnershipIsValid =
      (Number.isSafeInteger(childPid) &&
        childPid > 0 &&
        processIsAlive(childPid)) ||
      (lock.childPid === null && ownerPid === process.ppid)

    if (
      !processIsAlive(ownerPid) ||
      !childOwnershipIsValid ||
      actualHash.length !== expectedHash.length ||
      !timingSafeEqual(actualHash, expectedHash)
    ) {
      invalidDatabaseConfiguration(
        "The disposable test database ownership is invalid.",
      )
    }
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error
    }

    invalidDatabaseConfiguration(
      "The disposable test database ownership is invalid.",
    )
  }
}

if (supabaseDevelopmentGuard === expectedSupabaseDevelopmentGuard) {
  if (process.env.NODE_ENV !== "development") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The Supabase development database requires development mode.",
    )
  }

  const projectRef = process.env.LABIBTECH_SUPABASE_PROJECT_REF?.trim() || ""
  let trackedProjectRef = ""

  try {
    const tracked = JSON.parse(
      readFileSync(
        resolve(__dirname, "config", "supabase-development.json"),
        "utf8",
      ),
    )

    if (
      !tracked ||
      typeof tracked !== "object" ||
      Array.isArray(tracked) ||
      tracked.version !== 1 ||
      typeof tracked.projectRef !== "string" ||
      Object.keys(tracked).sort().join(",") !== "projectRef,version"
    ) {
      invalidDatabaseConfiguration(
        "The tracked Supabase development project is invalid.",
      )
    }

    trackedProjectRef = tracked.projectRef
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error
    }

    invalidDatabaseConfiguration(
      "The tracked Supabase development project is invalid.",
    )
  }

  const databaseUrl = parseDatabaseUrl(
    process.env.DATABASE_URL,
    "The approved Supabase development database URL is invalid.",
  )
  const directHost = `db.${projectRef}.supabase.co`
  const isDirect =
    databaseUrl.hostname === directHost && databaseUrl.username === "postgres"
  const isSessionPooler =
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pooler\.supabase\.com$/.test(
      databaseUrl.hostname,
    ) && databaseUrl.username === `postgres.${projectRef}`
  const sslMode = databaseUrl.searchParams.get("sslmode")

  if (
    !/^[a-z0-9]{20}$/.test(projectRef) ||
    projectRef !== trackedProjectRef
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The approved Supabase development project is invalid.",
    )
  }

  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    (!isDirect && !isSessionPooler) ||
    databaseUrl.port !== "5432" ||
    databaseUrl.pathname !== "/postgres" ||
    !databaseUrl.username ||
    !databaseUrl.password ||
    sslMode !== "require" ||
    databaseUrl.searchParams.size !== 1 ||
    Boolean(databaseUrl.hash)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The approved Supabase development database identity is invalid.",
    )
  }

  const localAppData = process.env.LOCALAPPDATA?.trim() || ""
  const runToken =
    process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN?.trim() || ""

  if (!localAppData || !runToken) {
    invalidDatabaseConfiguration(
      "The Supabase development runner ownership is invalid.",
    )
  }

  try {
    const lock = JSON.parse(
      readFileSync(
        resolve(
          localAppData,
          "LabibTech-Commerce-SaaS",
          "supabase-development",
          "supabase-development-run.lock",
        ),
        "utf8",
      ),
    )
    const actualHash = createHash("sha256").update(runToken).digest()
    const expectedHash = /^[a-f0-9]{64}$/.test(lock.runTokenHash || "")
      ? Buffer.from(lock.runTokenHash, "hex")
      : Buffer.alloc(0)
    const ownerPid = Number(lock.pid)
    const childPid = Number(lock.childPid)
    const processBelongsToRunner =
      ownerPid === process.ppid ||
      childPid === process.pid ||
      childPid === process.ppid

    if (
      !processBelongsToRunner ||
      !processIsAlive(ownerPid) ||
      (Number.isSafeInteger(childPid) && childPid > 0 &&
        !processIsAlive(childPid)) ||
      actualHash.length !== expectedHash.length ||
      !timingSafeEqual(actualHash, expectedHash)
    ) {
      invalidDatabaseConfiguration(
        "The Supabase development runner ownership is invalid.",
      )
    }
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error
    }

    invalidDatabaseConfiguration(
      "The Supabase development runner ownership is invalid.",
    )
  }
}

const configuredDatabaseUrl = process.env.DATABASE_URL?.trim()

if (configuredDatabaseUrl) {
  const configuredDatabaseHost = parseDatabaseUrl(
    configuredDatabaseUrl,
    "The configured database URL is invalid.",
  ).hostname

  if (
    configuredDatabaseHost === "neon.tech" ||
    configuredDatabaseHost.endsWith(".neon.tech")
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The historical Neon database target is prohibited.",
    )
  }

  const isLoopbackDatabase = ["127.0.0.1", "localhost", "::1"].includes(
    configuredDatabaseHost,
  )
  const guardedDatabaseSelected = Boolean(
    localDatabaseGuard ||
      supabaseDevelopmentGuard ||
      disposableTestDatabaseGuard,
  )

  if (!isLoopbackDatabase && !guardedDatabaseSelected) {
    invalidDatabaseConfiguration(
      "Remote PostgreSQL requires an approved guarded database runner.",
    )
  }
}

const adminPath = "/app" as const;
const platformAdminLoginUrl =
  process.env.PLATFORM_ADMIN_LOGIN_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:5174/" : "/");

module.exports = defineConfig({
  featureFlags: {
    rbac: process.env.MEDUSA_FF_RBAC === "true",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    ...(process.env.MEDUSA_FF_RBAC === "true"
      ? [
          {
            resolve: "@medusajs/medusa/rbac",
            disable: false,
          },
        ]
      : []),
    {
      resolve: "./src/modules/marketplace",
    },
    {
      resolve: "./src/modules/saas",
    },
  ],
  admin: {
    path: adminPath,
    vite: () => ({
      plugins: [
        createPlatformLoginRedirectPlugin({
          adminPath,
          signInUrl: platformAdminLoginUrl,
        }),
      ],
    }),
  },
});
