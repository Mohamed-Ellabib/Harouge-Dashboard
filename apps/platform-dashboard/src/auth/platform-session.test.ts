import { afterEach, describe, expect, it, vi } from "vitest"
import { restorePlatformSession } from "./platform-session"
import { platformRequest } from "../dashboard/api"

afterEach(() => vi.unstubAllGlobals())
const response = (status: number, body: unknown = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body })

describe("remembered platform session recovery", () => {
  it("shares one restoration across simultaneous requests and retries the original requests once", async () => {
    const counts = new Map<string, number>()
    const fetch = vi.fn(async (url: string) => {
      const count = (counts.get(url) ?? 0) + 1
      counts.set(url, count)
      return response(url === "/auth/platform-session" || count > 1 ? 200 : 401, { saved: true })
    })
    vi.stubGlobal("fetch", fetch)
    const [a, b] = await Promise.all([platformRequest("/admin/saas/a"), platformRequest("/admin/saas/b")])
    expect(a).toEqual({ saved: true }); expect(b).toEqual({ saved: true })
    expect(counts.get("/auth/platform-session")).toBe(1)
    expect(counts.get("/admin/saas/a")).toBe(2)
    expect(counts.get("/admin/saas/b")).toBe(2)
    expect(fetch.mock.calls.find(([url]) => url === "/auth/platform-session")).toBeTruthy()
  })
  it("does not replay rejected credentials or retry a mutation after a server error", async () => {
    const fetch = vi.fn().mockResolvedValue(response(401))
    vi.stubGlobal("fetch", fetch)
    await expect(platformRequest("/admin/saas/save", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(2)
    fetch.mockClear().mockResolvedValue(response(503))
    await expect(platformRequest("/admin/saas/save", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 503 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("keeps temporary recovery failures distinct from rejected sign-in and allows a later retry", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("Offline")).mockResolvedValueOnce(response(200))
    vi.stubGlobal("fetch", fetch)
    await expect(restorePlatformSession()).rejects.toThrow("Offline")
    await expect(restorePlatformSession()).resolves.toBe(true)
    expect(fetch).toHaveBeenLastCalledWith("/auth/platform-session", expect.objectContaining({ credentials: "include", cache: "no-store", signal: expect.any(AbortSignal) }))
  })
})
