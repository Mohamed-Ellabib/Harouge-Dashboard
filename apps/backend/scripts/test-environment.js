/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
const { existsSync, readFileSync } = require("fs")
const { resolve } = require("path")

const DISPOSABLE_DATABASE_NAME = "medusa_phase05_disposable"
const DISPOSABLE_ACKNOWLEDGEMENT = "medusa_phase05_disposable"

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
  const isolatedRemoteApproved =
    process.env.ALLOW_REMOTE_ISOLATED_TEST_DATABASE === "true" &&
    Boolean(process.env.TEST_DATABASE_BRANCH_ID)

  if (!isLocal && !isolatedRemoteApproved) {
    throw new Error(
      "Remote test databases require an explicit isolated branch identifier."
    )
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

module.exports = {
  DISPOSABLE_DATABASE_NAME,
  assertSafeTestDatabase,
  loadTestEnvironment,
}
