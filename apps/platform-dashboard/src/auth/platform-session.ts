let restoration: Promise<boolean> | undefined

// One recovery request for concurrent dashboard calls. Credentials stay in
// HttpOnly cookies; no password or bearer token is saved in browser storage.
export function restorePlatformSession(): Promise<boolean> {
  if (restoration) return restoration
  restoration = (async () => {
    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => controller.abort(), 12_000)
    try {
      const configured = import.meta.env.VITE_MEDUSA_BACKEND_URL?.trim().replace(/\/+$/, "")
      const response = await fetch(`${configured || ""}/auth/platform-session`, {
        credentials: "include", cache: "no-store", signal: controller.signal,
        headers: { Accept: "application/json" },
      })
      if (response.status === 401 || response.status === 403) return false
      if (!response.ok) throw new Error("Session recovery is temporarily unavailable.")
      return true
    } finally { globalThis.clearTimeout(timeout) }
  })().finally(() => { restoration = undefined })
  return restoration
}
