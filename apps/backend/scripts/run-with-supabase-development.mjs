import { spawn, spawnSync } from "node:child_process"
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { createRequire } from "node:module"
import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs"
import { dirname, resolve } from "node:path"

import {
  SUPABASE_DEVELOPMENT_FINGERPRINT_KEY_ID,
  SUPABASE_DEVELOPMENT_GUARD,
  assertDevelopmentRuntime,
  assertSupportedNodeRuntime,
  assertWindowsCredentialStore,
  getSupabaseDevelopmentPaths,
  loadSupabaseDevelopmentSecrets,
  promptForHiddenPlatformAdminPassword,
  promptForPlatformAdminEmail,
  readTrackedSupabaseDevelopmentConfig,
} from "./supabase-development-config.mjs"

assertSupportedNodeRuntime()
assertWindowsCredentialStore()
assertDevelopmentRuntime()

const supportedModes = new Set([
  "develop",
  "harden",
  "migrate-core",
  "sync-links-safe",
  "migrate-scripts",
  "platform-admin",
  "demo-portfolio",
  "probe",
])
const mode = process.argv[2]

if (!supportedModes.has(mode) || process.argv.length !== 3) {
  throw new Error(
    "Use one Supabase development mode: develop, harden, migrate-core, sync-links-safe, migrate-scripts, platform-admin, demo-portfolio, or probe.",
  )
}

const trackedConfig = readTrackedSupabaseDevelopmentConfig()
const credentials = loadSupabaseDevelopmentSecrets(trackedConfig.projectRef)
const {
  backendDirectory,
  lockPath,
  stateDirectory,
} = getSupabaseDevelopmentPaths()
const require = createRequire(import.meta.url)
const supabaseCaPath = resolve(
  backendDirectory,
  "config",
  "supabase-prod-ca-2021.crt",
)
const expectedSupabaseCaSha256 =
  "700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7"
const actualSupabaseCaSha256 = createHash("sha256")
  .update(readFileSync(supabaseCaPath))
  .digest("hex")

if (actualSupabaseCaSha256 !== expectedSupabaseCaSha256) {
  throw new Error("The pinned Supabase certificate authority is invalid.")
}

let runToken = randomBytes(32).toString("base64url")
const runTokenHash = createHash("sha256").update(runToken).digest("hex")

mkdirSync(stateDirectory, { recursive: true, mode: 0o700 })

let lockDescriptor
let lockOwned = false
let childProcess
let forcedShutdownTimer
let stageWatchdogTimer

const writeLockState = (childPid) => {
  ftruncateSync(lockDescriptor, 0)
  writeSync(
    lockDescriptor,
    JSON.stringify({
      pid: process.pid,
      childPid: childPid ?? null,
      runTokenHash,
      acquiredAt: new Date().toISOString(),
      mode,
    }),
    0,
    "utf8",
  )
}

const acquireLock = () => {
  try {
    lockDescriptor = openSync(lockPath, "wx", 0o600)
    lockOwned = true
    writeLockState()
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(
        "The Supabase development lock already exists; verify the prior run before removing that exact lock.",
      )
    }

    throw error
  }
}

const releaseLock = () => {
  if (!lockOwned) {
    return
  }

  if (lockDescriptor !== undefined) {
    closeSync(lockDescriptor)
    lockDescriptor = undefined
  }

  if (!existsSync(lockPath)) {
    throw new Error("The owned Supabase development lock disappeared.")
  }

  let state

  try {
    state = JSON.parse(readFileSync(lockPath, "utf8"))
  } catch {
    throw new Error("The owned Supabase development lock is invalid.")
  }

  if (
    Number(state.pid) !== process.pid ||
    state.runTokenHash !== runTokenHash
  ) {
    throw new Error("The Supabase development lock ownership changed.")
  }

  unlinkSync(lockPath)

  lockOwned = false
}

const childHasExited = () =>
  !childProcess ||
  childProcess.exitCode !== null ||
  childProcess.signalCode !== null

const forceChildTermination = () => {
  if (childHasExited()) {
    return
  }

  spawnSync(
    "taskkill.exe",
    ["/pid", String(childProcess.pid), "/t", "/f"],
    {
      stdio: "ignore",
      shell: false,
      windowsHide: true,
    },
  )
}

const requestShutdown = () => {
  if (forcedShutdownTimer) {
    forceChildTermination()
    return
  }

  forcedShutdownTimer = setTimeout(forceChildTermination, 15_000)
}

process.on("SIGINT", requestShutdown)
process.on("SIGTERM", requestShutdown)

const bootstrapKeys = [
  "PLATFORM_ADMIN_BOOTSTRAP_EMAIL",
  "PLATFORM_ADMIN_BOOTSTRAP_PASSWORD",
  "PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME",
  "PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME",
]
const bootstrapEnvironment = Object.fromEntries(
  bootstrapKeys.map((key) => [key, process.env[key]]),
)

if (mode === "platform-admin") {
  bootstrapEnvironment.PLATFORM_ADMIN_BOOTSTRAP_EMAIL ||=
    promptForPlatformAdminEmail()

  if (!bootstrapEnvironment.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD) {
    const password = promptForHiddenPlatformAdminPassword()
    const confirmation = promptForHiddenPlatformAdminPassword({
      confirmation: true,
    })
    const passwordBytes = Buffer.from(password, "utf8")
    const confirmationBytes = Buffer.from(confirmation, "utf8")
    const passwordsMatch =
      password.length >= 10 &&
      password.length <= 128 &&
      passwordBytes.length === confirmationBytes.length &&
      timingSafeEqual(passwordBytes, confirmationBytes)

    passwordBytes.fill(0)
    confirmationBytes.fill(0)

    if (!passwordsMatch) {
      throw new Error(
        "The Platform Super Admin password entries are invalid or do not match.",
      )
    }

    bootstrapEnvironment.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD = password
  }
}

const childEnvironment = { ...process.env }

for (const key of Object.keys(childEnvironment)) {
  if (
    key.startsWith("TEST_") ||
    key === "ALLOW_REMOTE_ISOLATED_TEST_DATABASE" ||
    key === "ALLOW_DISPOSABLE_DB" ||
    key === "PHASE3A_STOREFRONT_SMOKE" ||
    key === "LABIBTECH_LOCAL_DATABASE_GUARD" ||
    key === "LABIBTECH_LOCAL_RUN_TOKEN" ||
    bootstrapKeys.includes(key)
  ) {
    delete childEnvironment[key]
  }
}

for (const key of bootstrapKeys) {
  delete process.env[key]
}

Object.assign(childEnvironment, {
  NODE_ENV: "development",
  NODE_EXTRA_CA_CERTS: supabaseCaPath,
  DATABASE_URL: credentials.databaseUrl,
  LABIBTECH_SUPABASE_DEVELOPMENT_GUARD: SUPABASE_DEVELOPMENT_GUARD,
  LABIBTECH_SUPABASE_PROJECT_REF: trackedConfig.projectRef,
  LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN: runToken,
})

if (mode !== "probe") {
  Object.assign(childEnvironment, {
    MEDUSA_FF_RBAC: "true",
    PLATFORM_ADMIN_LOGIN_URL: "http://127.0.0.1:5174/",
    STORE_CORS: "http://127.0.0.1:5176,http://localhost:5176",
    ADMIN_CORS:
      "http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:9000,http://localhost:9000",
    AUTH_CORS:
      "http://127.0.0.1:5175,http://localhost:5175,http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:9000,http://localhost:9000",
    SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
    SAAS_SUPPORTED_CURRENCIES: "lyd",
    JWT_SECRET: credentials.jwtSecret,
    COOKIE_SECRET: credentials.cookieSecret,
    VENDOR_SESSION_SECRET: credentials.vendorSessionSecret,
    PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID:
      SUPABASE_DEVELOPMENT_FINGERPRINT_KEY_ID,
    PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({
      [SUPABASE_DEVELOPMENT_FINGERPRINT_KEY_ID]:
        credentials.provisioningFingerprintSecret,
    }),
  })
}

if (mode === "platform-admin") {
  for (const [key, value] of Object.entries(bootstrapEnvironment)) {
    if (value !== undefined) {
      childEnvironment[key] = value
    }
  }
}

const packagePath = require.resolve("@medusajs/cli/package.json")
const cliPath = resolve(dirname(packagePath), "cli.js")
const cliArgs =
  mode === "migrate-core"
    ? ["db:migrate", "--skip-links", "--skip-scripts"]
    : mode === "sync-links-safe"
      ? ["db:sync-links", "--execute-safe"]
      : mode === "migrate-scripts"
        ? ["db:migrate:scripts"]
    : mode === "harden"
      ? ["exec", "./src/scripts/harden-supabase-development.ts"]
      : mode === "platform-admin"
      ? [
          "exec",
          "./src/scripts/ensure-supabase-development-platform-admin.ts",
        ]
      : mode === "demo-portfolio"
        ? [
            "exec",
            "./src/scripts/ensure-supabase-development-demo-portfolio.ts",
          ]
      : ["develop"]
const childArgs =
  mode === "probe"
    ? [resolve(backendDirectory, "scripts", "probe-supabase-development.mjs")]
    : [cliPath, ...cliArgs]
let childStatus = 1
const stageLabels = {
  "migrate-core": "database schema migrations",
  "sync-links-safe": "safe link synchronization",
  "migrate-scripts": "migration scripts",
}
const stageTimeouts = {
  "migrate-core": 10 * 60_000,
  "sync-links-safe": 25 * 60_000,
  "migrate-scripts": 10 * 60_000,
}

try {
  acquireLock()

  console.log(
    mode === "develop"
      ? "Starting the approved Supabase development backend."
      : `Running the approved Supabase development ${stageLabels[mode] || "database command"}.`,
  )
  const stageStartedAt = Date.now()
  childProcess = spawn(process.execPath, childArgs, {
    cwd: backendDirectory,
    env: childEnvironment,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  })
  const stageTimeout = stageTimeouts[mode]
  if (stageTimeout) {
    stageWatchdogTimer = setTimeout(() => {
      console.error(
        `Supabase development ${stageLabels[mode]} exceeded its guarded time limit.`,
      )
      forceChildTermination()
    }, stageTimeout)
  }

  for (const key of bootstrapKeys) {
    bootstrapEnvironment[key] = undefined
    childEnvironment[key] = undefined
  }

  childEnvironment.DATABASE_URL = undefined
  childEnvironment.JWT_SECRET = undefined
  childEnvironment.COOKIE_SECRET = undefined
  childEnvironment.VENDOR_SESSION_SECRET = undefined
  childEnvironment.PROVISIONING_FINGERPRINT_KEYS = undefined
  childEnvironment.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN = undefined
  credentials.databaseUrl = ""
  credentials.jwtSecret = ""
  credentials.cookieSecret = ""
  credentials.vendorSessionSecret = ""
  credentials.provisioningFingerprintSecret = ""
  writeLockState(childProcess.pid)
  runToken = ""

  childStatus = await new Promise((resolveStatus, rejectStatus) => {
    childProcess.once("error", rejectStatus)
    childProcess.once("exit", (code) => resolveStatus(code ?? 1))
  })
  if (mode !== "develop") {
    console.log(
      `Supabase development ${stageLabels[mode] || "database command"} finished in ${Math.max(1, Math.round((Date.now() - stageStartedAt) / 1000))} seconds.`,
    )
  }
  childProcess = undefined
} finally {
  clearTimeout(forcedShutdownTimer)
  clearTimeout(stageWatchdogTimer)

  if (!childHasExited()) {
    forceChildTermination()
  }

  releaseLock()
  runToken = ""
  childEnvironment.DATABASE_URL = undefined
  childEnvironment.JWT_SECRET = undefined
  childEnvironment.COOKIE_SECRET = undefined
  childEnvironment.VENDOR_SESSION_SECRET = undefined
  childEnvironment.PROVISIONING_FINGERPRINT_KEYS = undefined
  childEnvironment.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN = undefined

  for (const key of bootstrapKeys) {
    bootstrapEnvironment[key] = undefined
    childEnvironment[key] = undefined
  }

  credentials.databaseUrl = ""
  credentials.jwtSecret = ""
  credentials.cookieSecret = ""
  credentials.vendorSessionSecret = ""
  credentials.provisioningFingerprintSecret = ""
}

process.exitCode = childStatus
