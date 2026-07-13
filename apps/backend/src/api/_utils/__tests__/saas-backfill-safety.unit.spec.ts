import { assertBackfillApplySafety } from "../../../modules/saas/backfill"

const ORIGINAL_ENV = { ...process.env }

describe("SaaS backfill safety", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://local:local@127.0.0.1:55432/local_saas",
    }
    delete process.env.PROTECTED_DATABASE_URL
    delete process.env.TEST_DATABASE_GUARD_VALIDATED
    delete process.env.TEST_DATABASE_DISPOSABLE
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("allows an explicitly local non-production database", () => {
    expect(() => assertBackfillApplySafety()).not.toThrow()
  })

  it("refuses production and remote targets", () => {
    process.env.NODE_ENV = "production"
    expect(() => assertBackfillApplySafety()).toThrow(/disabled in production/i)

    process.env.NODE_ENV = "development"
    process.env.DATABASE_URL =
      "postgresql://isolated:secret@remote.example.test/isolated"
    expect(() => assertBackfillApplySafety()).toThrow(/restricted to local/i)
  })

  it("refuses a protected target without exposing its credential", () => {
    process.env.PROTECTED_DATABASE_URL =
      "postgresql://other:other@127.0.0.1:55432/local_saas"

    expect(() => assertBackfillApplySafety()).toThrow(/protected database target/i)
  })

  it("requires the disposable acknowledgement in test mode", () => {
    process.env.NODE_ENV = "test"
    expect(() => assertBackfillApplySafety()).toThrow(/safety guard/i)

    process.env.TEST_DATABASE_GUARD_VALIDATED = "true"
    process.env.TEST_DATABASE_DISPOSABLE = "medusa_phase05_disposable"
    expect(() => assertBackfillApplySafety()).not.toThrow()
  })
})
