const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

const {
  assertSafeTestDatabase,
  loadTestEnvironment,
} = require("../scripts/test-environment")

loadTestEnvironment(process.cwd())
assertSafeTestDatabase()
MetadataStorage.clear()
