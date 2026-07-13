const { spawnSync } = require("child_process");
const { dirname, resolve } = require("path");

const {
  assertSafeTestDatabase,
  loadTestEnvironment,
} = require("./test-environment");

process.env.NODE_ENV = "test";
loadTestEnvironment(resolve(__dirname, ".."));
delete process.env.TEST_DATABASE_GUARD_VALIDATED;
const target = assertSafeTestDatabase();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.TEST_DATABASE_GUARD_VALIDATED = "true";

const args = process.argv.slice(2);

if (!args.length) {
  console.error("A Medusa CLI command is required.");
  process.exit(1);
}

console.log(
  "Running guarded Medusa command on disposable local PostgreSQL " +
    target.host +
    ":" +
    target.port +
    ".",
);

const packagePath = require.resolve("@medusajs/cli/package.json");
const cliPath = resolve(dirname(packagePath), "cli.js");
const result = spawnSync(process.execPath, [cliPath, ...args], {
  cwd: resolve(__dirname, ".."),
  env: process.env,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
