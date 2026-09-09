import { spawn, spawnSync } from "node:child_process"
import { createHash, createHmac, randomBytes } from "node:crypto"
import { createRequire } from "node:module"
import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs"
import { createConnection } from "node:net"
import { homedir } from "node:os"
import { dirname, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import EmbeddedPostgres from "embedded-postgres"

const LOCAL_DATABASE_HOST = "127.0.0.1"
const LOCAL_DATABASE_PORT = 55433
const LOCAL_DATABASE_NAME = "labibtech_commerce_local"
const LOCAL_DATABASE_USER = "labibtech_local"
const LOCAL_GUARD_VALUE = "validated-v1"
const LOCAL_STATE_FOLDER = "LabibTech-Commerce-SaaS"

const nodeMajor = Number(process.versions.node.split(".")[0])

if (!Number.isInteger(nodeMajor) || nodeMajor < 20 || nodeMajor >= 24) {
  throw new Error("Local Medusa development requires Node.js 20 through 23.")
}

if (process.platform !== "win32") {
  throw new Error(
    "The local credential store currently requires Windows DPAPI.",
  )
}

const require = createRequire(import.meta.url)
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const backendDirectory = resolve(scriptDirectory, "..")
const workspaceDirectory = resolve(backendDirectory, "..", "..")
const localAppData = process.env.LOCALAPPDATA?.trim()

if (!localAppData) {
  throw new Error("LOCALAPPDATA is required for the persistent local database.")
}

const stateDirectory = resolve(
  localAppData || resolve(homedir(), "AppData", "Local"),
  LOCAL_STATE_FOLDER,
  "local-dev",
)
const normalizedStateDirectory = stateDirectory.toLowerCase()
const normalizedWorkspaceDirectory = `${workspaceDirectory.toLowerCase()}${sep}`

if (normalizedStateDirectory.startsWith(normalizedWorkspaceDirectory)) {
  throw new Error("Local PostgreSQL state must remain outside the repository.")
}

const databaseDirectory = resolve(stateDirectory, "postgres-v18")
const passwordPath = resolve(stateDirectory, "postgres-password.dpapi")
const lockPath = resolve(stateDirectory, "local-postgres-run.lock")

mkdirSync(stateDirectory, { recursive: true })
mkdirSync(databaseDirectory, { recursive: true })

const powerShell = (script, input) => {
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
    {
      encoding: "utf8",
      input,
      shell: false,
      windowsHide: true,
    },
  )

  if (result.error || result.status !== 0) {
    throw new Error("The Windows credential store operation failed.")
  }

  return result.stdout.trim()
}

const protectSecret = (secret) =>
  powerShell(
    "$plain=[Console]::In.ReadToEnd();" +
      "$secure=ConvertTo-SecureString $plain -AsPlainText -Force;" +
      "ConvertFrom-SecureString $secure",
    secret,
  )

const unprotectSecret = (protectedSecret) =>
  powerShell(
    "$cipher=[Console]::In.ReadToEnd();" +
      "$secure=ConvertTo-SecureString $cipher;" +
      "$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);" +
      "try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}" +
      "finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}",
    protectedSecret,
  )

const databaseIsInitialized = existsSync(resolve(databaseDirectory, "PG_VERSION"))

if (databaseIsInitialized && !existsSync(passwordPath)) {
  throw new Error(
    "The local PostgreSQL credential is missing. Refusing to rotate or reset it automatically.",
  )
}

if (!existsSync(passwordPath)) {
  const generatedPassword = randomBytes(32).toString("base64url")
  const protectedPassword = protectSecret(generatedPassword)

  if (!protectedPassword) {
    throw new Error("The local PostgreSQL credential could not be protected.")
  }

  writeFileSync(passwordPath, protectedPassword, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  })
}

let databasePassword = unprotectSecret(readFileSync(passwordPath, "utf8"))
let localRunToken = randomBytes(32).toString("base64url")

if (!databasePassword) {
  throw new Error("The local PostgreSQL credential could not be decrypted.")
}

const deriveLocalSecret = (purpose) =>
  createHmac("sha256", databasePassword).update(purpose).digest("base64url")

const databaseUrl =
  `postgres://${encodeURIComponent(LOCAL_DATABASE_USER)}:` +
  `${encodeURIComponent(databasePassword)}@${LOCAL_DATABASE_HOST}:` +
  `${LOCAL_DATABASE_PORT}/${LOCAL_DATABASE_NAME}`

const mode = process.argv[2]
const supportedModes = new Set(["migrate", "platform-admin", "develop"])

if (!supportedModes.has(mode)) {
  throw new Error(
    "Use one local mode: migrate, platform-admin, or develop.",
  )
}

const processIsAlive = (pid) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code !== "ESRCH"
  }
}

const portIsOpen = () =>
  new Promise((resolvePort) => {
    const socket = createConnection({
      host: LOCAL_DATABASE_HOST,
      port: LOCAL_DATABASE_PORT,
    })
    const finish = (open) => {
      socket.destroy()
      resolvePort(open)
    }

    socket.setTimeout(1_500)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
  })

const stopStaleExactPostgres = async () => {
  if (!existsSync(resolve(databaseDirectory, "PG_VERSION"))) {
    return
  }

  const { pg_ctl: pgCtl } = await import("@embedded-postgres/windows-x64")
  const status = spawnSync(pgCtl, ["status", "-D", databaseDirectory], {
    stdio: "ignore",
    shell: false,
    timeout: 10_000,
    windowsHide: true,
  })

  if (status.status !== 0) {
    return
  }

  const stop = spawnSync(
    pgCtl,
    ["stop", "-D", databaseDirectory, "-m", "fast", "-w", "-t", "30"],
    {
      stdio: "ignore",
      shell: false,
      timeout: 35_000,
      windowsHide: true,
    },
  )

  if (stop.error || stop.status !== 0 || (await portIsOpen())) {
    throw new Error("The stale local PostgreSQL process did not stop cleanly.")
  }
}

let lockDescriptor
let lockOwned = false
let childProcess
let postgresStarted = false
let forcedShutdownTimer

const writeLockState = (childPid) => {
  ftruncateSync(lockDescriptor, 0)
  writeSync(
    lockDescriptor,
    JSON.stringify({
      pid: process.pid,
      childPid: childPid ?? null,
      runTokenHash: createHash("sha256").update(localRunToken).digest("hex"),
      acquiredAt: new Date().toISOString(),
    }),
    0,
    "utf8",
  )
}

const acquireLock = async () => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      lockDescriptor = openSync(lockPath, "wx", 0o600)
      lockOwned = true
      writeLockState()
      return
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error
      }

      let ownerPid = 0
      let childPid = 0
      let lockAge = 0

      try {
        const state = JSON.parse(readFileSync(lockPath, "utf8"))
        ownerPid = Number(state.pid)
        childPid = Number(state.childPid)
      } catch {
        lockAge = Date.now() - statSync(lockPath).mtimeMs
      }

      if (processIsAlive(ownerPid) || processIsAlive(childPid)) {
        throw new Error("The persistent local PostgreSQL database is in use.")
      }

      if (!ownerPid && lockAge < 30_000) {
        throw new Error("The local PostgreSQL lock is still being initialized.")
      }

      await stopStaleExactPostgres()
      unlinkSync(lockPath)
    }
  }

  throw new Error("The local PostgreSQL lock could not be acquired.")
}

const releaseLock = () => {
  if (!lockOwned) {
    return
  }

  if (lockDescriptor !== undefined) {
    closeSync(lockDescriptor)
    lockDescriptor = undefined
  }

  if (existsSync(lockPath)) {
    unlinkSync(lockPath)
  }

  lockOwned = false
}

const postgres = new EmbeddedPostgres({
  databaseDir: databaseDirectory,
  port: LOCAL_DATABASE_PORT,
  user: LOCAL_DATABASE_USER,
  password: databasePassword,
  authMethod: "scram-sha-256",
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", LOCAL_DATABASE_HOST],
  onLog: () => undefined,
  onError: () => undefined,
})

const stopOwnedPostgres = async () => {
  if (!postgresStarted && !postgres.process) {
    return
  }

  const postgresProcess = postgres.process

  if (!postgresProcess) {
    throw new Error("The owned local PostgreSQL process is unavailable.")
  }

  const postgresPid = postgresProcess.pid

  if (!Number.isSafeInteger(postgresPid) || postgresPid <= 0) {
    throw new Error("The owned local PostgreSQL process ID is invalid.")
  }

  if (processIsAlive(postgresPid)) {
    const { pg_ctl: pgCtl } = await import("@embedded-postgres/windows-x64")
    const result = spawnSync(
      pgCtl,
      ["stop", "-D", databaseDirectory, "-m", "fast", "-w", "-t", "30"],
      {
        stdio: "ignore",
        shell: false,
        timeout: 35_000,
        windowsHide: true,
      },
    )

    if (result.error || (result.status !== 0 && processIsAlive(postgresPid))) {
      throw new Error("The owned local PostgreSQL process did not stop cleanly.")
    }
  }

  if (processIsAlive(postgresPid)) {
    throw new Error("The owned local PostgreSQL process remained alive.")
  }

  postgres.process = undefined
  postgresStarted = false
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

let childStatus = 1

try {
  await acquireLock()

  if (await portIsOpen()) {
    throw new Error(
      `Port ${LOCAL_DATABASE_PORT} is already in use; refusing to attach to an unowned database.`,
    )
  }

  if (!databaseIsInitialized) {
    await postgres.initialise()
  }

  await postgres.start()
  postgresStarted = true

  const postgresClient = postgres.getPgClient("postgres", LOCAL_DATABASE_HOST)
  await postgresClient.connect()
  const existingDatabase = await postgresClient.query(
    "select 1 from pg_database where datname = $1",
    [LOCAL_DATABASE_NAME],
  )
  await postgresClient.end()

  if (!existingDatabase.rowCount) {
    await postgres.createDatabase(LOCAL_DATABASE_NAME)
  }

  console.log(
    `Persistent local PostgreSQL is ready on ${LOCAL_DATABASE_HOST}:` +
      `${LOCAL_DATABASE_PORT}/${LOCAL_DATABASE_NAME}.`,
  )

  const packagePath = require.resolve("@medusajs/cli/package.json")
  const cliPath = resolve(dirname(packagePath), "cli.js")
  const cliArgs =
    mode === "migrate"
      ? ["db:migrate"]
      : mode === "platform-admin"
        ? ["exec", "./src/scripts/ensure-local-platform-admin.ts"]
        : ["develop"]
  const bootstrapEnvironment = {
    PLATFORM_ADMIN_BOOTSTRAP_EMAIL:
      process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL,
    PLATFORM_ADMIN_BOOTSTRAP_PASSWORD:
      process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD,
    PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME:
      process.env.PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME,
    PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME:
      process.env.PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME,
  }
  const childEnvironment = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl,
    LABIBTECH_LOCAL_DATABASE_GUARD: LOCAL_GUARD_VALUE,
    MEDUSA_FF_RBAC: "true",
    PLATFORM_ADMIN_LOGIN_URL: "http://127.0.0.1:5174/",
    STORE_CORS: "http://127.0.0.1:5176,http://localhost:5176",
    ADMIN_CORS:
      "http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:9000,http://localhost:9000",
    AUTH_CORS:
      "http://127.0.0.1:5175,http://localhost:5175,http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:9000,http://localhost:9000",
    SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
    SAAS_SUPPORTED_CURRENCIES: "lyd",
    JWT_SECRET: deriveLocalSecret("local-jwt-v1"),
    COOKIE_SECRET: deriveLocalSecret("local-cookie-v1"),
    PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID: "local-v1",
    PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({
      "local-v1": deriveLocalSecret("local-provisioning-fingerprint-v1"),
    }),
  }

  delete childEnvironment.LABIBTECH_LOCAL_RUN_TOKEN

  for (const key of Object.keys(bootstrapEnvironment)) {
    delete childEnvironment[key]
    delete process.env[key]
  }

  if (mode === "platform-admin") {
    for (const [key, value] of Object.entries(bootstrapEnvironment)) {
      if (value !== undefined) {
        childEnvironment[key] = value
      }
    }
    childEnvironment.LABIBTECH_LOCAL_RUN_TOKEN = localRunToken
  }

  childProcess = spawn(process.execPath, [cliPath, ...cliArgs], {
    cwd: backendDirectory,
    env: childEnvironment,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  })

  for (const key of Object.keys(bootstrapEnvironment)) {
    bootstrapEnvironment[key] = undefined
    childEnvironment[key] = undefined
  }
  childEnvironment.LABIBTECH_LOCAL_RUN_TOKEN = undefined
  databasePassword = ""
  writeLockState(childProcess.pid)
  localRunToken = ""

  childStatus = await new Promise((resolveStatus, rejectStatus) => {
    childProcess.once("error", rejectStatus)
    childProcess.once("exit", (code) => resolveStatus(code ?? 1))
  })
  childProcess = undefined
} finally {
  clearTimeout(forcedShutdownTimer)

  let stopError

  try {
    await stopOwnedPostgres()
  } catch (error) {
    stopError = error
  }

  releaseLock()
  databasePassword = ""
  localRunToken = ""

  if (stopError) {
    throw stopError
  }
}

process.exitCode = childStatus
