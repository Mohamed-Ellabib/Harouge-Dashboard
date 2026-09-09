import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdkMocks = vi.hoisted(() => ({
  clearToken: vi.fn(),
  clientFetch: vi.fn(),
}))

vi.mock("@medusajs/js-sdk", () => {
  class MockFetchError extends Error {
    status: number | undefined
    statusText: string | undefined

    constructor(message: string, statusText?: string, status?: number) {
      super(message)
      this.name = "FetchError"
      this.statusText = statusText
      this.status = status
    }
  }

  class MockMedusa {
    client = {
      clearToken: sdkMocks.clearToken,
      fetch: sdkMocks.clientFetch,
    }
  }

  return {
    default: MockMedusa,
    FetchError: MockFetchError,
  }
})

const nativeFetch = vi.fn()
const locationAssign = vi.fn()

vi.stubGlobal("fetch", nativeFetch)
vi.stubGlobal("window", {
  clearTimeout: (timeoutId: number) => globalThis.clearTimeout(timeoutId),
  location: {
    assign: locationAssign,
    origin: "http://platform.test",
  },
  setTimeout: (handler: TimerHandler, timeout?: number) =>
    globalThis.setTimeout(handler, timeout),
})

const auth = await import("./platform-auth")
const { FetchError } = await import("@medusajs/js-sdk")

const timeoutMs = 12_000

const response = (status: number, payload?: unknown): Response =>
  ({
    json: vi.fn().mockResolvedValue(payload),
    ok: status >= 200 && status < 300,
    status,
  }) as unknown as Response

const rejectWhenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_, reject) => {
    const rejectAsAborted = () => reject(new DOMException("Aborted", "AbortError"))

    if (signal.aborted) {
      rejectAsAborted()
      return
    }

    signal.addEventListener("abort", rejectAsAborted, { once: true })
  })

describe("platform Admin authentication request deadlines", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sdkMocks.clearToken.mockReset()
    sdkMocks.clearToken.mockResolvedValue(undefined)
    sdkMocks.clientFetch.mockReset()
    nativeFetch.mockReset()
    locationAssign.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("enables remembered access only through an authenticated server request", async () => {
    sdkMocks.clientFetch.mockResolvedValueOnce({ token: "ephemeral-token" }).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ remembered: true })
    nativeFetch.mockResolvedValueOnce(response(200, { authorized: true, actor: { id: "user_test", email: "admin@example.test" } }))
    await auth.signInPlatformAdmin("admin@example.test", "not-a-secret", true)
    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(3, "/auth/platform-session", expect.objectContaining({ method: "POST", body: { remember: true }, headers: { Authorization: "Bearer ephemeral-token" } }))
  })

  it("recovers a lost server session but does not treat a temporary failure as logout", async () => {
    const actor = { id: "user_test", email: "admin@example.test" }
    nativeFetch.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(200, { authorized: true, actor }))
    await expect(auth.getCurrentPlatformAdmin()).resolves.toEqual(actor)
    nativeFetch.mockResolvedValueOnce(response(503))
    let failure: unknown
    try { await auth.getCurrentPlatformAdmin() } catch (error) { failure = error }
    expect(auth.isPlatformSessionRejected(failure)).toBe(false)
    expect(sdkMocks.clientFetch).not.toHaveBeenCalled()
  })

  it("aborts a timed-out login request before a session can be created", async () => {
    let loginSignal: AbortSignal | undefined

    sdkMocks.clientFetch.mockImplementation((path: string, options: RequestInit) => {
      expect(path).toBe("/auth/user/emailpass")
      loginSignal = options.signal ?? undefined
      return rejectWhenAborted(loginSignal as AbortSignal)
    })

    const signIn = auth.signInPlatformAdmin("admin@example.test", "not-a-secret")
    const rejection = expect(signIn).rejects.toBeInstanceOf(auth.PlatformAuthTimeoutError)

    await vi.advanceTimersByTimeAsync(timeoutMs)
    await rejection

    expect(loginSignal?.aborted).toBe(true)
    expect(sdkMocks.clientFetch).toHaveBeenCalledTimes(1)
    expect(nativeFetch).not.toHaveBeenCalled()
  })

  it("cancels timed-out session creation without a late access probe", async () => {
    let sessionSignal: AbortSignal | undefined

    sdkMocks.clientFetch.mockImplementation((path: string, options: RequestInit) => {
      if (path === "/auth/user/emailpass") {
        return Promise.resolve({ token: "short-lived-token" })
      }

      expect(path).toBe("/auth/session")
      expect(options.method).toBe("POST")
      sessionSignal = options.signal ?? undefined
      return rejectWhenAborted(sessionSignal as AbortSignal)
    })

    const signIn = auth.signInPlatformAdmin("admin@example.test", "not-a-secret")
    const rejection = expect(signIn).rejects.toBeInstanceOf(auth.PlatformAuthTimeoutError)

    await vi.advanceTimersByTimeAsync(timeoutMs)
    await rejection

    expect(sessionSignal?.aborted).toBe(true)
    expect(sdkMocks.clientFetch).toHaveBeenCalledTimes(2)
    expect(nativeFetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(timeoutMs)
    expect(nativeFetch).not.toHaveBeenCalled()
  })

  it("preserves invalid-credential FetchError semantics and Arabic messaging", async () => {
    const invalidCredentials = new FetchError("Unauthorized", "Unauthorized", 401)
    sdkMocks.clientFetch.mockRejectedValueOnce(invalidCredentials)

    const signIn = auth.signInPlatformAdmin("admin@example.test", "wrong-password")

    await expect(signIn).rejects.toBe(invalidCredentials)
    expect(auth.platformAuthErrorMessage(invalidCredentials)).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    )
    expect(nativeFetch).not.toHaveBeenCalled()
  })

  it.each([
    {
      expectedMessage: "جارٍ تحويلك لإكمال تسجيل الدخول.",
      name: "redirect",
      response: { location: "https://identity.example.test/continue" },
      sessionExpected: false,
    },
    {
      expectedMessage: "يتطلب هذا الحساب رمز تحقق إضافياً. أكمل التحقق من خلال مسؤول النظام.",
      name: "MFA",
      response: {
        mfa_challenge: { id: "challenge_test" },
        token: "short-lived-token",
      },
      sessionExpected: true,
    },
    {
      expectedMessage: "يجب التحقق من الحساب قبل الدخول إلى لوحة الإدارة.",
      name: "verification",
      response: {
        token: "short-lived-token",
        verification_required: true,
      },
      sessionExpected: true,
    },
  ])("preserves the Medusa $name response flow", async ({
    expectedMessage,
    response: loginResponse,
    sessionExpected,
  }) => {
    sdkMocks.clientFetch.mockResolvedValueOnce(loginResponse)
    if (sessionExpected) {
      sdkMocks.clientFetch.mockResolvedValueOnce(undefined)
    }

    let stepError: unknown
    try {
      await auth.signInPlatformAdmin("admin@example.test", "not-a-secret")
    } catch (error) {
      stepError = error
    }

    expect(stepError).toBeInstanceOf(auth.PlatformAuthStepRequiredError)
    expect(auth.platformAuthErrorMessage(stepError)).toBe(expectedMessage)
    expect(sdkMocks.clientFetch).toHaveBeenCalledTimes(sessionExpected ? 2 : 1)
    expect(nativeFetch).not.toHaveBeenCalled()

    if ("location" in loginResponse) {
      expect(locationAssign).toHaveBeenCalledWith(loginResponse.location)
    } else {
      expect(locationAssign).not.toHaveBeenCalled()
    }
  })

  it("clears a newly created session when Super Admin access is denied", async () => {
    sdkMocks.clientFetch
      .mockResolvedValueOnce({ token: "short-lived-token" })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    nativeFetch.mockResolvedValueOnce(response(403))

    let deniedError: unknown
    try {
      await auth.signInPlatformAdmin("admin@example.test", "not-a-secret")
    } catch (error) {
      deniedError = error
    }

    expect(deniedError).toBeInstanceOf(auth.PlatformAccessDeniedError)
    expect(auth.platformAuthErrorMessage(deniedError)).toBe(
      "هذا الحساب لا يملك صلاحية Super Admin للوصول إلى الإدارة الرئيسية.",
    )
    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/session",
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    )
    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(
      3,
      "/auth/platform-session",
      expect.objectContaining({ method: "DELETE", signal: expect.any(AbortSignal) }),
    )
    expect(sdkMocks.clearToken).toHaveBeenCalledTimes(1)
  })

  it("aborts current-session, logout, and reset requests at their deadlines", async () => {
    let probeSignal: AbortSignal | undefined
    nativeFetch.mockImplementationOnce((_input: RequestInfo | URL, options?: RequestInit) => {
      probeSignal = options?.signal ?? undefined
      return rejectWhenAborted(probeSignal as AbortSignal)
    })

    const currentAdmin = auth.getCurrentPlatformAdmin()
    const probeRejection = expect(currentAdmin).rejects.toBeInstanceOf(
      auth.PlatformAuthTimeoutError,
    )
    await vi.advanceTimersByTimeAsync(timeoutMs)
    await probeRejection
    expect(probeSignal?.aborted).toBe(true)

    let logoutSignal: AbortSignal | undefined
    sdkMocks.clientFetch.mockImplementationOnce((_path: string, options: RequestInit) => {
      logoutSignal = options.signal ?? undefined
      return rejectWhenAborted(logoutSignal as AbortSignal)
    })

    const logout = auth.signOutPlatformAdmin()
    const logoutRejection = expect(logout).rejects.toBeInstanceOf(
      auth.PlatformAuthTimeoutError,
    )
    await vi.advanceTimersByTimeAsync(timeoutMs)
    await logoutRejection
    expect(logoutSignal?.aborted).toBe(true)
    expect(sdkMocks.clearToken).not.toHaveBeenCalled()
    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(
      1,
      "/auth/platform-session",
      expect.objectContaining({ method: "DELETE", signal: expect.any(AbortSignal) }),
    )

    let resetSignal: AbortSignal | undefined
    sdkMocks.clientFetch.mockImplementationOnce((_path: string, options: RequestInit) => {
      resetSignal = options.signal ?? undefined
      return rejectWhenAborted(resetSignal as AbortSignal)
    })

    const reset = auth.requestPlatformPasswordReset("admin@example.test")
    const resetRejection = expect(reset).rejects.toBeInstanceOf(
      auth.PlatformAuthTimeoutError,
    )
    await vi.advanceTimersByTimeAsync(timeoutMs)
    await resetRejection
    expect(resetSignal?.aborted).toBe(true)
    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/user/emailpass/reset-password",
      expect.objectContaining({
        body: { identifier: "admin@example.test" },
        headers: { accept: "text/plain" },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it("creates the session and returns the authorized platform actor on success", async () => {
    const actor = {
      email: "admin@example.test",
      first_name: "Admin",
      id: "user_test",
    }
    sdkMocks.clientFetch
      .mockResolvedValueOnce({ token: "short-lived-token" })
      .mockResolvedValueOnce(undefined)
    nativeFetch.mockResolvedValueOnce(response(200, { actor, authorized: true }))

    await expect(
      auth.signInPlatformAdmin("admin@example.test", "not-a-secret"),
    ).resolves.toEqual(actor)

    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(
      1,
      "/auth/user/emailpass",
      expect.objectContaining({
        body: { email: "admin@example.test", password: "not-a-secret" },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    )
    expect(sdkMocks.clientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/session",
      expect.objectContaining({
        headers: { Authorization: "Bearer short-lived-token" },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    )
    expect(nativeFetch).toHaveBeenCalledWith(
      "http://platform.test/admin/saas/access",
      expect.objectContaining({
        credentials: "include",
        signal: expect.any(AbortSignal),
      }),
    )
    expect(sdkMocks.clearToken).not.toHaveBeenCalled()
  })
})
