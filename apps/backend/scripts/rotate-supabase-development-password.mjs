import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

import {
  assertDevelopmentRuntime,
  assertSupportedNodeRuntime,
  assertWindowsCredentialStore,
  buildSupabaseDevelopmentPasswordReplacement,
  buildSupabaseSessionPoolerDatabaseUrl,
  getSupabaseDevelopmentPaths,
  parseSupabaseDevelopmentSecrets,
  promptForHiddenSupabaseDatabasePassword,
  protectSupabaseDevelopmentSecrets,
  readTrackedSupabaseDevelopmentConfig,
  replaceProtectedSupabaseDevelopmentSecrets,
  unprotectSupabaseDevelopmentSecrets,
  validateSupabaseDatabasePassword,
  validateSupabaseDevelopmentDatabaseUrl,
} from "./supabase-development-config.mjs"

assertSupportedNodeRuntime()
assertWindowsCredentialStore()
assertDevelopmentRuntime()

if (process.argv.length !== 2) {
  throw new Error(
    "The Supabase database-password replacement command accepts no arguments.",
  )
}

const trackedConfig = readTrackedSupabaseDevelopmentConfig()
const { backendDirectory, lockPath, protectedSecretsPath } =
  getSupabaseDevelopmentPaths()
const lockTokenHash = createHash("sha256")
  .update(randomBytes(32))
  .digest("hex")
const lockState = {
  pid: process.pid,
  childPid: null,
  runTokenHash: lockTokenHash,
  acquiredAt: new Date().toISOString(),
  purpose: "password-rotation",
}
let lockDescriptor
let lockOwned = false
let lockFileCreated = false

const acquireLock = () => {
  try {
    lockDescriptor = openSync(lockPath, "wx", 0o600)
    lockFileCreated = true
    lockOwned = true
    writeFileSync(lockDescriptor, JSON.stringify(lockState), {
      encoding: "utf8",
    })
  } catch (error) {
    if (lockDescriptor !== undefined) {
      closeSync(lockDescriptor)
      lockDescriptor = undefined
    }

    if (lockFileCreated && existsSync(lockPath)) {
      unlinkSync(lockPath)
    }

    lockFileCreated = false
    lockOwned = false

    if (error?.code === "EEXIST") {
      throw new Error(
        "A guarded Supabase development command is already running.",
      )
    }

    throw error
  }
}

const releaseLock = () => {
  if (!lockOwned) {
    return
  }

  if (lockDescriptor !== undefined) {
    closeSync(lockDescriptor)
    lockDescriptor = undefined
  }

  let currentState
  try {
    currentState = JSON.parse(readFileSync(lockPath, "utf8"))
  } catch {
    throw new Error(
      "The Supabase development credential-replacement lock is invalid.",
    )
  }

  if (
    Number(currentState.pid) !== process.pid ||
    currentState.runTokenHash !== lockTokenHash ||
    currentState.purpose !== "password-rotation"
  ) {
    throw new Error(
      "The Supabase development credential-replacement lock changed.",
    )
  }

  unlinkSync(lockPath)
  lockOwned = false
  lockFileCreated = false
}

process.on("exit", () => {
  if (lockOwned) {
    try {
      releaseLock()
    } catch {
      // A changed lock is intentionally left for manual inspection.
    }
  }
})

const require = createRequire(import.meta.url)
const { Client } = require("pg")
const supabaseCaPath = resolve(
  backendDirectory,
  "config",
  "supabase-prod-ca-2021.crt",
)
const expectedSupabaseCaSha256 =
  "700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7"
const supabaseCa = readFileSync(supabaseCaPath, "utf8")

if (
  createHash("sha256").update(Buffer.from(supabaseCa)).digest("hex") !==
  expectedSupabaseCaSha256
) {
  throw new Error("The pinned Supabase certificate authority is invalid.")
}

let existingProtectedSecrets = ""
let databasePassword = ""
let confirmationPassword = ""
let databaseUrl = ""
let replacementCredentials
let replacementProtectedSecrets = ""
let existingCredentials
let verifiedReplacement
let passwordBytes
let confirmationBytes

try {
  acquireLock()

  if (!existsSync(protectedSecretsPath)) {
    throw new Error("Supabase development credentials are not configured.")
  }

  existingProtectedSecrets = readFileSync(
    protectedSecretsPath,
    "utf8",
  ).trim()
  existingCredentials = parseSupabaseDevelopmentSecrets(
    unprotectSupabaseDevelopmentSecrets(existingProtectedSecrets),
    trackedConfig.projectRef,
  )
  const currentConnection = validateSupabaseDevelopmentDatabaseUrl(
    existingCredentials.databaseUrl,
    trackedConfig.projectRef,
  )

  if (currentConnection.connectionKind !== "session-pooler") {
    throw new Error(
      "Password replacement requires the approved Supabase session pooler.",
    )
  }

  databasePassword = validateSupabaseDatabasePassword(
    promptForHiddenSupabaseDatabasePassword(),
  )
  confirmationPassword = validateSupabaseDatabasePassword(
    promptForHiddenSupabaseDatabasePassword({ confirmation: true }),
  )
  passwordBytes = Buffer.from(databasePassword, "utf8")
  confirmationBytes = Buffer.from(confirmationPassword, "utf8")

  if (
    passwordBytes.length !== confirmationBytes.length ||
    !timingSafeEqual(passwordBytes, confirmationBytes)
  ) {
    throw new Error(
      "The Supabase database password entries did not match; protected credentials were not changed.",
    )
  }

  databaseUrl = buildSupabaseSessionPoolerDatabaseUrl({
    projectRef: trackedConfig.projectRef,
    hostname: new URL(existingCredentials.databaseUrl).hostname,
    password: databasePassword,
  })

  const validationUrl = new URL(databaseUrl)
  validationUrl.search = ""
  let validationConnectionString = validationUrl.toString()
  const client = new Client({
    connectionString: validationConnectionString,
    ssl: { ca: supabaseCa, rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
    application_name: "labibtech_supabase_password_validation",
  })
  validationConnectionString = ""
  validationUrl.password = ""

  try {
    await client.connect()
    const result = await client.query("select 1 as connection_verified")

    if (result.rows?.[0]?.connection_verified !== 1) {
      throw new Error("unexpected-result")
    }
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : ""

    if (/too many authentication failures|temporarily blocked/i.test(message)) {
      throw new Error(
        "Supabase temporarily blocked password validation; protected credentials were not changed.",
      )
    }

    throw new Error(
      "Supabase rejected the replacement database password; protected credentials were not changed.",
    )
  } finally {
    try {
      await client.end()
    } catch {
      // The fixed validation result above is authoritative.
    }
  }

  replacementCredentials = buildSupabaseDevelopmentPasswordReplacement({
    existingCredentials,
    databaseUrl,
    approvedProjectRef: trackedConfig.projectRef,
  })
  replacementProtectedSecrets = protectSupabaseDevelopmentSecrets(
    JSON.stringify(replacementCredentials),
  )
  verifiedReplacement = parseSupabaseDevelopmentSecrets(
    unprotectSupabaseDevelopmentSecrets(replacementProtectedSecrets),
    trackedConfig.projectRef,
  )

  for (const key of [
    "projectRef",
    "databaseUrl",
    "jwtSecret",
    "cookieSecret",
    "vendorSessionSecret",
    "provisioningFingerprintSecret",
    "createdAt",
  ]) {
    if (verifiedReplacement[key] !== replacementCredentials[key]) {
      throw new Error(
        "The protected Supabase development credential replacement could not be verified.",
      )
    }
  }

  replaceProtectedSupabaseDevelopmentSecrets({
    expectedProtectedSecrets: existingProtectedSecrets,
    replacementProtectedSecrets,
    lockOwnership: lockState,
  })
} finally {
  databasePassword = ""
  confirmationPassword = ""
  databaseUrl = ""
  existingProtectedSecrets = ""
  replacementProtectedSecrets = ""
  passwordBytes?.fill(0)
  confirmationBytes?.fill(0)

  for (const credentials of [
    existingCredentials,
    replacementCredentials,
    verifiedReplacement,
  ]) {
    if (credentials) {
      credentials.databaseUrl = ""
      credentials.jwtSecret = ""
      credentials.cookieSecret = ""
      credentials.vendorSessionSecret = ""
      credentials.provisioningFingerprintSecret = ""
    }
  }

  releaseLock()
}

console.log(
  "The Supabase development database password was verified and replaced.",
)
