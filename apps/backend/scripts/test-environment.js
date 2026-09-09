/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
const { createHash, timingSafeEqual } = require("crypto")
const { existsSync, readFileSync } = require("fs")
const { tmpdir } = require("os")
const { resolve } = require("path")

const DISPOSABLE_DATABASE_NAME = "medusa_phase05_disposable"
const DISPOSABLE_ACKNOWLEDGEMENT = "medusa_phase05_disposable"
const DISPOSABLE_DATABASE_GUARD = "validated-v1"
const DISPOSABLE_DATABASE_LOCK_PATH = resolve(
  tmpdir(),
  "medusa-phase05",
  "test-data",
  "locks",
  "disposable-postgres-run.lock"
)

const loadEnvironmentFile = (filePath) => {
  if (!existsSync(filePath)) {
    return
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const separator = line.indexOf("=")

    if (separator <= 0) {
      continue
    }

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const loadTestEnvironment = (cwd = process.cwd()) => {
  loadEnvironmentFile(resolve(cwd, ".env.test"))
  loadEnvironmentFile(resolve(cwd, ".env.test.local"))
}

const normalizedDatabaseIdentity = (value) => {
  const url = new URL(value)
  url.password = ""
  url.searchParams.sort()

  return url.toString()
}

const assertSafeTestDatabase = () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Refusing test database access unless NODE_ENV=test.")
  }

  const testDatabaseUrl = process.env.TEST_DATABASE_URL

  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for backend tests.")
  }

  if (
    process.env.DATABASE_URL &&
    normalizedDatabaseIdentity(testDatabaseUrl) ===
      normalizedDatabaseIdentity(process.env.DATABASE_URL) &&
    process.env.TEST_DATABASE_GUARD_VALIDATED !== "true"
  ) {
    throw new Error("TEST_DATABASE_URL must not equal DATABASE_URL.")
  }

  if (
    process.env.TEST_DATABASE_DISPOSABLE !== DISPOSABLE_ACKNOWLEDGEMENT
  ) {
    throw new Error(
      "TEST_DATABASE_DISPOSABLE must explicitly identify the disposable test database."
    )
  }

  const url = new URL(testDatabaseUrl)

  if (!/^postgres(?:ql)?:$/.test(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must use PostgreSQL.")
  }

  if (url.pathname.slice(1) !== DISPOSABLE_DATABASE_NAME) {
    throw new Error(
      `TEST_DATABASE_URL must select ${DISPOSABLE_DATABASE_NAME}.`
    )
  }

  const isLocal = ["127.0.0.1", "localhost", "::1"].includes(url.hostname)

  if (!isLocal) {
    throw new Error("Backend tests require loopback disposable PostgreSQL.")
  }

  process.env.DB_HOST = url.hostname
  process.env.DB_PORT = url.port || "5432"
  process.env.DB_USERNAME = decodeURIComponent(url.username)
  process.env.DB_PASSWORD = decodeURIComponent(url.password)
  process.env.DB_WAITINGROOM_DATABASE = "postgres"

  return {
    databaseName: DISPOSABLE_DATABASE_NAME,
    host: url.hostname,
    port: url.port || "5432",
  }
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

const assertOwnedDisposableDatabaseRun = () => {
  const runToken = process.env.LABIBTECH_DISPOSABLE_TEST_RUN_TOKEN || ""
  const configuredLockPath = resolve(
    process.env.DISPOSABLE_DATABASE_LOCK_PATH || ""
  )

  if (
    process.env.LABIBTECH_DISPOSABLE_TEST_DATABASE_GUARD !==
      DISPOSABLE_DATABASE_GUARD ||
    process.env.DISPOSABLE_DATABASE_RUN_LOCK_HELD !== "true" ||
    configuredLockPath !== DISPOSABLE_DATABASE_LOCK_PATH ||
    !runToken ||
    !existsSync(DISPOSABLE_DATABASE_LOCK_PATH)
  ) {
    throw new Error(
      "The owned disposable PostgreSQL run context is required."
    )
  }

  let lockState

  try {
    lockState = JSON.parse(readFileSync(DISPOSABLE_DATABASE_LOCK_PATH, "utf8"))
  } catch {
    throw new Error("The disposable PostgreSQL ownership lock is invalid.")
  }

  const expectedTokenHash = createHash("sha256")
    .update(runToken)
    .digest()
  const actualTokenHash = Buffer.from(lockState.runTokenHash || "", "hex")
  const childPidMatches =
    Number(lockState.childPid) === process.pid ||
    (lockState.childPid === null && Number(lockState.pid) === process.ppid)

  if (
    !childPidMatches ||
    !processIsAlive(Number(lockState.pid)) ||
    actualTokenHash.length !== expectedTokenHash.length ||
    !timingSafeEqual(actualTokenHash, expectedTokenHash)
  ) {
    throw new Error("The disposable PostgreSQL ownership lock is not current.")
  }

  return lockState
}

module.exports = {
  DISPOSABLE_DATABASE_GUARD,
  DISPOSABLE_DATABASE_LOCK_PATH,
  DISPOSABLE_DATABASE_NAME,
  assertOwnedDisposableDatabaseRun,
  assertSafeTestDatabase,
  loadTestEnvironment,
}
