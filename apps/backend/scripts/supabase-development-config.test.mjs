import assert from "node:assert/strict"
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

import {
  assertDevelopmentRuntime,
  assertSupportedNodeRuntime,
  buildSupabaseDevelopmentPasswordReplacement,
  buildSupabaseSessionPoolerDatabaseUrl,
  parseSupabaseDevelopmentSecrets,
  parseTrackedSupabaseDevelopmentConfig,
  replaceProtectedSupabaseDevelopmentSecrets,
  validateSupabaseDatabasePassword,
  validateSupabaseDevelopmentDatabaseUrl,
  validateSupabaseProjectRef,
  validateSupabaseSessionPoolerHost,
} from "./supabase-development-config.mjs"

const projectRef = "abcdefghijklmnopqrst"
const secret = (character) => character.repeat(64)
const directUrl =
  `postgresql://postgres:${secret("p")}@` +
  `db.${projectRef}.supabase.co:5432/postgres?sslmode=require`
const sessionPoolerUrl =
  `postgresql://postgres.${projectRef}:${secret("p")}@` +
  "aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"

test("accepts the approved direct and session-pooler identities", () => {
  assert.equal(
    validateSupabaseDevelopmentDatabaseUrl(directUrl, projectRef)
      .connectionKind,
    "direct",
  )
  assert.equal(
    validateSupabaseDevelopmentDatabaseUrl(sessionPoolerUrl, projectRef)
      .connectionKind,
    "session-pooler",
  )
})

test("constructs and percent-encodes a session-pooler URL from a hidden password", () => {
  const password = "spaces and @:/?#[]% symbols !'()* لبيب"
  const databaseUrl = buildSupabaseSessionPoolerDatabaseUrl({
    projectRef,
    hostname: "AWS-0-EU-CENTRAL-1.POOLER.SUPABASE.COM",
    password,
  })

  assert.equal(
    decodeURIComponent(new URL(databaseUrl).password),
    password,
  )
  assert.equal(
    validateSupabaseDevelopmentDatabaseUrl(databaseUrl, projectRef)
      .connectionKind,
    "session-pooler",
  )
  assert.match(databaseUrl, /%25/)
  assert.match(databaseUrl, /%21%27%28%29%2A/)
})

test("strictly validates the session-pooler host and hidden password", () => {
  assert.equal(
    validateSupabaseSessionPoolerHost(
      "AWS-0-EU-CENTRAL-1.POOLER.SUPABASE.COM",
    ),
    "aws-0-eu-central-1.pooler.supabase.com",
  )
  assert.equal(validateSupabaseDatabasePassword(" leading and trailing "), " leading and trailing ")

  for (const hostname of [
    "https://aws-0.pooler.supabase.com",
    "aws-0.pooler.supabase.com:5432",
    "aws-0.pooler.supabase.com.evil.test",
    "aws-0.pooler.supabase.com/",
    "example.neon.tech",
  ]) {
    assert.throws(() => validateSupabaseSessionPoolerHost(hostname))
  }

  for (const password of ["", "line\nbreak", "line\rbreak", "nul\0byte"]) {
    assert.throws(() => validateSupabaseDatabasePassword(password))
  }
})

test("rejects transaction pooling, Neon, and unrelated Supabase hosts", () => {
  const invalidUrls = [
    sessionPoolerUrl.replace(":5432/", ":6543/"),
    directUrl.replace(
      `db.${projectRef}.supabase.co`,
      "example.neon.tech",
    ),
    directUrl.replace(
      `db.${projectRef}.supabase.co`,
      "example.supabase.co",
    ),
  ]

  for (const invalidUrl of invalidUrls) {
    assert.throws(() =>
      validateSupabaseDevelopmentDatabaseUrl(invalidUrl, projectRef),
    )
  }
})

test("rejects a crossed project, database, username, or TLS policy", () => {
  const invalidUrls = [
    directUrl.replace(projectRef, "12345678901234567890"),
    directUrl.replace("/postgres?", "/development?"),
    directUrl.replace("postgres:", "other:"),
    directUrl.replace("sslmode=require", "sslmode=verify-full"),
    `${directUrl}&application_name=test`,
  ]

  for (const invalidUrl of invalidUrls) {
    assert.throws(() =>
      validateSupabaseDevelopmentDatabaseUrl(invalidUrl, projectRef),
    )
  }
})

test("requires an exact approved project reference and tracked shape", () => {
  assert.equal(validateSupabaseProjectRef(projectRef), projectRef)
  assert.throws(() => validateSupabaseProjectRef("production"))
  assert.deepEqual(
    parseTrackedSupabaseDevelopmentConfig(
      JSON.stringify({ version: 1, projectRef }),
    ),
    { version: 1, projectRef },
  )
  assert.throws(() =>
    parseTrackedSupabaseDevelopmentConfig(
      JSON.stringify({ version: 1, projectRef, databaseUrl: directUrl }),
    ),
  )
})

test("accepts only development runtime and Node.js 20 through 23", () => {
  assert.doesNotThrow(() => assertDevelopmentRuntime(undefined))
  assert.doesNotThrow(() => assertDevelopmentRuntime("development"))
  assert.throws(() => assertDevelopmentRuntime("test"))
  assert.throws(() => assertDevelopmentRuntime("production"))
  assert.doesNotThrow(() => assertSupportedNodeRuntime("20.19.0"))
  assert.doesNotThrow(() => assertSupportedNodeRuntime("23.11.0"))
  assert.throws(() => assertSupportedNodeRuntime("19.9.0"))
  assert.throws(() => assertSupportedNodeRuntime("24.0.0"))
})

test("validates independent generated runtime secrets without exposing them", () => {
  const payload = {
    version: 1,
    projectRef,
    databaseUrl: directUrl,
    jwtSecret: secret("a"),
    cookieSecret: secret("b"),
    vendorSessionSecret: secret("c"),
    provisioningFingerprintSecret: secret("d"),
    createdAt: "2026-08-11T00:00:00.000Z",
  }

  assert.equal(
    parseSupabaseDevelopmentSecrets(JSON.stringify(payload), projectRef)
      .projectRef,
    projectRef,
  )
  payload.cookieSecret = payload.jwtSecret
  assert.throws(() =>
    parseSupabaseDevelopmentSecrets(JSON.stringify(payload), projectRef),
  )
})

test("builds a password replacement without changing application secrets", () => {
  const existingCredentials = {
    version: 1,
    projectRef,
    databaseUrl: sessionPoolerUrl,
    jwtSecret: secret("a"),
    cookieSecret: secret("b"),
    vendorSessionSecret: secret("c"),
    provisioningFingerprintSecret: secret("d"),
    createdAt: "2026-08-11T00:00:00.000Z",
  }
  const replacementUrl = sessionPoolerUrl.replace(
    secret("p"),
    secret("q"),
  )
  const replacement = buildSupabaseDevelopmentPasswordReplacement({
    existingCredentials,
    databaseUrl: replacementUrl,
    approvedProjectRef: projectRef,
  })

  assert.equal(replacement.databaseUrl, replacementUrl)
  for (const key of [
    "projectRef",
    "jwtSecret",
    "cookieSecret",
    "vendorSessionSecret",
    "provisioningFingerprintSecret",
    "createdAt",
  ]) {
    assert.equal(replacement[key], existingCredentials[key])
  }

  assert.throws(() =>
    buildSupabaseDevelopmentPasswordReplacement({
      existingCredentials,
      databaseUrl: replacementUrl.replace(
        "aws-0-eu-central-1",
        "aws-1-us-east-1",
      ),
      approvedProjectRef: projectRef,
    }),
  )
})

test("atomically replaces only the expected protected credential file", () => {
  const testDirectory = mkdtempSync(
    join(tmpdir(), "labibtech-supabase-rotation-"),
  )
  const paths = {
    lockPath: join(testDirectory, "run.lock"),
    protectedSecretsPath: join(testDirectory, "secrets.dpapi"),
  }
  const lockOwnership = {
    pid: process.pid,
    runTokenHash: secret("h"),
    purpose: "password-rotation",
  }

  try {
    writeFileSync(paths.lockPath, JSON.stringify(lockOwnership))
    writeFileSync(paths.protectedSecretsPath, "old-protected-value")

    replaceProtectedSupabaseDevelopmentSecrets({
      expectedProtectedSecrets: "old-protected-value",
      replacementProtectedSecrets: "new-protected-value",
      lockOwnership,
      paths,
    })

    assert.equal(
      readFileSync(paths.protectedSecretsPath, "utf8"),
      "new-protected-value",
    )
    assert.deepEqual(
      readdirSync(testDirectory).sort(),
      ["run.lock", "secrets.dpapi"],
    )

    assert.throws(() =>
      replaceProtectedSupabaseDevelopmentSecrets({
        expectedProtectedSecrets: "stale-protected-value",
        replacementProtectedSecrets: "unexpected-value",
        lockOwnership,
        paths,
      }),
    )
    assert.equal(
      readFileSync(paths.protectedSecretsPath, "utf8"),
      "new-protected-value",
    )
  } finally {
    rmSync(testDirectory, { recursive: true, force: true })
  }
})
