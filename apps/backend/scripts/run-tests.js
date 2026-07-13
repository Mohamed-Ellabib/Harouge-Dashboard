const { spawnSync } = require("child_process")
const { existsSync } = require("fs")
const { resolve } = require("path")

const {
  assertSafeTestDatabase,
  loadTestEnvironment,
} = require("./test-environment")

const requestedType = process.argv[2] || "all"
const supportedTypes = ["unit", "integration:modules", "integration:http"]

if (requestedType !== "all" && !supportedTypes.includes(requestedType)) {
  console.error(`Unsupported test type: ${requestedType}`)
  process.exit(1)
}

loadTestEnvironment(resolve(__dirname, ".."))
delete process.env.TEST_DATABASE_GUARD_VALIDATED
assertSafeTestDatabase()
// Keep Medusa's config loader on the already-validated local/isolated target.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.TEST_DATABASE_GUARD_VALIDATED = "true"

const runJest = (testType) => {
  const portableNode = process.env.TEST_NODE_BINARY || resolve(
    process.env.TEMP || process.env.TMP || __dirname,
    "medusa-phase05",
    "test-data",
    "node-v22",
    "node-v22.23.1-win-x64",
    "node.exe"
  )
  const currentMajor = Number(process.versions.node.split(".")[0])
  if (currentMajor >= 24 && !existsSync(portableNode)) {
    console.error(
      "Backend integration tests require Node 20 or 22. Install Node 22 or set TEST_NODE_BINARY."
    )
    process.exit(1)
  }
  const testNode =
    process.platform === "win32" && currentMajor >= 24 && existsSync(portableNode)
      ? portableNode
      : process.execPath
  const result = spawnSync(
    testNode,
    [
      "--experimental-vm-modules",
      require.resolve("jest/bin/jest"),
      "--runInBand",
      "--forceExit",
      "--silent",
    ],
    {
      cwd: resolve(__dirname, ".."),
      env: { ...process.env, NODE_ENV: "test", TEST_TYPE: testType },
      stdio: "inherit",
      shell: false,
    }
  )

  if (result.error) {
    throw result.error
  }

  return result.status ?? 1
}

for (const testType of requestedType === "all" ? supportedTypes : [requestedType]) {
  const status = runJest(testType)

  if (status !== 0) {
    process.exit(status)
  }
}
