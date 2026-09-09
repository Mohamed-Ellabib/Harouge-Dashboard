import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"

import {
  SUPABASE_DEVELOPMENT_SECRET_VERSION,
  assertDevelopmentRuntime,
  assertSupportedNodeRuntime,
  assertWindowsCredentialStore,
  buildSupabaseSessionPoolerDatabaseUrl,
  getSupabaseDevelopmentPaths,
  parseSupabaseDevelopmentSecrets,
  pinTrackedSupabaseProjectRef,
  promptForHiddenSupabaseDatabasePassword,
  protectSupabaseDevelopmentSecrets,
  readTrackedSupabaseDevelopmentConfig,
  removeNewProtectedSecretsAfterFailedConfiguration,
  storeProtectedSupabaseDevelopmentSecrets,
  validateSupabaseDevelopmentDatabaseUrl,
  validateSupabaseProjectRef,
} from "./supabase-development-config.mjs"

assertSupportedNodeRuntime()
assertWindowsCredentialStore()
assertDevelopmentRuntime()

const parseConfigurationArguments = (args) => {
  if (args.length === 0) {
    return {}
  }

  const parsed = {}

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]

    if (!value || !["--project-ref", "--pooler-host"].includes(flag)) {
      throw new Error(
        "Use only the non-secret --project-ref and --pooler-host arguments.",
      )
    }

    const key =
      flag === "--project-ref" ? "projectRef" : "poolerHost"
    if (parsed[key]) {
      throw new Error(`The ${flag} argument may be supplied only once.`)
    }
    parsed[key] = value
  }

  if (args.length % 2 !== 0) {
    throw new Error(
      "Use only the non-secret --project-ref and --pooler-host arguments.",
    )
  }

  return parsed
}

const { projectRef: requestedProjectRefValue, poolerHost } =
  parseConfigurationArguments(process.argv.slice(2))
const requestedProjectRef = requestedProjectRefValue
  ? validateSupabaseProjectRef(requestedProjectRefValue)
  : undefined
const trackedConfig = readTrackedSupabaseDevelopmentConfig({ allowEmpty: true })

if (
  trackedConfig.projectRef &&
  requestedProjectRef &&
  requestedProjectRef !== trackedConfig.projectRef
) {
  throw new Error(
    "A different Supabase development project is already pinned; replacement requires a reviewed source change.",
  )
}

if (!trackedConfig.projectRef && !requestedProjectRef) {
  throw new Error(
    "Approve the initial Supabase development project with --project-ref.",
  )
}

const projectRef = trackedConfig.projectRef || requestedProjectRef
const { protectedSecretsPath } = getSupabaseDevelopmentPaths()

if (!poolerHost) {
  throw new Error(
    "Supply the non-secret Supabase session-pooler host with --pooler-host.",
  )
}

if (existsSync(protectedSecretsPath)) {
  throw new Error(
    "Supabase development credentials are already configured; automatic replacement is disabled.",
  )
}

let databasePassword = ""
let databaseUrl

databasePassword = promptForHiddenSupabaseDatabasePassword()
databaseUrl = buildSupabaseSessionPoolerDatabaseUrl({
  projectRef,
  hostname: poolerHost,
  password: databasePassword,
})
validateSupabaseDevelopmentDatabaseUrl(databaseUrl, projectRef)

const generateSecret = () => randomBytes(48).toString("base64url")
const credentials = {
  version: SUPABASE_DEVELOPMENT_SECRET_VERSION,
  projectRef,
  databaseUrl,
  jwtSecret: generateSecret(),
  cookieSecret: generateSecret(),
  vendorSessionSecret: generateSecret(),
  provisioningFingerprintSecret: generateSecret(),
  createdAt: new Date().toISOString(),
}

parseSupabaseDevelopmentSecrets(JSON.stringify(credentials), projectRef)
const protectedCredentials = protectSupabaseDevelopmentSecrets(
  JSON.stringify(credentials),
)
let protectedCredentialsStored = false

try {
  storeProtectedSupabaseDevelopmentSecrets(protectedCredentials)
  protectedCredentialsStored = true

  if (!trackedConfig.projectRef) {
    pinTrackedSupabaseProjectRef(projectRef)
  }
} catch (error) {
  if (protectedCredentialsStored) {
    removeNewProtectedSecretsAfterFailedConfiguration(protectedCredentials)
  }

  throw error
} finally {
  databasePassword = ""
  databaseUrl = ""
  credentials.databaseUrl = ""
  credentials.jwtSecret = ""
  credentials.cookieSecret = ""
  credentials.vendorSessionSecret = ""
  credentials.provisioningFingerprintSecret = ""
}

console.log("Supabase development credentials were stored securely.")
