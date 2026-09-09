import assert from "node:assert/strict"
import { test } from "node:test"

import {
  inspectGuardedProcessOwnership,
  parseSupabaseDevelopmentLockState,
  runBackendHealthSeries,
  summarizeBackendHealth,
} from "./supabase-development-monitor.mjs"

const lockState = (overrides = {}) => ({
  pid: 100,
  childPid: 101,
  runTokenHash: "a".repeat(64),
  acquiredAt: "2026-08-14T10:00:00.000Z",
  mode: "develop",
  ...overrides,
})

test("parses current, rotation, and legacy guarded lock shapes", () => {
  assert.deepEqual(
    parseSupabaseDevelopmentLockState(JSON.stringify(lockState())),
    {
      pid: 100,
      childPid: 101,
      acquiredAt: "2026-08-14T10:00:00.000Z",
      mode: "develop",
      purpose: null,
      legacy: false,
    },
  )

  assert.equal(
    parseSupabaseDevelopmentLockState(
      JSON.stringify(
        lockState({ childPid: null, mode: undefined, purpose: "password-rotation" }),
      ),
    ).purpose,
    "password-rotation",
  )
  assert.equal(
    parseSupabaseDevelopmentLockState(
      JSON.stringify(lockState({ mode: undefined })),
    ).legacy,
    true,
  )
})

test("rejects malformed or expanded guarded lock state", () => {
  for (const value of [
    "not-json",
    JSON.stringify(lockState({ pid: 0 })),
    JSON.stringify(lockState({ childPid: -1 })),
    JSON.stringify(lockState({ runTokenHash: "secret" })),
    JSON.stringify(lockState({ acquiredAt: "yesterday" })),
    JSON.stringify(lockState({ mode: "production" })),
    JSON.stringify(lockState({ purpose: "password-rotation" })),
    JSON.stringify({ ...lockState(), databaseUrl: "must-not-be-accepted" }),
  ]) {
    assert.throws(() => parseSupabaseDevelopmentLockState(value))
  }
})

test("verifies only the exact direct child recorded by the lock", () => {
  const state = parseSupabaseDevelopmentLockState(JSON.stringify(lockState()))

  assert.deepEqual(
    inspectGuardedProcessOwnership({
      lockState: state,
      processRecords: [
        { pid: 100, parentPid: 50, name: "node.exe", startedAt: null },
        { pid: 101, parentPid: 100, name: "node.exe", startedAt: null },
      ],
    }),
    { state: "develop-owned", verified: true, developOwned: true },
  )
  assert.deepEqual(
    inspectGuardedProcessOwnership({
      lockState: state,
      processRecords: [
        { pid: 100, parentPid: 50, name: "node.exe", startedAt: null },
        { pid: 101, parentPid: 999, name: "node.exe", startedAt: null },
      ],
    }),
    {
      state: "child-parent-mismatch",
      verified: false,
      developOwned: false,
    },
  )
})

test("uses lock time to reject reused PIDs when parent metadata is unavailable", () => {
  const state = parseSupabaseDevelopmentLockState(JSON.stringify(lockState()))

  assert.deepEqual(
    inspectGuardedProcessOwnership({
      lockState: state,
      processRecords: [
        {
          pid: 100,
          parentPid: null,
          name: "node",
          startedAt: "2026-08-14T09:59:00.000Z",
        },
        {
          pid: 101,
          parentPid: null,
          name: "node",
          startedAt: "2026-08-14T10:00:01.000Z",
        },
      ],
    }),
    { state: "develop-recorded", verified: true, developOwned: true },
  )

  assert.equal(
    inspectGuardedProcessOwnership({
      lockState: state,
      processRecords: [
        {
          pid: 100,
          parentPid: null,
          name: "node",
          startedAt: "2026-08-14T10:01:00.000Z",
        },
      ],
    }).state,
    "owner-pid-reused",
  )
})

test("classifies healthy, slow, partial, and unresponsive probe series", () => {
  assert.equal(
    summarizeBackendHealth([
      { ok: true, latencyMs: 10 },
      { ok: true, latencyMs: 20 },
      { ok: true, latencyMs: 30 },
    ]).state,
    "healthy",
  )
  assert.equal(
    summarizeBackendHealth([
      { ok: true, latencyMs: 10 },
      { ok: true, latencyMs: 1_001 },
      { ok: true, latencyMs: 20 },
    ]).state,
    "degraded",
  )
  assert.equal(
    summarizeBackendHealth([
      { ok: true, latencyMs: 10 },
      { ok: false, latencyMs: 2_500 },
      { ok: true, latencyMs: 20 },
    ]).state,
    "degraded",
  )
  assert.equal(
    summarizeBackendHealth([
      { ok: false, latencyMs: 2_500 },
      { ok: false, latencyMs: 2_500 },
      { ok: false, latencyMs: 2_500 },
    ]).state,
    "unresponsive",
  )
})

test("runs a bounded injected health series without network access", async () => {
  let calls = 0
  const result = await runBackendHealthSeries({
    attempts: 3,
    intervalMs: 0,
    probe: async () => {
      calls += 1
      return { ok: true, latencyMs: calls }
    },
  })

  assert.equal(calls, 3)
  assert.deepEqual(result, {
    state: "healthy",
    successful: 3,
    attempted: 3,
    maximumLatencyMs: 3,
  })
})
