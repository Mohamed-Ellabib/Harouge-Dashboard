const {
  assertSafeTestDatabase,
} = require("../../scripts/test-environment")

describe("test database safety guard", () => {
  const originalEnvironment = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: "test",
      TEST_DATABASE_DISPOSABLE: "medusa_phase05_disposable",
      TEST_DATABASE_URL:
        "postgres://test-user:test-password@127.0.0.1:55432/medusa_phase05_disposable",
      DATABASE_URL:
        "postgres://application:application-password@remote.invalid/application",
    }
    delete process.env.TEST_DATABASE_GUARD_VALIDATED
  })

  afterAll(() => {
    process.env = originalEnvironment
  })

  it("accepts an explicitly identified local disposable database", () => {
    expect(assertSafeTestDatabase()).toMatchObject({
      databaseName: "medusa_phase05_disposable",
      host: "127.0.0.1",
      port: "55432",
    })
  })

  it("rejects a missing test URL", () => {
    delete process.env.TEST_DATABASE_URL
    expect(assertSafeTestDatabase).toThrow("TEST_DATABASE_URL is required")
  })

  it("rejects the normal application database", () => {
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL
    expect(assertSafeTestDatabase).toThrow("must not equal DATABASE_URL")
  })

  it("rejects execution outside NODE_ENV test", () => {
    process.env.NODE_ENV = "development"
    expect(assertSafeTestDatabase).toThrow("NODE_ENV=test")
  })

  it("rejects a missing disposable acknowledgement", () => {
    delete process.env.TEST_DATABASE_DISPOSABLE
    expect(assertSafeTestDatabase).toThrow("must explicitly identify")
  })
})
