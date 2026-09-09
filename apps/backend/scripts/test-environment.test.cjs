const assert = require("node:assert/strict")
const { afterEach, test } = require("node:test")

const {
  assertOwnedDisposableDatabaseRun,
  assertSafeTestDatabase,
} = require("./test-environment")

const originalEnvironment = { ...process.env }

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) {
      delete process.env[key]
    }
  }

  Object.assign(process.env, originalEnvironment)
})

const configureTestTarget = (hostname) => {
  process.env.NODE_ENV = "test"
  process.env.TEST_DATABASE_URL =
    `postgresql://test-user@${hostname}:55432/` +
    "medusa_phase05_disposable"
  process.env.TEST_DATABASE_DISPOSABLE = "medusa_phase05_disposable"
  delete process.env.DATABASE_URL
  delete process.env.TEST_DATABASE_GUARD_VALIDATED
}

test("accepts only the exact loopback disposable test identity", () => {
  configureTestTarget("127.0.0.1")

  assert.deepEqual(assertSafeTestDatabase(), {
    databaseName: "medusa_phase05_disposable",
    host: "127.0.0.1",
    port: "55432",
  })
})

test("rejects remote targets even when legacy override flags are present", () => {
  configureTestTarget("database.example.invalid")
  process.env.ALLOW_REMOTE_ISOLATED_TEST_DATABASE = "true"
  process.env.TEST_DATABASE_BRANCH_ID = "legacy-override"

  assert.throws(
    () => assertSafeTestDatabase(),
    /loopback disposable PostgreSQL/,
  )
})

test("rejects direct internal test execution without live wrapper ownership", () => {
  configureTestTarget("127.0.0.1")
  assertSafeTestDatabase()
  delete process.env.LABIBTECH_DISPOSABLE_TEST_DATABASE_GUARD
  delete process.env.LABIBTECH_DISPOSABLE_TEST_RUN_TOKEN
  delete process.env.DISPOSABLE_DATABASE_RUN_LOCK_HELD
  delete process.env.DISPOSABLE_DATABASE_LOCK_PATH

  assert.throws(
    () => assertOwnedDisposableDatabaseRun(),
    /owned disposable PostgreSQL run context/,
  )
})

