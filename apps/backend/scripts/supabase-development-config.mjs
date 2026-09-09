import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

export const SUPABASE_DEVELOPMENT_GUARD = "validated-v1"
export const SUPABASE_DEVELOPMENT_CONFIG_VERSION = 1
export const SUPABASE_DEVELOPMENT_SECRET_VERSION = 1
export const SUPABASE_DEVELOPMENT_FINGERPRINT_KEY_ID =
  "supabase-development-v1"

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43,256}$/
const MAX_DATABASE_URL_LENGTH = 4_096
const MAX_DATABASE_PASSWORD_LENGTH = 1_024
const MAX_PROTECTED_SECRET_LENGTH = 128 * 1024
const moduleDirectory = dirname(fileURLToPath(import.meta.url))
const backendDirectory = resolve(moduleDirectory, "..")
const workspaceDirectory = resolve(backendDirectory, "..", "..")
const trackedConfigPath = resolve(
  backendDirectory,
  "config",
  "supabase-development.json",
)

const fail = (message) => {
  throw new Error(message)
}

export const assertSupportedNodeRuntime = (
  version = process.versions.node,
) => {
  const major = Number(String(version).split(".")[0])

  if (!Number.isInteger(major) || major < 20 || major >= 24) {
    fail("Supabase development requires Node.js 20 through 23.")
  }
}

export const assertWindowsCredentialStore = (
  platform = process.platform,
) => {
  if (platform !== "win32") {
    fail("The Supabase development credential store requires Windows DPAPI.")
  }
}

export const assertDevelopmentRuntime = (nodeEnv = process.env.NODE_ENV) => {
  const normalized = typeof nodeEnv === "string" ? nodeEnv.trim() : ""

  if (normalized && normalized !== "development") {
    fail("Supabase development cannot run in a production or test context.")
  }
}

export const validateSupabaseProjectRef = (
  value,
  { allowEmpty = false } = {},
) => {
  if (allowEmpty && value === "") {
    return ""
  }

  if (typeof value !== "string" || !PROJECT_REF_PATTERN.test(value)) {
    fail("The approved Supabase development project reference is invalid.")
  }

  return value
}

export const parseTrackedSupabaseDevelopmentConfig = (
  serialized,
  { allowEmpty = false } = {},
) => {
  let parsed

  try {
    parsed = JSON.parse(serialized)
  } catch {
    fail("The tracked Supabase development configuration is invalid.")
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    parsed.version !== SUPABASE_DEVELOPMENT_CONFIG_VERSION ||
    typeof parsed.projectRef !== "string" ||
    Object.keys(parsed).sort().join(",") !== "projectRef,version"
  ) {
    fail("The tracked Supabase development configuration is invalid.")
  }

  return {
    version: SUPABASE_DEVELOPMENT_CONFIG_VERSION,
    projectRef: validateSupabaseProjectRef(parsed.projectRef, { allowEmpty }),
  }
}

export const readTrackedSupabaseDevelopmentConfig = ({
  allowEmpty = false,
} = {}) => {
  if (!existsSync(trackedConfigPath)) {
    fail("The tracked Supabase development configuration is missing.")
  }

  return parseTrackedSupabaseDevelopmentConfig(
    readFileSync(trackedConfigPath, "utf8"),
    { allowEmpty },
  )
}

const isValidDnsLabel = (label) =>
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label) ||
  /^[a-z0-9]$/.test(label)

const isSessionPoolerHost = (hostname) => {
  const suffix = ".pooler.supabase.com"

  if (!hostname.endsWith(suffix)) {
    return false
  }

  const prefix = hostname.slice(0, -suffix.length)
  return Boolean(prefix) && prefix.split(".").every(isValidDnsLabel)
}

export const validateSupabaseSessionPoolerHost = (value) => {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.length > 253 ||
    /[^\x00-\x7F]/.test(value)
  ) {
    fail("The Supabase session-pooler host is invalid.")
  }

  const hostname = value.toLowerCase()
  if (!isSessionPoolerHost(hostname)) {
    fail("The Supabase session-pooler host is invalid.")
  }

  return hostname
}

export const validateSupabaseDatabasePassword = (value) => {
  if (
    typeof value !== "string" ||
    !value ||
    Buffer.byteLength(value, "utf8") > MAX_DATABASE_PASSWORD_LENGTH ||
    /[\0\r\n]/.test(value)
  ) {
    fail("The Supabase database password is invalid.")
  }

  return value
}

const percentEncodeUserInfo = (value) => {
  try {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  } catch {
    fail("The Supabase database password is invalid.")
  }
}

export const buildSupabaseSessionPoolerDatabaseUrl = ({
  projectRef: approvedProjectRef,
  hostname: suppliedHostname,
  password,
}) => {
  const projectRef = validateSupabaseProjectRef(approvedProjectRef)
  const hostname = validateSupabaseSessionPoolerHost(suppliedHostname)
  const encodedPassword = percentEncodeUserInfo(
    validateSupabaseDatabasePassword(password),
  )
  const serialized =
    `postgresql://postgres.${projectRef}:${encodedPassword}@${hostname}` +
    ":5432/postgres?sslmode=require"
  const validated = validateSupabaseDevelopmentDatabaseUrl(
    serialized,
    projectRef,
  )

  if (validated.connectionKind !== "session-pooler") {
    fail("The Supabase development database connection is invalid.")
  }

  return serialized
}

export const validateSupabaseDevelopmentDatabaseUrl = (
  value,
  approvedProjectRef,
) => {
  const projectRef = validateSupabaseProjectRef(approvedProjectRef)

  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.length > MAX_DATABASE_URL_LENGTH ||
    /\s/.test(value)
  ) {
    fail("The Supabase development database connection is invalid.")
  }

  let databaseUrl

  try {
    databaseUrl = new URL(value)
  } catch {
    fail("The Supabase development database connection is invalid.")
  }

  const hostname = databaseUrl.hostname.toLowerCase()
  const isDirect = hostname === `db.${projectRef}.supabase.co`
  const isSessionPooler = isSessionPoolerHost(hostname)
  const expectedUsername = isDirect ? "postgres" : `postgres.${projectRef}`
  const queryEntries = [...databaseUrl.searchParams.entries()]

  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    (!isDirect && !isSessionPooler) ||
    databaseUrl.port !== "5432" ||
    databaseUrl.pathname !== "/postgres" ||
    databaseUrl.username !== expectedUsername ||
    !databaseUrl.password ||
    databaseUrl.hash ||
    queryEntries.length !== 1 ||
    queryEntries[0][0] !== "sslmode" ||
    queryEntries[0][1] !== "require"
  ) {
    fail("The Supabase development database connection is invalid.")
  }

  return {
    connectionKind: isDirect ? "direct" : "session-pooler",
    projectRef,
  }
}

const assertOutsideWorkspace = (candidate) => {
  const relativePath = relative(workspaceDirectory, candidate)
  const isInside =
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) &&
      relativePath !== ".." &&
      !isAbsolute(relativePath))

  if (isInside) {
    fail("Supabase development credentials must remain outside the repository.")
  }
}

export const getSupabaseDevelopmentPaths = (
  localAppData = process.env.LOCALAPPDATA,
) => {
  if (typeof localAppData !== "string" || !localAppData.trim()) {
    fail("LOCALAPPDATA is required for Supabase development.")
  }

  const stateDirectory = resolve(
    localAppData,
    "LabibTech-Commerce-SaaS",
    "supabase-development",
  )
  assertOutsideWorkspace(stateDirectory)

  return {
    backendDirectory,
    workspaceDirectory,
    trackedConfigPath,
    stateDirectory,
    protectedSecretsPath: resolve(
      stateDirectory,
      "supabase-development-secrets.json.dpapi",
    ),
    lockPath: resolve(
      stateDirectory,
      "supabase-development-run.lock",
    ),
  }
}

const runPowerShellCredentialOperation = (script, input) => {
  assertWindowsCredentialStore()

  for (const executable of ["powershell.exe", "pwsh.exe"]) {
    const result = spawnSync(
      executable,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
      {
        encoding: "utf8",
        input,
        maxBuffer: MAX_PROTECTED_SECRET_LENGTH,
        shell: false,
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 15_000,
        windowsHide: true,
      },
    )

    if (!result.error && result.status === 0 && result.stdout?.trim()) {
      return result.stdout.trim()
    }
  }

  fail("The Windows credential store operation failed.")
}

export const protectSupabaseDevelopmentSecrets = (serializedSecrets) =>
  runPowerShellCredentialOperation(
    "$plain=[Console]::In.ReadToEnd();" +
      "$secure=ConvertTo-SecureString $plain -AsPlainText -Force;" +
      "ConvertFrom-SecureString $secure",
    serializedSecrets,
  )

export const unprotectSupabaseDevelopmentSecrets = (protectedSecrets) =>
  runPowerShellCredentialOperation(
    "$cipher=[Console]::In.ReadToEnd();" +
      "$secure=ConvertTo-SecureString $cipher;" +
      "$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);" +
      "try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}" +
      "finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}",
    protectedSecrets,
  )

export const promptForHiddenSupabaseDatabaseUrl = () => {
  assertWindowsCredentialStore()

  const script =
    "[Console]::Error.Write('Paste the Supabase development database connection (input hidden): ');" +
    "$secure=$Host.UI.ReadLineAsSecureString();" +
    "$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);" +
    "try{[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))}" +
    "finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}"
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-Command", script],
    {
      encoding: "utf8",
      maxBuffer: MAX_DATABASE_URL_LENGTH * 2,
      shell: false,
      stdio: ["inherit", "pipe", "inherit"],
      windowsHide: true,
    },
  )

  if (result.error || result.status !== 0 || !result.stdout) {
    fail("The hidden Supabase development database prompt failed.")
  }

  return result.stdout.trim()
}

export const promptForHiddenSupabaseDatabasePassword = ({
  confirmation = false,
} = {}) => {
  assertWindowsCredentialStore()

  const script =
    `[Console]::Error.Write('${
      confirmation
        ? "Confirm Supabase database password"
        : "Supabase database password"
    } (input hidden): ');` +
    "$secure=$Host.UI.ReadLineAsSecureString();" +
    "$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);" +
    "try{[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))}" +
    "finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}"
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-Command", script],
    {
      encoding: "utf8",
      maxBuffer: MAX_DATABASE_PASSWORD_LENGTH * 4,
      shell: false,
      stdio: ["inherit", "pipe", "inherit"],
      windowsHide: true,
    },
  )

  if (result.error || result.status !== 0 || !result.stdout) {
    fail("The hidden Supabase database password prompt failed.")
  }

  return result.stdout
}

export const promptForPlatformAdminEmail = () => {
  assertWindowsCredentialStore()

  const script =
    "[Console]::Error.Write('Platform Super Admin email: ');" +
    "$value=[Console]::ReadLine();" +
    "if($null -ne $value){[Console]::Out.Write($value)}"
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-Command", script],
    {
      encoding: "utf8",
      maxBuffer: 1_024,
      shell: false,
      stdio: ["inherit", "pipe", "inherit"],
      windowsHide: true,
    },
  )

  if (result.error || result.status !== 0 || !result.stdout?.trim()) {
    fail("The platform Super Admin email prompt failed.")
  }

  return result.stdout.trim()
}

export const promptForHiddenPlatformAdminPassword = ({
  confirmation = false,
} = {}) => {
  assertWindowsCredentialStore()

  const script =
    `[Console]::Error.Write('${
      confirmation
        ? "Confirm Platform Super Admin temporary password"
        : "Platform Super Admin temporary password"
    } (input hidden): ');` +
    "$secure=$Host.UI.ReadLineAsSecureString();" +
    "$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);" +
    "try{[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))}" +
    "finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}"
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-Command", script],
    {
      encoding: "utf8",
      maxBuffer: 1_024,
      shell: false,
      stdio: ["inherit", "pipe", "inherit"],
      windowsHide: true,
    },
  )

  if (result.error || result.status !== 0 || !result.stdout) {
    fail("The hidden platform Super Admin password prompt failed.")
  }

  return result.stdout
}

const validateIndependentSecret = (value) => {
  if (typeof value !== "string" || !SECRET_PATTERN.test(value)) {
    fail("The protected Supabase development credentials are invalid.")
  }

  return value
}

export const parseSupabaseDevelopmentSecrets = (
  serialized,
  approvedProjectRef,
) => {
  const projectRef = validateSupabaseProjectRef(approvedProjectRef)
  let parsed

  try {
    parsed = JSON.parse(serialized)
  } catch {
    fail("The protected Supabase development credentials are invalid.")
  }

  const expectedKeys = [
    "cookieSecret",
    "createdAt",
    "databaseUrl",
    "jwtSecret",
    "projectRef",
    "provisioningFingerprintSecret",
    "vendorSessionSecret",
    "version",
  ]

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.keys(parsed).sort().join(",") !== expectedKeys.join(",") ||
    parsed.version !== SUPABASE_DEVELOPMENT_SECRET_VERSION ||
    parsed.projectRef !== projectRef ||
    typeof parsed.databaseUrl !== "string" ||
    typeof parsed.createdAt !== "string" ||
    !Number.isFinite(Date.parse(parsed.createdAt))
  ) {
    fail("The protected Supabase development credentials are invalid.")
  }

  validateSupabaseDevelopmentDatabaseUrl(parsed.databaseUrl, projectRef)
  const secrets = [
    validateIndependentSecret(parsed.jwtSecret),
    validateIndependentSecret(parsed.cookieSecret),
    validateIndependentSecret(parsed.vendorSessionSecret),
    validateIndependentSecret(parsed.provisioningFingerprintSecret),
  ]

  if (new Set(secrets).size !== secrets.length) {
    fail("The protected Supabase development credentials are invalid.")
  }

  return {
    version: SUPABASE_DEVELOPMENT_SECRET_VERSION,
    projectRef,
    databaseUrl: parsed.databaseUrl,
    jwtSecret: secrets[0],
    cookieSecret: secrets[1],
    vendorSessionSecret: secrets[2],
    provisioningFingerprintSecret: secrets[3],
    createdAt: parsed.createdAt,
  }
}

export const loadSupabaseDevelopmentSecrets = (approvedProjectRef) => {
  const { protectedSecretsPath } = getSupabaseDevelopmentPaths()

  if (!existsSync(protectedSecretsPath)) {
    fail("The protected Supabase development credentials are not configured.")
  }

  const protectedSecrets = readFileSync(protectedSecretsPath, "utf8").trim()

  if (
    !protectedSecrets ||
    protectedSecrets.length > MAX_PROTECTED_SECRET_LENGTH
  ) {
    fail("The protected Supabase development credentials are invalid.")
  }

  return parseSupabaseDevelopmentSecrets(
    unprotectSupabaseDevelopmentSecrets(protectedSecrets),
    approvedProjectRef,
  )
}

export const buildSupabaseDevelopmentPasswordReplacement = ({
  existingCredentials,
  databaseUrl,
  approvedProjectRef,
}) => {
  const projectRef = validateSupabaseProjectRef(approvedProjectRef)
  const existing = parseSupabaseDevelopmentSecrets(
    JSON.stringify(existingCredentials),
    projectRef,
  )
  const replacementIdentity = validateSupabaseDevelopmentDatabaseUrl(
    databaseUrl,
    projectRef,
  )

  if (
    replacementIdentity.connectionKind !== "session-pooler" ||
    new URL(existing.databaseUrl).hostname !== new URL(databaseUrl).hostname
  ) {
    fail("The Supabase development database replacement is invalid.")
  }

  return parseSupabaseDevelopmentSecrets(
    JSON.stringify({
      version: SUPABASE_DEVELOPMENT_SECRET_VERSION,
      projectRef,
      databaseUrl,
      jwtSecret: existing.jwtSecret,
      cookieSecret: existing.cookieSecret,
      vendorSessionSecret: existing.vendorSessionSecret,
      provisioningFingerprintSecret:
        existing.provisioningFingerprintSecret,
      createdAt: existing.createdAt,
    }),
    projectRef,
  )
}

export const storeProtectedSupabaseDevelopmentSecrets = (
  protectedSecrets,
) => {
  const { stateDirectory, protectedSecretsPath } =
    getSupabaseDevelopmentPaths()

  if (
    typeof protectedSecrets !== "string" ||
    !protectedSecrets.trim() ||
    protectedSecrets.length > MAX_PROTECTED_SECRET_LENGTH
  ) {
    fail("The protected Supabase development credentials are invalid.")
  }

  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 })
  writeFileSync(protectedSecretsPath, protectedSecrets.trim(), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  })

  return protectedSecretsPath
}

export const replaceProtectedSupabaseDevelopmentSecrets = ({
  expectedProtectedSecrets,
  replacementProtectedSecrets,
  lockOwnership,
  paths,
}) => {
  const { lockPath, protectedSecretsPath } =
    paths ?? getSupabaseDevelopmentPaths()
  const expected = expectedProtectedSecrets?.trim()
  const replacement = replacementProtectedSecrets?.trim()

  if (
    typeof expected !== "string" ||
    !expected ||
    expected.length > MAX_PROTECTED_SECRET_LENGTH ||
    typeof replacement !== "string" ||
    !replacement ||
    replacement.length > MAX_PROTECTED_SECRET_LENGTH
  ) {
    fail("The protected Supabase development credentials are invalid.")
  }

  const assertLockOwnership = () => {
    let state

    try {
      state = JSON.parse(readFileSync(lockPath, "utf8"))
    } catch {
      fail("The Supabase development credential-replacement lock is invalid.")
    }

    if (
      !lockOwnership ||
      Number(state.pid) !== Number(lockOwnership.pid) ||
      state.runTokenHash !== lockOwnership.runTokenHash ||
      state.purpose !== "password-rotation"
    ) {
      fail("The Supabase development credential-replacement lock changed.")
    }
  }

  assertLockOwnership()

  if (
    !existsSync(protectedSecretsPath) ||
    readFileSync(protectedSecretsPath, "utf8").trim() !== expected
  ) {
    fail("The protected Supabase development credentials changed.")
  }

  const temporaryPath = `${protectedSecretsPath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`
  let temporaryDescriptor
  let temporaryOwned = false

  try {
    temporaryDescriptor = openSync(temporaryPath, "wx", 0o600)
    temporaryOwned = true
    writeFileSync(temporaryDescriptor, replacement, { encoding: "utf8" })
    fsyncSync(temporaryDescriptor)
    closeSync(temporaryDescriptor)
    temporaryDescriptor = undefined

    assertLockOwnership()

    if (
      readFileSync(protectedSecretsPath, "utf8").trim() !== expected
    ) {
      fail("The protected Supabase development credentials changed.")
    }

    renameSync(temporaryPath, protectedSecretsPath)
    temporaryOwned = false

    if (
      readFileSync(protectedSecretsPath, "utf8").trim() !== replacement
    ) {
      fail("The protected Supabase development credentials replacement failed.")
    }
  } catch {
    if (temporaryDescriptor !== undefined) {
      closeSync(temporaryDescriptor)
      temporaryDescriptor = undefined
    }

    if (temporaryOwned && existsSync(temporaryPath)) {
      unlinkSync(temporaryPath)
    }

    fail("The protected Supabase development credentials replacement failed.")
  }
}

export const removeNewProtectedSecretsAfterFailedConfiguration = (
  expectedProtectedSecrets,
) => {
  const { protectedSecretsPath } = getSupabaseDevelopmentPaths()

  if (
    existsSync(protectedSecretsPath) &&
    readFileSync(protectedSecretsPath, "utf8").trim() ===
      expectedProtectedSecrets.trim()
  ) {
    unlinkSync(protectedSecretsPath)
  }
}

export const pinTrackedSupabaseProjectRef = (projectRef) => {
  const approvedProjectRef = validateSupabaseProjectRef(projectRef)
  const current = readTrackedSupabaseDevelopmentConfig({ allowEmpty: true })

  if (current.projectRef) {
    fail(
      "The Supabase development project is already pinned; replacement requires a reviewed source change.",
    )
  }

  writeFileSync(
    trackedConfigPath,
    `${JSON.stringify(
      {
        version: SUPABASE_DEVELOPMENT_CONFIG_VERSION,
        projectRef: approvedProjectRef,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o644 },
  )
}
