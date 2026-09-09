import { spawn, spawnSync } from "node:child_process";
import { createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const {
  assertOwnedDisposableDatabaseRun,
  assertSafeTestDatabase,
  loadTestEnvironment,
} = require("./test-environment.js");

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = resolve(scriptDirectory, "..");
const compiledBackendDirectory = resolve(backendDirectory, ".medusa", "server");
const repositoryDirectory = resolve(backendDirectory, "..", "..");
const storefrontDirectory = resolve(repositoryDirectory, "apps", "storefront");
const phase3b = process.argv.includes("--phase3b");
const phaseLabel = phase3b ? "Phase 3B" : "Phase 3A";
const phaseSlug = phase3b ? "phase3b" : "phase3a";
const smokeRoot = resolve(tmpdir(), `medusa-${phaseSlug}-smoke`);
const runDirectory = resolve(smokeRoot, randomUUID());
const handoffPath = resolve(runDirectory, "runtime-handoff.json");
const expectedDatabaseLockPath = resolve(
  tmpdir(),
  "medusa-phase05",
  "test-data",
  "locks",
  "disposable-postgres-run.lock",
);
const acknowledgement = `guarded-local-${phaseSlug}`;
const localBackendOrigin = "http://127.0.0.1:9000";

process.title = `medusa-${phaseSlug}-guarded-storefront-smoke`;
process.env.NODE_ENV = "test";
loadTestEnvironment(backendDirectory);
delete process.env.TEST_DATABASE_GUARD_VALIDATED;
assertSafeTestDatabase();
assertOwnedDisposableDatabaseRun();

const testDatabaseUrl = new URL(process.env.TEST_DATABASE_URL);
const localDatabaseHost = ["127.0.0.1", "localhost", "::1"].includes(
  testDatabaseUrl.hostname,
);

if (
  !localDatabaseHost ||
  testDatabaseUrl.pathname.slice(1) !== "medusa_phase05_disposable" ||
  process.env.DISPOSABLE_DATABASE_RUN_LOCK_HELD !== "true" ||
  resolve(process.env.DISPOSABLE_DATABASE_LOCK_PATH ?? "") !==
    expectedDatabaseLockPath
) {
  throw new Error(
    `${phaseLabel} smoke requires the locked, exact loopback disposable database.`,
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.TEST_DATABASE_GUARD_VALIDATED = "true";
process.env[phase3b ? "PHASE3B_COMMERCE_SMOKE" : "PHASE3A_STOREFRONT_SMOKE"] =
  acknowledgement;
process.env.TRUSTED_PROXY_IPS = "";

const ensureSafeRunDirectory = () => {
  const relativeRun = relative(smokeRoot, runDirectory);

  if (
    !relativeRun ||
    relativeRun.startsWith("..") ||
    runDirectory === smokeRoot ||
    !runDirectory.startsWith(`${smokeRoot}${sep}`)
  ) {
    throw new Error(`${phaseLabel} smoke temporary directory is invalid.`);
  }
};

const cleanupStaleRunDirectories = () => {
  for (const entry of readdirSync(smokeRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = resolve(smokeRoot, entry.name);
    const relativeCandidate = relative(smokeRoot, candidate);

    if (
      candidate === runDirectory ||
      !relativeCandidate ||
      relativeCandidate.startsWith("..") ||
      candidate === smokeRoot ||
      !candidate.startsWith(`${smokeRoot}${sep}`)
    ) {
      continue;
    }

    rmSync(candidate, { recursive: true, force: true });
  }
};

ensureSafeRunDirectory();
mkdirSync(runDirectory, { recursive: true });
process.env.XDG_CONFIG_HOME = resolve(runDirectory, "config");
process.env.XDG_CACHE_HOME = resolve(runDirectory, "cache");
process.env.XDG_DATA_HOME = resolve(runDirectory, "data");
mkdirSync(process.env.XDG_CONFIG_HOME, { recursive: true });
mkdirSync(process.env.XDG_CACHE_HOME, { recursive: true });
mkdirSync(process.env.XDG_DATA_HOME, { recursive: true });

const portableNode = (() => {
  const configured = process.env.TEST_NODE_BINARY;
  const fallback = resolve(
    tmpdir(),
    "medusa-phase05",
    "test-data",
    "node-v22",
    "node-v22.23.1-win-x64",
    "node.exe",
  );
  const currentMajor = Number(process.versions.node.split(".")[0]);

  if (configured && existsSync(configured)) {
    return configured;
  }

  if (currentMajor >= 20 && currentMajor < 24) {
    return process.execPath;
  }

  if (existsSync(fallback)) {
    return fallback;
  }

  throw new Error(
    `${phaseLabel} live acceptance requires Node 20 through 23 or TEST_NODE_BINARY.`,
  );
})();

const cliPath = resolve(
  dirname(require.resolve("@medusajs/cli/package.json")),
  "cli.js",
);
const vitePath = resolve(
  dirname(require.resolve("vite/package.json")),
  "bin",
  "vite.js",
);
const sensitiveValues = new Set();
const registerSensitiveValues = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.length >= 16) {
      sensitiveValues.add(value);
    }
  }
};
const runtimeSecrets = {
  JWT_SECRET: randomBytes(48).toString("base64url"),
  COOKIE_SECRET: randomBytes(48).toString("base64url"),
  VENDOR_SESSION_SECRET: randomBytes(48).toString("base64url"),
};
registerSensitiveValues(...Object.values(runtimeSecrets));
const phase3bPlatformCredentials = phase3b
  ? {
      email: "platform-owner@phase3b.example.test",
      password: `${randomBytes(24).toString("base64url")}!Aa7`,
    }
  : null;

if (phase3bPlatformCredentials) {
  registerSensitiveValues(phase3bPlatformCredentials.password);
}

const runtimeProcessEnvironment = {};
for (const key of [
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "TMPDIR",
  "HOME",
  "USERPROFILE",
  "LOCALAPPDATA",
  "APPDATA",
  "ComSpec",
  "COMSPEC",
  "PATHEXT",
]) {
  if (process.env[key]) {
    runtimeProcessEnvironment[key] = process.env[key];
  }
}

const backendProcessEnvironment = {
  ...runtimeProcessEnvironment,
  ...runtimeSecrets,
  NODE_ENV: "test",
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  TEST_DATABASE_DISPOSABLE: "medusa_phase05_disposable",
  TEST_DATABASE_GUARD_VALIDATED: "true",
  DISPOSABLE_DATABASE_RUN_LOCK_HELD: "true",
  DISPOSABLE_DATABASE_LOCK_PATH: expectedDatabaseLockPath,
  [phase3b ? "PHASE3B_COMMERCE_SMOKE" : "PHASE3A_STOREFRONT_SMOKE"]:
    acknowledgement,
  TRUSTED_PROXY_IPS: "",
  HOST: "127.0.0.1",
  PORT: "9000",
  STORE_CORS:
    "http://127.0.0.1:5175,http://localhost:5176,http://127.0.0.1:5176,http://localhost:5175",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:9000",
  PLATFORM_ADMIN_LOGIN_URL: "/",
  SAAS_TEMPORARY_DOMAIN_BASE: `${phaseSlug}-smoke.local`,
  SAAS_SUPPORTED_CURRENCIES: "lyd",
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
  XDG_DATA_HOME: process.env.XDG_DATA_HOME,
  CI: "true",
};
const redact = (value) => {
  let output = String(value ?? "")
    .replace(/pk_[A-Za-z0-9._-]+/g, "[redacted-publishable-key]")
    .replace(
      /postgres(?:ql)?:\/\/[^\s@]+@/gi,
      "postgresql://[redacted-database-auth]@",
    )
    .replace(/(x-publishable-api-key\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]");

  for (const sensitiveValue of sensitiveValues) {
    output = output.split(sensitiveValue).join("[redacted-runtime-value]");
  }

  return output;
};

const outputTail = (value, maximumLines = 40) =>
  redact(value).split(/\r?\n/).filter(Boolean).slice(-maximumLines).join("\n");

const runGuardedMedusa = (args, extraEnvironment = {}) => {
  const result = spawnSync(portableNode, [cliPath, ...args], {
    cwd: backendDirectory,
    env: {
      ...backendProcessEnvironment,
      ...extraEnvironment,
    },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = outputTail(
      `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
    throw new Error(
      `A guarded Medusa command failed.${details ? `\n${details}` : ""}`,
    );
  }
};

const readEncryptedHandoff = (encryptionKey) => {
  const envelope = JSON.parse(readFileSync(handoffPath, "utf8"));

  if (
    envelope?.version !== 1 ||
    envelope?.algorithm !== "aes-256-gcm" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.authTag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("The Phase 3A smoke handoff envelope was invalid.");
  }

  const iv = Buffer.from(envelope.iv, "base64");
  const authTag = Buffer.from(envelope.authTag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
    throw new Error("The Phase 3A smoke handoff envelope was malformed.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  try {
    return JSON.parse(plaintext.toString("utf8"));
  } finally {
    plaintext.fill(0);
  }
};

const resetDisposableSchema = async () => {
  const client = new Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });

  await client.connect();
  try {
    await client.query("drop schema if exists public cascade");
    await client.query("create schema public");
  } finally {
    await client.end();
  }
};

const logsFor = new WeakMap();

const captureLogs = (child) => {
  let logs = "";
  const append = (chunk) => {
    logs = `${logs}${String(chunk)}`.slice(-64 * 1024);
  };

  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  logsFor.set(child, () => logs);
  return child;
};

const childFailureDetails = (child) => {
  const readLogs = logsFor.get(child);
  return outputTail(readLogs ? readLogs() : "");
};

const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
const childHasExited = (child) =>
  child.exitCode !== null || child.signalCode !== null;

const processIsAlive = (pid) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
};

let wrapperProcessId;
const waitForDatabaseLockOwnership = async () => {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      const lockState = JSON.parse(
        readFileSync(expectedDatabaseLockPath, "utf8"),
      );
      const ownerPid = Number(lockState.pid);
      const childPid = Number(lockState.childPid);

      if (childPid === process.pid && processIsAlive(ownerPid)) {
        wrapperProcessId = ownerPid;
        return;
      }
    } catch {
      // The wrapper may still be publishing the child ownership record.
    }

    await delay(50);
  }

  throw new Error(
    "Phase 3A smoke could not verify its disposable database lock ownership.",
  );
};

const waitForHttp = async (url, child, timeoutMilliseconds = 150_000) => {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (childHasExited(child)) {
      const details = childFailureDetails(child);
      throw new Error(
        `The real backend exited before it became ready.${details ? `\n${details}` : ""}`,
      );
    }

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // The backend is still starting.
    }

    await delay(500);
  }

  const details = childFailureDetails(child);
  throw new Error(
    `The real backend did not become ready in time.${details ? `\n${details}` : ""}`,
  );
};

const portIsOpen = (port) =>
  new Promise((resolvePort) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (open) => {
      socket.destroy();
      resolvePort(open);
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

const assertSmokePortsAvailable = async () => {
  const requiredPorts = [9000, 5175, 5176];
  const occupiedPorts = [];

  for (const port of requiredPorts) {
    if (await portIsOpen(port)) {
      occupiedPorts.push(port);
    }
  }

  if (occupiedPorts.length > 0) {
    throw new Error(
      `Phase 3A smoke ports are already in use: ${occupiedPorts.join(", ")}.`,
    );
  }
};

const waitForPort = async (port, child, timeoutMilliseconds = 45_000) => {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (childHasExited(child)) {
      const details = childFailureDetails(child);
      throw new Error(
        `The storefront on port ${port} exited before it became ready.${details ? `\n${details}` : ""}`,
      );
    }

    if (await portIsOpen(port)) {
      return;
    }

    await delay(250);
  }

  throw new Error(
    `The storefront on port ${port} did not become ready in time.`,
  );
};

const expectHttpStatus = async (url, expectedStatus, label, publishableKey) => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-publishable-api-key": publishableKey,
    },
    signal: AbortSignal.timeout(5_000),
  });

  if (response.status !== expectedStatus) {
    throw new Error(
      `The guarded ${label} probe returned ${response.status}; expected ${expectedStatus}.`,
    );
  }

  return response;
};

const responseCookie = (response, label) => {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  const cookie = setCookies[0]?.split(";")[0] ?? "";

  if (!cookie.includes("=")) {
    throw new Error(`The guarded ${label} session cookie was unavailable.`);
  }

  registerSensitiveValues(cookie);
  return cookie;
};

const expectLocalResponse = async (path, expectedStatus, label, init = {}) => {
  const response = await fetch(`${localBackendOrigin}${path}`, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status !== expectedStatus) {
    throw new Error(
      `The guarded ${label} request returned ${response.status}; expected ${expectedStatus}.`,
    );
  }

  return response;
};

const verifyAuthenticatedPhase2cExternalRerun = async () => {
  if (!phase3bPlatformCredentials) {
    return;
  }

  const authentication = await expectLocalResponse(
    "/auth/user/emailpass",
    200,
    "platform authentication",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(phase3bPlatformCredentials),
    },
  );
  const authenticationPayload = await authentication.json();
  const platformToken = authenticationPayload?.token;

  if (typeof platformToken !== "string" || !platformToken) {
    throw new Error(
      "The guarded platform authentication token was unavailable.",
    );
  }
  registerSensitiveValues(platformToken);

  const session = await expectLocalResponse(
    "/auth/session",
    200,
    "platform session",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${platformToken}` },
    },
  );
  const platformCookie = responseCookie(session, "platform");
  await expectLocalResponse("/admin/users/me", 200, "platform identity", {
    headers: { Cookie: platformCookie },
  });

  const merchantPassword = `${randomBytes(24).toString("base64url")}!Aa7`;
  registerSensitiveValues(merchantPassword);
  const provision = await expectLocalResponse(
    "/admin/saas/provisioning",
    201,
    "Phase 2C provisioning",
    {
      method: "POST",
      headers: {
        Cookie: platformCookie,
        "Content-Type": "application/json",
        "Idempotency-Key": "phase3b:external:phase2c:provision",
      },
      body: JSON.stringify({
        tenant: {
          name: "Phase 2C External Rerun Tenant",
          key: "phase2c-external-rerun",
          reuse_existing: false,
        },
        store: {
          name: "Phase 2C External Rerun Store",
          handle: "phase2c-external-rerun-store",
          plan_code: "professional_commerce",
          locale: "ar-LY",
          timezone: "Africa/Tripoli",
          currency_code: "lyd",
          status_after_provisioning: "active",
        },
        owner: {
          email: "merchant@phase2c-rerun.example.test",
          display_name: "Synthetic Phase 2C Merchant",
          initial_password: merchantPassword,
          reuse_existing_account: false,
        },
        brand: {
          primary_color: "#1257a6",
          secondary_color: "#f4eee5",
          typography_key: "cairo",
        },
        commerce: {
          region_name: "Phase 2C External Libya",
          countries: ["ly"],
          stock_location_name: "Phase 2C External Stock",
          sales_channel_name: "Phase 2C External Web",
        },
        contact: {},
        domain: {},
      }),
    },
  );
  const provisionPayload = await provision.json();
  const storeProfileId = provisionPayload?.provisioning?.store_profile_id;

  if (typeof storeProfileId !== "string" || !storeProfileId) {
    throw new Error("The guarded Phase 2C provisioning result was invalid.");
  }

  const setup = await expectLocalResponse(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/commerce-setup`,
    201,
    "Phase 2C commerce setup",
    {
      method: "POST",
      headers: {
        Cookie: platformCookie,
        "Content-Type": "application/json",
        "Idempotency-Key": "phase3b:external:phase2c:commerce",
      },
      body: JSON.stringify({
        shipping_option: {
          name: "Guarded local delivery",
          description: "Current-tree Phase 2C external rerun.",
          amount: 10,
        },
      }),
    },
  );
  const setupPayload = await setup.json();

  if (setupPayload?.commerce_setup?.readiness_status !== "ready") {
    throw new Error("The guarded Phase 2C commerce setup was not ready.");
  }

  const readiness = await expectLocalResponse(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/commerce-readiness`,
    200,
    "Phase 2C commerce readiness",
    { headers: { Cookie: platformCookie } },
  );
  const readinessPayload = await readiness.json();

  if (readinessPayload?.commerce_readiness?.status !== "ready") {
    throw new Error("The guarded Phase 2C readiness response was not ready.");
  }

  console.log(
    "Phase 2C current-tree authenticated external real-backend rerun passed.",
  );
};

const merchantSession = async (merchant, label) => {
  const login = await expectLocalResponse(
    "/vendor/auth/login",
    200,
    `${label} merchant login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: merchant.email,
        password: merchant.password,
        store_handle: merchant.handle,
      }),
    },
  );
  return responseCookie(login, `${label} merchant`);
};

const verifyMerchantOrderIsolation = async (context) => {
  if (!phase3b || !context?.merchantA || !context?.merchantB) {
    throw new Error(
      "The Phase 3B merchant verification context is unavailable.",
    );
  }

  const [cookieA, cookieB] = await Promise.all([
    merchantSession(context.merchantA, "Store A"),
    merchantSession(context.merchantB, "Store B"),
  ]);
  const ownList = await expectLocalResponse(
    "/vendor/orders",
    200,
    "Store A merchant Order list",
    { headers: { Cookie: cookieA } },
  );
  const ownPayload = await ownList.json();
  const ownOrders = Array.isArray(ownPayload?.orders) ? ownPayload.orders : [];
  const completedOrder = ownOrders.find(
    (order) => typeof order?.id === "string" && order.id,
  );

  if (!completedOrder) {
    throw new Error(
      "The Store A merchant has no completed pilot Order to verify.",
    );
  }

  await expectLocalResponse(
    `/vendor/orders/${encodeURIComponent(completedOrder.id)}`,
    200,
    "Store A merchant Order detail",
    { headers: { Cookie: cookieA } },
  );
  await expectLocalResponse(
    `/vendor/orders/${encodeURIComponent(completedOrder.id)}`,
    404,
    "Store B merchant denial",
    { headers: { Cookie: cookieB } },
  );
  console.log(
    "Phase 3B owning-merchant Order visibility and other-Store denial passed.",
  );
};

const catalogHandles = async (origin, publishableKey, handle) => {
  const search = new URLSearchParams({
    fields: "handle",
    limit: handle ? "2" : "100",
    offset: "0",
  });

  if (handle) {
    search.set("handle", handle);
  }

  const response = await expectHttpStatus(
    `${origin}/store/products?${search.toString()}`,
    200,
    handle ? "cross-Store Product" : "Store catalog",
    publishableKey,
  );
  const payload = await response.json();

  if (!payload || !Array.isArray(payload.products)) {
    throw new Error(
      "A guarded Store catalog probe returned an invalid payload.",
    );
  }

  return payload.products
    .map((product) => product?.handle)
    .filter((value) => typeof value === "string");
};

const verifyLiveCommerceMatrix = async (context) => {
  const [capabilityAResponse, capabilityBResponse] = await Promise.all([
    expectHttpStatus(
      "http://127.0.0.1:5175/store/saas/commerce-capabilities",
      200,
      "Store A commerce capability",
      context.publishableKeyA,
    ),
    expectHttpStatus(
      "http://localhost:5176/store/saas/commerce-capabilities",
      200,
      "Store B commerce capability",
      context.publishableKeyB,
    ),
    expectHttpStatus(
      "http://localhost:5175/store/saas/commerce-capabilities",
      404,
      "crossed B-host/A-key commerce capability",
      context.publishableKeyA,
    ),
    expectHttpStatus(
      "http://127.0.0.1:5176/store/saas/commerce-capabilities",
      404,
      "crossed A-host/B-key commerce capability",
      context.publishableKeyB,
    ),
  ]);
  const [capabilityA, capabilityB] = await Promise.all([
    capabilityAResponse.json(),
    capabilityBResponse.json(),
  ]);
  const exactCapability = (value) =>
    value?.online_checkout?.status === "available" &&
    value.online_checkout.currency_code === "lyd" &&
    Array.isArray(value.online_checkout.country_codes) &&
    value.online_checkout.country_codes.length === 1 &&
    value.online_checkout.country_codes[0] === "ly";

  if (!exactCapability(capabilityA) || !exactCapability(capabilityB)) {
    throw new Error("The guarded commerce-capability probes failed.");
  }

  const purchaseAResponse = await expectHttpStatus(
    `http://127.0.0.1:5175/store/saas/products/${encodeURIComponent(context.storeAProducts[0])}/purchase-options`,
    200,
    "Store A purchase option",
    context.publishableKeyA,
  );
  const purchaseA = await purchaseAResponse.json();

  if (
    purchaseA?.product_handle !== context.storeAProducts[0] ||
    purchaseA?.currency_code !== "lyd" ||
    !Array.isArray(purchaseA?.options) ||
    !Array.isArray(purchaseA?.variants) ||
    purchaseA.variants.length < 1 ||
    typeof purchaseA.variants[0]?.id !== "string" ||
    !Number.isSafeInteger(purchaseA.variants[0]?.unit_price) ||
    purchaseA.variants[0]?.available_for_sale !== true
  ) {
    throw new Error("The guarded purchase-option probe failed.");
  }

  await expectHttpStatus(
    `http://localhost:5176/store/saas/products/${encodeURIComponent(context.storeAProducts[0])}/purchase-options`,
    404,
    "cross-Store purchase option",
    context.publishableKeyB,
  );
};

const verifyLiveStoreMatrix = async (context) => {
  await Promise.all([
    expectHttpStatus(
      "http://127.0.0.1:5175/store/vendors/resolve",
      200,
      "Store A profile",
      context.publishableKeyA,
    ),
    expectHttpStatus(
      "http://localhost:5176/store/vendors/resolve",
      200,
      "Store B profile",
      context.publishableKeyB,
    ),
    expectHttpStatus(
      "http://localhost:5175/store/vendors/resolve",
      404,
      "crossed B-host/A-key profile",
      context.publishableKeyA,
    ),
    expectHttpStatus(
      "http://127.0.0.1:5176/store/vendors/resolve",
      404,
      "crossed A-host/B-key profile",
      context.publishableKeyB,
    ),
  ]);

  const [storeAHandles, storeBHandles, crossedProductHandles] =
    await Promise.all([
      catalogHandles("http://127.0.0.1:5175", context.publishableKeyA),
      catalogHandles("http://localhost:5176", context.publishableKeyB),
      catalogHandles(
        "http://localhost:5176",
        context.publishableKeyB,
        context.storeAProducts[0],
      ),
    ]);

  const storeAIsolated =
    context.storeAProducts.every((handle) => storeAHandles.includes(handle)) &&
    context.storeBProducts.every((handle) => !storeAHandles.includes(handle));
  const storeBIsolated =
    context.storeBProducts.every((handle) => storeBHandles.includes(handle)) &&
    context.storeAProducts.every((handle) => !storeBHandles.includes(handle));

  if (!storeAIsolated || !storeBIsolated || crossedProductHandles.length > 0) {
    throw new Error("The guarded live Store isolation probes failed.");
  }

  if (phase3b) {
    await verifyLiveCommerceMatrix(context);
  }
};

const startBackend = () =>
  captureLogs(
    spawn(
      portableNode,
      [cliPath, "start", "--host", "127.0.0.1", "--port", "9000"],
      {
        cwd: compiledBackendDirectory,
        env: {
          ...backendProcessEnvironment,
        },
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
      },
    ),
  );

const startStorefront = (port, publishableKey) =>
  captureLogs(
    spawn(
      portableNode,
      [vitePath, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      {
        cwd: storefrontDirectory,
        env: {
          ...runtimeProcessEnvironment,
          NODE_ENV: "development",
          STOREFRONT_PROXY_TARGET: localBackendOrigin,
          VITE_MEDUSA_PUBLISHABLE_KEY: publishableKey,
          VITE_STOREFRONT_DEV_HANDLE: "",
          VITE_STOREFRONT_VISUAL_PREVIEW: "false",
        },
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
      },
    ),
  );

const terminateOwnedProcessTree = (child, force) => {
  if (!child?.pid) {
    return;
  }

  if (process.platform === "win32") {
    if (!force) {
      child.kill("SIGTERM");
      return;
    }

    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
      windowsHide: true,
    });

    if (!childHasExited(child)) {
      child.kill("SIGKILL");
    }
    return;
  }

  const signal = force ? "SIGKILL" : "SIGTERM";

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
};

const waitForPortsClosed = async (ports, timeoutMilliseconds) => {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    const states = await Promise.all(ports.map(portIsOpen));

    if (states.every((open) => !open)) {
      return true;
    }

    await delay(200);
  }

  return false;
};

const waitForChildExit = async (child, timeoutMilliseconds) => {
  if (childHasExited(child)) {
    return;
  }

  await Promise.race([once(child, "exit"), delay(timeoutMilliseconds)]);
};

const stopChild = async (child, ports = []) => {
  if (!child) {
    return;
  }

  if (!childHasExited(child)) {
    terminateOwnedProcessTree(child, false);
    await waitForChildExit(child, 5_000);
  }

  let portsClosed = await waitForPortsClosed(ports, 2_000);

  if (!childHasExited(child) || !portsClosed) {
    terminateOwnedProcessTree(child, true);
    await waitForChildExit(child, 3_000);
    portsClosed = await waitForPortsClosed(ports, 5_000);
  }

  if (!childHasExited(child) || !portsClosed) {
    throw new Error(
      `An owned Phase 3A smoke process did not terminate cleanly for port ${ports.join(", ")}.`,
    );
  }
};

let backendProcess;
let storefrontAProcess;
let storefrontBProcess;
let shutdownResolve;
let shuttingDown = false;
let wrapperMonitor;
let disposableSchemaOwned = false;
let smokeContext;
let stdinDataHandler;
let commandQueue = Promise.resolve();
const shutdownRequested = new Promise((resolveShutdown) => {
  shutdownResolve = resolveShutdown;
});

const requestShutdown = () => {
  if (!shuttingDown) {
    shuttingDown = true;
    shutdownResolve();
  }
};

const notifyParent = async (type) => {
  if (!process.connected) {
    return;
  }

  await new Promise((resolveNotification) => {
    const timeout = setTimeout(resolveNotification, 500);

    try {
      process.send({ type }, () => {
        clearTimeout(timeout);
        resolveNotification();
      });
    } catch {
      clearTimeout(timeout);
      resolveNotification();
    }
  });
};

const handleParentMessage = (message) => {
  if (message?.type === "guarded-disposable-shutdown") {
    requestShutdown();
    void notifyParent("guarded-disposable-shutdown-acknowledged");
  }
};

const handleParentDisconnect = () => requestShutdown();

const monitorWrapperOwnership = () => {
  wrapperMonitor = setInterval(() => {
    if (!processIsAlive(wrapperProcessId)) {
      requestShutdown();
    }
  }, 500);
  wrapperMonitor.unref();
};

const restartBackend = async () => {
  console.log("Restarting the real backend without reseeding...");
  await stopChild(backendProcess, [9000]);
  backendProcess = startBackend();
  await waitForHttp(`${localBackendOrigin}/health`, backendProcess);
  await verifyLiveStoreMatrix(smokeContext);
  console.log(
    "Real backend restart complete; guarded Store context probes passed.",
  );
};

const cleanup = async () => {
  if (wrapperMonitor) {
    clearInterval(wrapperMonitor);
    wrapperMonitor = undefined;
  }

  const cleanupErrors = [];
  const attempt = async (operation) => {
    try {
      await operation();
      return true;
    } catch (error) {
      cleanupErrors.push(error);
      return false;
    }
  };

  const storefrontStops = await Promise.all([
    attempt(() => stopChild(storefrontAProcess, [5175])),
    attempt(() => stopChild(storefrontBProcess, [5176])),
  ]);
  const backendStopped = await attempt(() => stopChild(backendProcess, [9000]));

  if (disposableSchemaOwned) {
    if (backendStopped && storefrontStops.every(Boolean)) {
      await attempt(async () => {
        await resetDisposableSchema();
        disposableSchemaOwned = false;
      });
    } else {
      cleanupErrors.push(
        new Error(
          "The disposable schema was not reset because an owned HTTP process did not stop.",
        ),
      );
    }
  }

  await attempt(() => {
    if (existsSync(handoffPath)) {
      unlinkSync(handoffPath);
    }
  });

  await attempt(() => {
    ensureSafeRunDirectory();
    rmSync(runDirectory, { recursive: true, force: true });
  });
  sensitiveValues.clear();
  smokeContext = undefined;

  if (cleanupErrors.length > 0) {
    throw cleanupErrors[0];
  }
};

process.once("SIGINT", requestShutdown);
process.once("SIGTERM", requestShutdown);
process.on("message", handleParentMessage);
process.once("disconnect", handleParentDisconnect);

try {
  await waitForDatabaseLockOwnership();
  monitorWrapperOwnership();
  cleanupStaleRunDirectories();
  await assertSmokePortsAvailable();
  console.log("Resetting the exact guarded disposable database...");
  await resetDisposableSchema();
  disposableSchemaOwned = true;
  console.log(
    "Applying current migrations to guarded disposable PostgreSQL...",
  );
  runGuardedMedusa(["db:migrate"]);
  if (phase3bPlatformCredentials) {
    console.log(
      "Creating one runtime-only synthetic platform administrator...",
    );
    runGuardedMedusa([
      "user",
      "--email",
      phase3bPlatformCredentials.email,
      "--password",
      phase3bPlatformCredentials.password,
    ]);
  }
  console.log("Building the current backend for a direct guarded start...");
  runGuardedMedusa(["build"]);

  if (
    !existsSync(resolve(compiledBackendDirectory, "medusa-config.js")) ||
    !existsSync(
      resolve(compiledBackendDirectory, "public", "admin", "index.html"),
    )
  ) {
    throw new Error("The guarded backend build output is incomplete.");
  }

  console.log(
    phase3b
      ? "Provisioning two synthetic checkout-ready Store graphs without customer credentials..."
      : "Creating two synthetic Store graphs without customer credentials...",
  );
  const handoffEncryptionKey = randomBytes(32);
  const encodedHandoffEncryptionKey = handoffEncryptionKey.toString("base64");
  let handoff;

  registerSensitiveValues(encodedHandoffEncryptionKey);

  try {
    runGuardedMedusa(
      [
        "exec",
        phase3b
          ? "./src/scripts/phase3b-commerce-smoke-seed.ts"
          : "./src/scripts/phase3a-storefront-smoke-seed.ts",
      ],
      phase3b
        ? {
            PHASE3B_SMOKE_OUTPUT_FILE: handoffPath,
            PHASE3B_SMOKE_HANDOFF_KEY: encodedHandoffEncryptionKey,
          }
        : {
            PHASE3A_SMOKE_OUTPUT_FILE: handoffPath,
            PHASE3A_SMOKE_HANDOFF_KEY: encodedHandoffEncryptionKey,
          },
    );
    handoff = readEncryptedHandoff(handoffEncryptionKey);
  } finally {
    handoffEncryptionKey.fill(0);

    if (existsSync(handoffPath)) {
      unlinkSync(handoffPath);
    }
  }

  if (
    typeof handoff.publishableKeyA !== "string" ||
    !handoff.publishableKeyA ||
    typeof handoff.publishableKeyB !== "string" ||
    !handoff.publishableKeyB ||
    !Array.isArray(handoff.storeAProducts) ||
    !Array.isArray(handoff.storeBProducts) ||
    (phase3b &&
      (!handoff.merchantA ||
        typeof handoff.merchantA.email !== "string" ||
        typeof handoff.merchantA.password !== "string" ||
        typeof handoff.merchantA.handle !== "string" ||
        !handoff.merchantB ||
        typeof handoff.merchantB.email !== "string" ||
        typeof handoff.merchantB.password !== "string" ||
        typeof handoff.merchantB.handle !== "string"))
  ) {
    throw new Error(`${phaseLabel} smoke seed handoff was invalid.`);
  }

  registerSensitiveValues(handoff.publishableKeyA, handoff.publishableKeyB);
  if (phase3b) {
    registerSensitiveValues(
      handoff.merchantA.password,
      handoff.merchantB.password,
    );
  }
  smokeContext = {
    publishableKeyA: handoff.publishableKeyA,
    publishableKeyB: handoff.publishableKeyB,
    storeAProducts: [...handoff.storeAProducts],
    storeBProducts: [...handoff.storeBProducts],
    ...(phase3b
      ? {
          merchantA: { ...handoff.merchantA },
          merchantB: { ...handoff.merchantB },
        }
      : {}),
  };

  backendProcess = startBackend();
  await waitForHttp(`${localBackendOrigin}/health`, backendProcess);

  if (phase3b) {
    await verifyAuthenticatedPhase2cExternalRerun();
  }

  storefrontAProcess = startStorefront(5175, handoff.publishableKeyA);
  storefrontBProcess = startStorefront(5176, handoff.publishableKeyB);
  await Promise.all([
    waitForPort(5175, storefrontAProcess),
    waitForPort(5176, storefrontBProcess),
  ]);
  await verifyLiveStoreMatrix(smokeContext);

  handoff.publishableKeyA = "";
  handoff.publishableKeyB = "";
  if (phase3b) {
    handoff.merchantA.password = "";
    handoff.merchantB.password = "";
  }

  console.log(`${phaseLabel} guarded real-backend browser smoke is ready.`);
  console.log("Store A: http://127.0.0.1:5175/");
  console.log("Store B: http://localhost:5176/");
  console.log("Crossed A-host/B-key: http://127.0.0.1:5176/");
  console.log("Crossed B-host/A-key: http://localhost:5175/");
  console.log("Type restart and press Enter to restart only the backend.");
  if (phase3b) {
    console.log(
      "Type verify-order after browser completion to verify merchant isolation.",
    );
  }
  console.log("Type stop and press Enter to shut down the guarded smoke.");

  process.stdin.setEncoding("utf8");
  stdinDataHandler = (chunk) => {
    for (const command of String(chunk)
      .split(/\r?\n/)
      .map((value) => value.trim())) {
      if (!command) {
        continue;
      }

      if (command === "restart") {
        commandQueue = commandQueue
          .catch(() => undefined)
          .then(restartBackend)
          .catch((error) => {
            console.error(
              outputTail(error instanceof Error ? error.message : error),
            );
            requestShutdown();
          });
      } else if (command === "verify-order" && phase3b) {
        commandQueue = commandQueue
          .catch(() => undefined)
          .then(() => verifyMerchantOrderIsolation(smokeContext))
          .catch((error) => {
            console.error(
              outputTail(error instanceof Error ? error.message : error),
            );
          });
      } else if (command === "stop") {
        requestShutdown();
      } else if (command === "status") {
        console.log("Guarded smoke processes are running.");
      } else if (command === "logs") {
        for (const [label, child] of [
          ["backend", backendProcess],
          ["storefront-a", storefrontAProcess],
          ["storefront-b", storefrontBProcess],
        ]) {
          const details = childFailureDetails(child);
          console.log(`${label}:\n${details || "No captured output."}`);
        }
      } else {
        console.log(
          phase3b
            ? "Available commands: restart, verify-order, status, logs, stop"
            : "Available commands: restart, status, logs, stop",
        );
      }
    }
  };
  process.stdin.on("data", stdinDataHandler);
  process.stdin.resume();

  await shutdownRequested;
  await commandQueue.catch(() => undefined);
} catch (error) {
  console.error(outputTail(error instanceof Error ? error.message : error));
  process.exitCode = 1;
} finally {
  if (stdinDataHandler) {
    process.stdin.off("data", stdinDataHandler);
    stdinDataHandler = undefined;
  }
  process.stdin.pause();
  await notifyParent("guarded-disposable-cleanup-started");

  try {
    await cleanup();
  } catch (error) {
    console.error(outputTail(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  }

  await notifyParent("guarded-disposable-cleanup-complete");
  process.off("message", handleParentMessage);
  process.off("disconnect", handleParentDisconnect);

  if (process.connected) {
    try {
      process.disconnect();
    } catch {
      // The wrapper may have already closed the IPC channel while cleanup ran.
    }
  }
}
