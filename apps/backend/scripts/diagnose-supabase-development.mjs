import { existsSync, readFileSync } from "node:fs"

import {
  assertDevelopmentRuntime,
  assertSupportedNodeRuntime,
  assertWindowsCredentialStore,
  getSupabaseDevelopmentPaths,
} from "./supabase-development-config.mjs"
import {
  inspectGuardedProcessOwnership,
  parseSupabaseDevelopmentLockState,
  queryWindowsProcessRecords,
  runBackendHealthSeries,
} from "./supabase-development-monitor.mjs"

assertSupportedNodeRuntime()
assertWindowsCredentialStore()
assertDevelopmentRuntime()

const watch = process.argv[2] === "--watch"

if (process.argv.length > (watch ? 3 : 2)) {
  throw new Error("Use the backend diagnostic with no arguments or --watch.")
}

const { lockPath } = getSupabaseDevelopmentPaths()
const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

const readLockState = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!existsSync(lockPath)) {
      return { state: "missing", lock: null }
    }

    try {
      return {
        state: "present",
        lock: parseSupabaseDevelopmentLockState(
          readFileSync(lockPath, "utf8"),
        ),
      }
    } catch {
      if (!existsSync(lockPath)) {
        return { state: "missing", lock: null }
      }

      if (attempt === 4) {
        return { state: "invalid", lock: null }
      }

      await delay(25)
    }
  }

  return { state: "invalid", lock: null }
}

const printRecovery = (kind) => {
  console.log("Recovery: no process was stopped and no lock was removed.")

  if (kind === "start") {
    console.log("  Start the backend: npm.cmd run backend:dev")
    return
  }

  if (kind === "restart") {
    console.log(
      "  1. In the terminal that started the guarded backend, press Ctrl+C once.",
    )
    console.log(
      "  2. Run npm.cmd run backend:status until the guarded run is absent and port 9000 is unresponsive.",
    )
    console.log("  3. Start it again: npm.cmd run backend:dev")
    return
  }

  console.log(
    "  The lock or process ownership is ambiguous. Inspect the exact recorded run; do not delete the lock or kill Node processes broadly.",
  )
}

const diagnoseOnce = async () => {
  const lockResult = await readLockState()
  const health = await runBackendHealthSeries()
  let ownership = null

  if (lockResult.lock) {
    const processQuery = queryWindowsProcessRecords([
      lockResult.lock.pid,
      lockResult.lock.childPid,
    ])
    ownership = processQuery.ok
      ? inspectGuardedProcessOwnership({
          lockState: lockResult.lock,
          processRecords: processQuery.records,
        })
      : {
          state: "metadata-unavailable",
          verified: false,
          developOwned: false,
        }
  }

  console.log(
    `Backend health: ${health.state} (${health.successful}/${health.attempted} bounded probes, maximum ${health.maximumLatencyMs} ms).`,
  )

  if (lockResult.state === "missing") {
    console.log("Guarded run: absent.")

    if (health.state === "unresponsive") {
      printRecovery("start")
      return 1
    }

    console.log(
      "Ownership: port 9000 responds without the guarded Supabase development lock.",
    )
    printRecovery("inspect")
    return 1
  }

  if (lockResult.state === "invalid") {
    console.log("Guarded run: lock is invalid or remained partially written.")
    printRecovery("inspect")
    return 1
  }

  const operation = lockResult.lock.purpose
    ? "password rotation"
    : lockResult.lock.mode
      ? lockResult.lock.mode
      : "legacy run with unknown mode"
  console.log(`Guarded run: ${operation}; ownership ${ownership.state}.`)

  if (
    ownership.developOwned &&
    health.state === "healthy"
  ) {
    console.log(
      "Status: healthy. The bounded /health latency indicates that the backend event loop is responding.",
    )
    return 0
  }

  if (
    ownership.developOwned &&
    ["degraded", "unresponsive"].includes(health.state)
  ) {
    console.log(
      "Status: the exact guarded backend is slow or unresponsive.",
    )
    printRecovery("restart")
    return 1
  }

  if (
    ["legacy-owned", "legacy-recorded"].includes(ownership.state) &&
    health.state === "healthy"
  ) {
    console.log(
      "Status: endpoint is healthy, but this pre-monitor lock does not identify its mode. Restart it later through the guarded command to upgrade the lock record.",
    )
    return 0
  }

  if (
    ["legacy-owned", "legacy-recorded"].includes(ownership.state) &&
    ["degraded", "unresponsive"].includes(health.state)
  ) {
    console.log(
      "Status: this pre-monitor guarded run is slow or unresponsive. Its old lock cannot authorize automatic recovery.",
    )
    printRecovery("restart")
    return 1
  }

  if (
    ownership.verified &&
    [
      "credential-rotation",
      "guarded-command-owned",
      "guarded-command-recorded",
      "starting",
    ].includes(
      ownership.state,
    )
  ) {
    console.log("Status: another exact guarded development operation is active.")
    return 1
  }

  console.log("Status: guarded ownership requires manual inspection.")
  printRecovery("inspect")
  return 1
}

let stopped = false
let lastStatus = 1

const stopWatching = () => {
  stopped = true
}

if (watch) {
  process.on("SIGINT", stopWatching)
  process.on("SIGTERM", stopWatching)
}

do {
  if (watch) {
    console.log(`Health check: ${new Date().toISOString()}`)
  }

  lastStatus = await diagnoseOnce()

  if (watch && !stopped) {
    await delay(5_000)
  }
} while (watch && !stopped)

process.exitCode = watch && stopped ? 0 : lastStatus
