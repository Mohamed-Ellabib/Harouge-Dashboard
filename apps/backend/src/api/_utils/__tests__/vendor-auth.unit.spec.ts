import {
  MAX_VENDOR_PASSWORD_LENGTH,
  createVendorSessionToken,
  getVendorSessionVersion,
  hashVendorPassword,
  nextVendorSessionVersion,
  normalizeVendorPassword,
  verifyVendorPassword,
  verifyVendorSessionToken,
} from "../vendor-auth"

describe("vendor authentication primitives", () => {
  it("hashes and verifies passwords asynchronously", async () => {
    const hash = await hashVendorPassword("correct horse battery staple")

    await expect(
      verifyVendorPassword("correct horse battery staple", hash)
    ).resolves.toBe(true)
    await expect(verifyVendorPassword("wrong password", hash)).resolves.toBe(
      false
    )
  })

  it("keeps the event loop responsive during password verification", async () => {
    const hash = await hashVendorPassword("correct horse battery staple")
    let settled = false
    const verification = verifyVendorPassword(
      "correct horse battery staple",
      hash
    ).finally(() => {
      settled = true
    })

    await new Promise<void>((resolve) => setImmediate(resolve))

    expect(settled).toBe(false)
    await expect(verification).resolves.toBe(true)
  })

  it("rejects passwords beyond the documented maximum without truncation", async () => {
    const oversized = "x".repeat(MAX_VENDOR_PASSWORD_LENGTH + 1)

    expect(normalizeVendorPassword(oversized)).toBeNull()
    await expect(verifyVendorPassword(oversized, "invalid")).resolves.toBe(false)
  })

  it("accepts strong passphrases within the maximum", () => {
    expect(normalizeVendorPassword("a strong passphrase with spaces")).toBe(
      "a strong passphrase with spaces"
    )
  })

  it("binds signed sessions to a server-validated version", () => {
    const { token } = createVendorSessionToken({
      member_id: "member_a",
      vendor_id: "vendor_a",
      store_profile_id: "profile_a",
      session_version: 4,
    })

    expect(verifyVendorSessionToken(token)).toMatchObject({
      member_id: "member_a",
      vendor_id: "vendor_a",
      store_profile_id: "profile_a",
      session_version: 4,
    })
  })

  it("increments session versions safely from metadata", () => {
    expect(getVendorSessionVersion({ session_version: 2 })).toBe(2)
    expect(nextVendorSessionVersion({ session_version: 2 })).toBe(3)
    expect(nextVendorSessionVersion({ session_version: "invalid" })).toBe(1)
  })
})
