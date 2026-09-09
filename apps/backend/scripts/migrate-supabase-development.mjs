import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

import {
  assertDevelopmentRuntime,
  assertSupportedNodeRuntime,
  assertWindowsCredentialStore,
} from "./supabase-development-config.mjs"

assertSupportedNodeRuntime()
assertWindowsCredentialStore()
assertDevelopmentRuntime()

if (process.argv.length !== 2) {
  throw new Error("The Supabase development migration command accepts no arguments.")
}

const runnerPath = resolve(
  import.meta.dirname,
  "run-with-supabase-development.mjs",
)
const stages = [
  ["migrate-core", "schema migrations"],
  ["sync-links-safe", "safe link synchronization"],
  ["migrate-scripts", "migration scripts"],
]

for (const [mode, label] of stages) {
  console.log(`Starting Supabase development ${label}.`)
  const result = spawnSync(process.execPath, [runnerPath, mode], {
    cwd: import.meta.dirname,
    env: process.env,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  })

  if (result.error) {
    throw new Error(`Supabase development ${label} could not start.`)
  }

  if (result.signal || result.status !== 0) {
    throw new Error(`Supabase development ${label} did not complete.`)
  }

  console.log(`Completed Supabase development ${label}.`)
}

console.log("Supabase development migration completed safely.")
