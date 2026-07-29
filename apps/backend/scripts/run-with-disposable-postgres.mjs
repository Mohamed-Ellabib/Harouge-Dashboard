import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import EmbeddedPostgres from "embedded-postgres";

const require = createRequire(import.meta.url);
const {
  assertSafeTestDatabase,
  loadTestEnvironment,
} = require("./test-environment.js");
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = resolve(scriptDirectory, "..");

process.env.NODE_ENV = "test";
loadTestEnvironment(backendDirectory);
delete process.env.TEST_DATABASE_GUARD_VALIDATED;
const target = assertSafeTestDatabase();
const databaseUrl = new URL(process.env.TEST_DATABASE_URL);
const command = process.argv[2];
const commandArgs = process.argv.slice(3);

if (!command) {
  throw new Error(
    "A command is required after the disposable database wrapper.",
  );
}

const testDataDirectory = resolve(tmpdir(), "medusa-phase05", "test-data");
const databaseDirectory = resolve(testDataDirectory, "postgres-v18");
const lockDirectory = resolve(testDataDirectory, "locks");
mkdirSync(databaseDirectory, { recursive: true });
mkdirSync(lockDirectory, { recursive: true });

const runLockPath = resolve(lockDirectory, "disposable-postgres-run.lock");
let runLockDescriptor;
let runLockOwned = false;
let childProcess;

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

const writeRunLockState = (childPid) => {
  ftruncateSync(runLockDescriptor, 0);
  writeSync(
    runLockDescriptor,
    JSON.stringify({
      pid: process.pid,
      childPid: childPid ?? null,
      acquiredAt: new Date().toISOString(),
    }),
    0,
    "utf8",
  );
};

const acquireRunLock = () => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      runLockDescriptor = openSync(runLockPath, "wx", 0o600);
      runLockOwned = true;
      writeRunLockState();
      process.env.DISPOSABLE_DATABASE_RUN_LOCK_HELD = "true";
      process.env.DISPOSABLE_DATABASE_LOCK_PATH = runLockPath;
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }

      let ownerPid = 0;
      let childPid = 0;
      let lockAgeMilliseconds = 0;

      try {
        const lockState = JSON.parse(readFileSync(runLockPath, "utf8"));
        ownerPid = Number(lockState.pid);
        childPid = Number(lockState.childPid);
      } catch {
        lockAgeMilliseconds = Date.now() - statSync(runLockPath).mtimeMs;
      }

      if (processIsAlive(ownerPid) || processIsAlive(childPid)) {
        throw new Error(
          "The disposable PostgreSQL database is already in use by another guarded run.",
        );
      }

      if (!ownerPid && lockAgeMilliseconds < 30_000) {
        throw new Error(
          "The disposable PostgreSQL database lock is being initialized by another guarded run.",
        );
      }

      unlinkSync(runLockPath);
    }
  }

  throw new Error("The disposable PostgreSQL run lock could not be acquired.");
};

const releaseRunLock = () => {
  delete process.env.DISPOSABLE_DATABASE_RUN_LOCK_HELD;
  delete process.env.DISPOSABLE_DATABASE_LOCK_PATH;

  if (!runLockOwned) {
    return;
  }

  if (runLockDescriptor !== undefined) {
    closeSync(runLockDescriptor);
    runLockDescriptor = undefined;
  }

  if (existsSync(runLockPath)) {
    unlinkSync(runLockPath);
  }

  runLockOwned = false;
};

const postgres = new EmbeddedPostgres({
  databaseDir: databaseDirectory,
  port: Number(target.port),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  authMethod: "scram-sha-256",
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => undefined,
  onError: () => undefined,
});

let childStatus = 1;
let requestedSignal;
let shutdownRequestCount = 0;
let forcedShutdownTimer;

const childHasExited = (child) =>
  !child || child.exitCode !== null || child.signalCode !== null;

const forceChildTermination = () => {
  if (childHasExited(childProcess)) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(childProcess.pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-childProcess.pid, "SIGKILL");
    } catch {
      childProcess.kill("SIGKILL");
    }
  }

  if (!childHasExited(childProcess)) {
    childProcess.kill("SIGKILL");
  }
};

const scheduleForcedShutdown = () => {
  clearTimeout(forcedShutdownTimer);
  forcedShutdownTimer = setTimeout(forceChildTermination, 15_000);
};

const handleChildLifecycleMessage = (message) => {
  if (message?.type === "guarded-disposable-shutdown-acknowledged") {
    clearTimeout(forcedShutdownTimer);
    forcedShutdownTimer = setTimeout(forceChildTermination, 120_000);
  } else if (message?.type === "guarded-disposable-cleanup-started") {
    clearTimeout(forcedShutdownTimer);
    forcedShutdownTimer = setTimeout(forceChildTermination, 60_000);
  } else if (message?.type === "guarded-disposable-cleanup-complete") {
    clearTimeout(forcedShutdownTimer);
    forcedShutdownTimer = setTimeout(forceChildTermination, 5_000);
  }
};

const deliverShutdownRequest = () => {
  if (childHasExited(childProcess)) {
    return;
  }

  scheduleForcedShutdown();

  if (childProcess.connected) {
    try {
      childProcess.send(
        { type: "guarded-disposable-shutdown" },
        () => undefined,
      );
    } catch {
      // The bounded timer remains the fail-safe if the IPC channel closes.
    }
  }

  if (process.platform === "win32") {
    return;
  }

  childProcess.kill(requestedSignal);
};

const requestShutdown = (signal) => {
  requestedSignal ??= signal;
  shutdownRequestCount += 1;

  if (shutdownRequestCount > 1) {
    forceChildTermination();
    return;
  }

  deliverShutdownRequest();
};

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

const targetIsReady = async () => {
  const portIsOpen = await new Promise((resolvePort) => {
    const socket = createConnection({ host: "127.0.0.1", port: target.port });
    const finish = (isOpen) => {
      socket.destroy();
      resolvePort(isOpen);
    };

    socket.setTimeout(1_500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

  if (!portIsOpen) {
    return false;
  }

  const client = postgres.getPgClient(target.databaseName, "127.0.0.1");

  try {
    await client.connect();
    await client.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
};

const stopOwnedPostgres = async () => {
  const postgresProcess = postgres.process;

  if (process.platform !== "win32" || !postgresProcess) {
    await postgres.stop();
    return;
  }

  const postgresProcessId = postgresProcess.pid;

  if (!Number.isSafeInteger(postgresProcessId) || postgresProcessId <= 0) {
    throw new Error(
      "The owned disposable PostgreSQL process has no valid process ID.",
    );
  }

  if (processIsAlive(postgresProcessId)) {
    const { pg_ctl: pgCtl } = await import("@embedded-postgres/windows-x64");
    const result = spawnSync(
      pgCtl,
      ["stop", "-D", databaseDirectory, "-m", "fast", "-w", "-t", "30"],
      {
        stdio: "ignore",
        shell: false,
        timeout: 35_000,
        windowsHide: true,
      },
    );

    if (
      result.error ||
      (result.status !== 0 && processIsAlive(postgresProcessId))
    ) {
      throw new Error(
        "The owned disposable PostgreSQL process did not stop cleanly.",
      );
    }
  }

  if (processIsAlive(postgresProcessId)) {
    throw new Error(
      "The owned disposable PostgreSQL process remained alive after shutdown.",
    );
  }

  // The package's Windows stop() waits on an exit event that may already have
  // fired after pg_ctl returns. Clear its public process handle so its exit hook
  // cannot wait forever on that stale event.
  postgres.process = undefined;
};

try {
  acquireRunLock();

  if (!(await targetIsReady())) {
    if (!existsSync(resolve(databaseDirectory, "PG_VERSION"))) {
      await postgres.initialise();
    }

    await postgres.start();

    const client = postgres.getPgClient("postgres", "127.0.0.1");
    await client.connect();
    const existing = await client.query(
      "select 1 from pg_database where datname = $1",
      [target.databaseName],
    );
    await client.end();

    if (!existing.rowCount) {
      await postgres.createDatabase(target.databaseName);
    }
  }

  console.log(
    `Disposable PostgreSQL is ready at ${target.host}:${target.port}/${target.databaseName}.`,
  );

  if (requestedSignal) {
    throw new Error("The guarded disposable database run was interrupted.");
  }

  const child = spawn(command, commandArgs, {
    cwd: backendDirectory,
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
    stdio: ["inherit", "inherit", "inherit", "ipc"],
    detached: process.platform !== "win32",
    shell: false,
  });
  childProcess = child;
  child.on("message", handleChildLifecycleMessage);

  if (!Number.isSafeInteger(child.pid) || child.pid <= 0) {
    throw new Error("The guarded disposable database child did not start.");
  }

  writeRunLockState(child.pid);

  if (requestedSignal) {
    deliverShutdownRequest();
  }

  childStatus = await new Promise((resolveStatus, rejectStatus) => {
    child.once("error", rejectStatus);
    child.once("exit", (code) => resolveStatus(code ?? 1));
  });
  clearTimeout(forcedShutdownTimer);
  forcedShutdownTimer = undefined;
  childProcess = undefined;
} finally {
  clearTimeout(forcedShutdownTimer);

  let postgresStopError;

  if (runLockOwned) {
    try {
      await stopOwnedPostgres();
    } catch (error) {
      postgresStopError = error;
    }
  }

  releaseRunLock();

  if (postgresStopError) {
    throw postgresStopError;
  }
}

process.exit(childStatus);
