const { readdirSync, readFileSync, statSync } = require("fs")
const { join } = require("path")
const { spawnSync } = require("child_process")

const appsDirectory = join(__dirname, "..", "apps")
const testPackages = readdirSync(appsDirectory)
  .map((name) => join(appsDirectory, name))
  .filter((directory) => statSync(directory).isDirectory())
  .map((directory) => {
    const packagePath = join(directory, "package.json")

    try {
      return JSON.parse(readFileSync(packagePath, "utf8"))
    } catch {
      return null
    }
  })
  .filter((pkg) => pkg?.name && pkg.scripts?.test)

if (!testPackages.length) {
  console.error("No workspace package exposes an executable test script.")
  process.exit(1)
}

for (const pkg of testPackages) {
  const npmCli = process.env.npm_execpath

  if (!npmCli) {
    console.error("The root test runner must be started through npm.")
    process.exit(1)
  }

  const result = spawnSync(
    process.execPath,
    [npmCli, "run", "test", `--workspace=${pkg.name}`],
    { stdio: "inherit", shell: false }
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
