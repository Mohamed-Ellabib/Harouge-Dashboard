import { spawnSync } from "node:child_process"
import { request as httpRequest } from "node:http"
import { performance } from "node:perf_hooks"

export const SUPABASE_DEVELOPMENT_HEALTH_URL =
  "http://127.0.0.1:9000/health"
export const SUPABASE_DEVELOPMENT_HEALTH_TIMEOUT_MS = 2_500
export const SUPABASE_DEVELOPMENT_SLOW_HEALTH_MS = 1_000
export const SUPABASE_DEVELOPMENT_HEALTH_ATTEMPTS = 3

const RUN_TOKEN_HASH_PATTERN = /^[a-f0-9]{64}$/
const SUPABASE_DEVELOPMENT_MODES = new Set([
  "develop",
  "harden",
  "migrate-core",
  "sync-links-safe",
  "migrate-scripts",
  "platform-admin",
  "demo-portfolio",
  "probe",
])
const LOCK_STATE_KEYS = new Set([
  "pid",
  "childPid",
  "runTokenHash",
  "acquiredAt",
  "mode",
  "purpose",
])

const isProcessId = (value) =>
  Number.isSafeInteger(value) && value > 0

const isExactIsoTimestamp = (value) => {
  if (typeof value !== "string" || value.length > 64) {
    return false
  }

  try {
    return new Date(value).toISOString() === value
  } catch {
    return false
  }
}

export const parseSupabaseDevelopmentLockState = (serialized) => {
  let state

  try {
    state = JSON.parse(serialized)
  } catch {
    throw new Error("The guarded development lock is invalid.")
  }

  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    Object.keys(state).some((key) => !LOCK_STATE_KEYS.has(key)) ||
    !isProcessId(state.pid) ||
    !(state.childPid === null || isProcessId(state.childPid)) ||
    typeof state.runTokenHash !== "string" ||
    !RUN_TOKEN_HASH_PATTERN.test(state.runTokenHash) ||
    !isExactIsoTimestamp(state.acquiredAt)
  ) {
    throw new Error("The guarded development lock is invalid.")
  }

  const hasMode = Object.hasOwn(state, "mode")
  const hasPurpose = Object.hasOwn(state, "purpose")

  if (
    (hasMode &&
      (typeof state.mode !== "string" ||
        !SUPABASE_DEVELOPMENT_MODES.has(state.mode))) ||
    (hasPurpose && state.purpose !== "password-rotation") ||
    (hasMode && hasPurpose)
  ) {
    throw new Error("The guarded development lock is invalid.")
  }

  return {
    pid: state.pid,
    childPid: state.childPid,
    acquiredAt: state.acquiredAt,
    mode: hasMode ? state.mode : null,
    purpose: hasPurpose ? state.purpose : null,
    legacy: !hasMode && !hasPurpose,
  }
}

export const normalizeWindowsProcessRecords = (value) => {
  const records = Array.isArray(value) ? value : value ? [value] : []

  return records.flatMap((record) => {
    const pid = Number(record?.ProcessId)
    const parentPid =
      record?.ParentProcessId === undefined ||
      record?.ParentProcessId === null
        ? null
        : Number(record.ParentProcessId)
    const name = typeof record?.Name === "string" ? record.Name : ""
    const startedAt =
      typeof record?.StartedAt === "string" &&
      Number.isFinite(Date.parse(record.StartedAt))
        ? record.StartedAt
        : null

    if (
      !isProcessId(pid) ||
      !(
        parentPid === null ||
        (Number.isSafeInteger(parentPid) && parentPid >= 0)
      )
    ) {
      return []
    }

    return [{ pid, parentPid, name, startedAt }]
  })
}

export const inspectGuardedProcessOwnership = ({
  lockState,
  processRecords,
}) => {
  const processById = new Map(
    processRecords.map((record) => [record.pid, record]),
  )
  const owner = processById.get(lockState.pid)

  if (!owner) {
    return {
      state: "stale-owner",
      verified: false,
      developOwned: false,
    }
  }

  const lockAcquiredAt = Date.parse(lockState.acquiredAt)
  const ownerStartedAt = owner.startedAt
    ? Date.parse(owner.startedAt)
    : null

  if (
    ownerStartedAt !== null &&
    ownerStartedAt > lockAcquiredAt + 1_000
  ) {
    return {
      state: "owner-pid-reused",
      verified: false,
      developOwned: false,
    }
  }

  if (lockState.childPid === null) {
    const credentialRotation = lockState.purpose === "password-rotation"

    return {
      state: credentialRotation ? "credential-rotation" : "starting",
      verified: true,
      developOwned: false,
    }
  }

  const child = processById.get(lockState.childPid)

  if (!child) {
    return {
      state: "child-transition",
      verified: false,
      developOwned: false,
    }
  }

  const childStartedAt = child.startedAt
    ? Date.parse(child.startedAt)
    : null

  if (
    childStartedAt !== null &&
    childStartedAt < lockAcquiredAt - 1_000
  ) {
    return {
      state: "child-pid-reused",
      verified: false,
      developOwned: false,
    }
  }

  if (child.parentPid !== null && child.parentPid !== lockState.pid) {
    return {
      state: "child-parent-mismatch",
      verified: false,
      developOwned: false,
    }
  }

  const lineageSuffix = child.parentPid === null ? "-recorded" : "-owned"

  if (lockState.mode === "develop") {
    return {
      state: `develop${lineageSuffix}`,
      verified: true,
      developOwned: true,
    }
  }

  if (lockState.mode) {
    return {
      state: `guarded-command${lineageSuffix}`,
      verified: true,
      developOwned: false,
    }
  }

  return {
    state: `legacy${lineageSuffix}`,
    verified: true,
    developOwned: false,
  }
}

export const queryWindowsProcessRecords = (processIds) => {
  const ids = [...new Set(processIds)]
    .map(Number)
    .filter(isProcessId)

  if (ids.length === 0) {
    return { ok: true, records: [] }
  }

  const filter = ids.map((pid) => `ProcessId = ${pid}`).join(" OR ")
  const script =
    "$ErrorActionPreference = 'Stop'; " +
    `$items = @(Get-CimInstance Win32_Process -Filter '${filter}' | ` +
    "Select-Object ProcessId, ParentProcessId, Name); " +
    "ConvertTo-Json -InputObject $items -Compress"
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
      windowsHide: true,
    },
  )

  if (!result.error && result.status === 0 && result.stdout?.trim()) {
    try {
      return {
        ok: true,
        records: normalizeWindowsProcessRecords(JSON.parse(result.stdout)),
        lineageAvailable: true,
      }
    } catch {
      // Fall through to the lower-privilege liveness query below.
    }
  }

  const idList = ids.join(",")
  const fallbackScript =
    "$ErrorActionPreference = 'Stop'; " +
    `$items = @(Get-Process -Id ${idList} -ErrorAction SilentlyContinue | ` +
    "Select-Object " +
    "@{Name='ProcessId';Expression={$_.Id}}, " +
    "@{Name='Name';Expression={$_.ProcessName}}, " +
    "@{Name='StartedAt';Expression={$_.StartTime.ToUniversalTime().ToString('o')}}); " +
    "ConvertTo-Json -InputObject $items -Compress"
  const fallbackResult = spawnSync(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      fallbackScript,
    ],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
      windowsHide: true,
    },
  )

  if (
    fallbackResult.error ||
    fallbackResult.status !== 0 ||
    !fallbackResult.stdout?.trim()
  ) {
    return { ok: false, records: [], lineageAvailable: false }
  }

  try {
    return {
      ok: true,
      records: normalizeWindowsProcessRecords(
        JSON.parse(fallbackResult.stdout),
      ),
      lineageAvailable: false,
    }
  } catch {
    return { ok: false, records: [], lineageAvailable: false }
  }
}

export const probeBackendHealth = ({
  request = httpRequest,
  now = () => performance.now(),
  timeoutMs = SUPABASE_DEVELOPMENT_HEALTH_TIMEOUT_MS,
  maxResponseBytes = 1_024,
} = {}) =>
  new Promise((resolveProbe) => {
    const startedAt = now()
    const abortController = new AbortController()
    let completed = false

    const finish = (result) => {
      if (completed) {
        return
      }

      completed = true
      clearTimeout(timeout)
      resolveProbe({
        ...result,
        latencyMs: Math.max(0, Math.round(now() - startedAt)),
      })
    }

    const timeout = setTimeout(() => {
      abortController.abort()
      finish({ ok: false, reason: "timeout" })
    }, timeoutMs)

    let healthRequest

    try {
      healthRequest = request(
        SUPABASE_DEVELOPMENT_HEALTH_URL,
        {
          method: "GET",
          headers: { accept: "application/json, text/plain" },
          signal: abortController.signal,
        },
        (response) => {
          let responseBytes = 0

          response.on("data", (chunk) => {
            responseBytes += Buffer.byteLength(chunk)

            if (responseBytes > maxResponseBytes) {
              response.destroy()
              finish({ ok: false, reason: "response-too-large" })
            }
          })
          response.once("end", () => {
            const statusCode = Number(response.statusCode)

            finish({
              ok: statusCode === 200,
              reason: statusCode === 200 ? "ok" : "unexpected-status",
              statusCode: Number.isInteger(statusCode) ? statusCode : null,
            })
          })
          response.once("error", () => {
            finish({ ok: false, reason: "response-error" })
          })
        },
      )
    } catch {
      finish({ ok: false, reason: "request-error" })
      return
    }

    healthRequest.once("error", (error) => {
      finish({
        ok: false,
        reason:
          error?.name === "AbortError" ? "timeout" : "connection-error",
      })
    })
    healthRequest.end()
  })

export const summarizeBackendHealth = (
  probes,
  { slowHealthMs = SUPABASE_DEVELOPMENT_SLOW_HEALTH_MS } = {},
) => {
  const successful = probes.filter((probe) => probe.ok)
  const maximumLatencyMs = probes.reduce(
    (maximum, probe) => Math.max(maximum, Number(probe.latencyMs) || 0),
    0,
  )

  if (successful.length === probes.length && maximumLatencyMs <= slowHealthMs) {
    return {
      state: "healthy",
      successful: successful.length,
      attempted: probes.length,
      maximumLatencyMs,
    }
  }

  return {
    state: successful.length > 0 ? "degraded" : "unresponsive",
    successful: successful.length,
    attempted: probes.length,
    maximumLatencyMs,
  }
}

const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

export const runBackendHealthSeries = async ({
  attempts = SUPABASE_DEVELOPMENT_HEALTH_ATTEMPTS,
  intervalMs = 150,
  probe = probeBackendHealth,
} = {}) => {
  const probes = []

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    probes.push(await probe())

    if (attempt + 1 < attempts) {
      await delay(intervalMs)
    }
  }

  return summarizeBackendHealth(probes)
}
