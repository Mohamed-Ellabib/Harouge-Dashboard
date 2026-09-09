import { createHash, timingSafeEqual } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"

import {
  SUPABASE_DEVELOPMENT_GUARD,
  getSupabaseDevelopmentPaths,
  readTrackedSupabaseDevelopmentConfig,
  validateSupabaseDevelopmentDatabaseUrl,
} from "./supabase-development-config.mjs"

const fail = (message) => {
  throw new Error(message)
}

const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

if (
  process.env.NODE_ENV !== "development" ||
  process.env.LABIBTECH_SUPABASE_DEVELOPMENT_GUARD !==
    SUPABASE_DEVELOPMENT_GUARD
) {
  fail("The Supabase development connection probe is not guarded.")
}

const trackedConfig = readTrackedSupabaseDevelopmentConfig()
if (
  process.env.LABIBTECH_SUPABASE_PROJECT_REF !== trackedConfig.projectRef ||
  typeof process.env.DATABASE_URL !== "string"
) {
  fail("The Supabase development connection probe target is invalid.")
}

validateSupabaseDevelopmentDatabaseUrl(
  process.env.DATABASE_URL,
  trackedConfig.projectRef,
)

const runToken = process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN
const { lockPath } = getSupabaseDevelopmentPaths()
if (!runToken || !existsSync(lockPath)) {
  fail("The Supabase development connection probe is not owned.")
}

const suppliedHash = Buffer.from(
  createHash("sha256").update(runToken).digest("hex"),
)

let lockOwned = false

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const lockState = JSON.parse(readFileSync(lockPath, "utf8"))
    const expectedHash = Buffer.from(String(lockState.runTokenHash ?? ""))

    lockOwned =
      Number(lockState.pid) === process.ppid &&
      Number(lockState.childPid) === process.pid &&
      suppliedHash.length === expectedHash.length &&
      timingSafeEqual(suppliedHash, expectedHash)

    if (lockOwned) {
      break
    }
  } catch {
    // The runner may still be publishing this child's PID.
  }

  await delay(25)
}

if (!lockOwned) {
  fail("The Supabase development connection probe is not owned.")
}

delete process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN

const require = createRequire(import.meta.url)
const { Client } = require("pg")
let connectionString = process.env.DATABASE_URL
const client = new Client({
  connectionString,
  connectionTimeoutMillis: 10_000,
  query_timeout: 10_000,
  statement_timeout: 10_000,
  application_name: "labibtech_supabase_development_probe",
})
connectionString = ""
process.env.DATABASE_URL = ""

try {
  await client.connect()
  const result = await client.query("select 1 as connection_verified")

  if (result.rows?.[0]?.connection_verified !== 1) {
    fail("The Supabase development connection probe returned an invalid result.")
  }

  console.log("Supabase development database connection verified.")
  const templates = await client.query("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = to_regclass('storefront_document_revision') and conname = 'storefront_document_revision_template_key_check'")
  const templateConstraint = templates.rows[0]?.definition ?? ""
  for (const [key, label] of [["urbx", "Template 5"], ["template-6", "Template 6"]]) {
    console.log(`${label} database support: ${templateConstraint.includes(`'${key}'`) ? "ready" : "pending schema migration"}.`)
  }
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : ""
  const message = typeof error?.message === "string" ? error.message : ""

  if (code === "28P01" || /password authentication failed/i.test(message)) {
    console.error("Supabase development database authentication was rejected.")
  } else if (/too many authentication failures|temporarily blocked/i.test(message)) {
    console.error("Supabase temporarily blocked this database connection.")
  } else if (/certificate|tls|ssl/i.test(message)) {
    console.error("Supabase development TLS verification failed.")
  } else {
    console.error("Supabase development database connection could not be verified.")
  }

  process.exitCode = 1
} finally {
  try {
    await client.end()
  } catch {
    // The probe already reports one sanitized outcome above.
  }
}
