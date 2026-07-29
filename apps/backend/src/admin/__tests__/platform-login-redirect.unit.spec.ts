import { createPlatformLoginRedirectScript } from "../platform-login-redirect"

const runRedirectScript = (href: string) => {
  const pushState = jest.fn()
  const replaceState = jest.fn()
  const replace = jest.fn()
  const window = {
    location: {
      href,
      origin: new URL(href).origin,
      replace,
    },
    history: {
      pushState,
      replaceState,
    },
    addEventListener: jest.fn(),
  }
  const script = createPlatformLoginRedirectScript({
    adminPath: "/app",
    signInUrl: "http://127.0.0.1:5174/",
  })

  new Function("window", script)(window)

  return { pushState, replaceState, replace, window }
}

describe("platform Admin login redirect", () => {
  it("intercepts Medusa's client-side logout navigation", () => {
    const { pushState, replace, window } = runRedirectScript(
      "http://127.0.0.1:5174/app"
    )

    window.history.pushState({}, "", "/app/login")

    expect(replace).toHaveBeenCalledWith("http://127.0.0.1:5174/")
    expect(pushState).not.toHaveBeenCalled()
  })

  it("redirects a direct request for Medusa's login page", () => {
    const { replace } = runRedirectScript(
      "http://127.0.0.1:5174/app/login"
    )

    expect(replace).toHaveBeenCalledWith("http://127.0.0.1:5174/")
  })

  it("leaves normal Admin navigation unchanged", () => {
    const { pushState, replace, window } = runRedirectScript(
      "http://127.0.0.1:5174/app"
    )

    window.history.pushState({}, "", "/app/orders")

    expect(pushState).toHaveBeenCalledWith({}, "", "/app/orders")
    expect(replace).not.toHaveBeenCalled()
  })
})
