/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
import {
  createUserAccountWorkflow,
  setAuthAppMetadataWorkflow,
} from "@medusajs/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createHash, timingSafeEqual } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const SUPABASE_DEVELOPMENT_GUARD = "validated-v1"
const SUPER_ADMIN_ROLE_ID = "role_super_admin"
const SUPABASE_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/
const SUPABASE_POOLER_HOST_PATTERN =
  /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pooler\.supabase\.com$/
const BOOTSTRAP_ENVIRONMENT_KEYS = [
  "PLATFORM_ADMIN_BOOTSTRAP_EMAIL",
  "PLATFORM_ADMIN_BOOTSTRAP_PASSWORD",
  "PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME",
  "PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME",
] as const

const processIsAlive = (pid: number) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch (error: any) {
    return error?.code !== "ESRCH"
  }
}

const parseDatabaseUrl = () => {
  try {
    return new URL(process.env.DATABASE_URL || "")
  } catch {
    throw new Error("The Supabase development database identity is invalid.")
  }
}

const assertSupabaseDevelopmentDatabase = () => {
  if (
    process.env.LABIBTECH_SUPABASE_DEVELOPMENT_GUARD !==
      SUPABASE_DEVELOPMENT_GUARD ||
    process.env.NODE_ENV !== "development" ||
    process.env.LABIBTECH_LOCAL_DATABASE_GUARD
  ) {
    throw new Error("The Supabase development database guard is required.")
  }

  if (process.env.MEDUSA_FF_RBAC !== "true") {
    throw new Error("RBAC must be enabled before creating a platform owner.")
  }

  const projectRef = process.env.LABIBTECH_SUPABASE_PROJECT_REF?.trim() || ""
  const databaseUrl = parseDatabaseUrl()
  const hostname = databaseUrl.hostname.toLowerCase()
  const directHost = `db.${projectRef}.supabase.co`
  const directConnection =
    hostname === directHost && databaseUrl.username === "postgres"
  const sessionPoolerConnection =
    SUPABASE_POOLER_HOST_PATTERN.test(hostname) &&
    databaseUrl.username === `postgres.${projectRef}`
  const sslModes = databaseUrl.searchParams.getAll("sslmode")
  const isNeon = hostname === "neon.tech" || hostname.endsWith(".neon.tech")

  if (
    !SUPABASE_PROJECT_REF_PATTERN.test(projectRef) ||
    isNeon ||
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    (!directConnection && !sessionPoolerConnection) ||
    databaseUrl.port !== "5432" ||
    databaseUrl.pathname !== "/postgres" ||
    !databaseUrl.username ||
    !databaseUrl.password ||
    sslModes.length !== 1 ||
    sslModes[0] !== "require" ||
    databaseUrl.searchParams.size !== 1 ||
    Boolean(databaseUrl.hash)
  ) {
    throw new Error("The Supabase development database identity is invalid.")
  }

  const localAppData = process.env.LOCALAPPDATA?.trim()
  let runToken =
    process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN?.trim() || ""

  delete process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN

  if (!localAppData || !runToken) {
    runToken = ""
    throw new Error("The Supabase development database owner is unavailable.")
  }

  const lockPath = resolve(
    localAppData,
    "LabibTech-Commerce-SaaS",
    "supabase-development",
    "supabase-development-run.lock",
  )
  let actualHash: Buffer | undefined
  let expectedHash: Buffer | undefined

  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
      pid?: number
      childPid?: number
      runTokenHash?: string
    }

    actualHash = createHash("sha256").update(runToken).digest()
    expectedHash = /^[a-f0-9]{64}$/.test(lock.runTokenHash || "")
      ? Buffer.from(lock.runTokenHash || "", "hex")
      : Buffer.alloc(0)

    if (
      lock.pid !== process.ppid ||
      lock.childPid !== process.pid ||
      !processIsAlive(Number(lock.pid)) ||
      expectedHash.length !== actualHash.length ||
      !timingSafeEqual(expectedHash, actualHash)
    ) {
      throw new Error("The Supabase development database owner is invalid.")
    }
  } catch {
    throw new Error("The Supabase development database owner is invalid.")
  } finally {
    runToken = ""
    actualHash?.fill(0)
    expectedHash?.fill(0)
  }
}

const readAndScrubBootstrapInput = () => {
  const input = {
    email: process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL?.trim() || "",
    password: process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD || "",
    firstName:
      process.env.PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME?.trim() || "Mohamed",
    lastName:
      process.env.PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME?.trim() || "Ellabib",
  }

  for (const key of BOOTSTRAP_ENVIRONMENT_KEYS) {
    delete process.env[key]
  }

  return input
}

export default async function ensureSupabaseDevelopmentPlatformAdmin({
  container,
}: ExecArgs) {
  const bootstrapInput = readAndScrubBootstrapInput()
  const email = bootstrapInput.email.toLowerCase()
  let password = bootstrapInput.password
  const firstName = bootstrapInput.firstName
  const lastName = bootstrapInput.lastName

  bootstrapInput.email = ""
  bootstrapInput.password = ""
  bootstrapInput.firstName = ""
  bootstrapInput.lastName = ""

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    firstName.length > 64 ||
    lastName.length > 64
  ) {
    password = ""
    throw new Error("The protected platform owner input is invalid.")
  }

  let authService: any
  let userService: any
  let link: any
  let newlyCreatedAuthIdentityId: string | undefined
  let newlyCreatedUserId: string | undefined
  let addedRoleUserId: string | undefined
  let addedAuthMetadataIdentityId: string | undefined

  try {
    assertSupabaseDevelopmentDatabase()

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    authService = container.resolve(Modules.AUTH) as any
    userService = container.resolve(Modules.USER) as any
    const rbacService = container.resolve(Modules.RBAC) as any
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
    link = container.resolve(ContainerRegistrationKeys.LINK) as any

    const superAdminRoles = await rbacService.listRbacRoles({
      id: SUPER_ADMIN_ROLE_ID,
    })

    if (superAdminRoles.length !== 1) {
      throw new Error("The Super Admin role is unavailable.")
    }

    const rolePolicies = await rbacService.listRbacRolePolicies({
      role_id: SUPER_ADMIN_ROLE_ID,
    })
    const policies = rolePolicies.length
      ? await rbacService.listRbacPolicies({
          id: rolePolicies.map((rolePolicy) => rolePolicy.policy_id),
        })
      : []
    const hasWildcardPolicy = policies.some(
      (policy) =>
        policy.key === "*:*" ||
        (policy.resource === "*" && policy.operation === "*"),
    )

    if (!hasWildcardPolicy) {
      throw new Error("The Super Admin wildcard policy is unavailable.")
    }

    const users = await userService.listUsers({ email })
    const authIdentities = await authService.listAuthIdentities(
      {
        provider_identities: {
          entity_id: email,
          provider: "emailpass",
        },
      },
      { relations: ["provider_identities"] },
    )

    if (users.length > 1 || authIdentities.length > 1) {
      throw new Error("Ambiguous platform owner identity.")
    }

    let user = users[0]
    let authIdentity = authIdentities[0]
    const linkedUserId = authIdentity?.app_metadata?.user_id
    const userWasExisting = Boolean(user)

    if (
      (linkedUserId && user && linkedUserId !== user.id) ||
      (linkedUserId && !user)
    ) {
      throw new Error("Conflicting platform owner identity.")
    }

    if (!authIdentity) {
      if (password.length < 10 || password.length > 128) {
        throw new Error("The protected platform owner input is incomplete.")
      }

      const registration = await authService.register("emailpass", {
        body: { email, password },
      })

      if (!registration.success || !registration.authIdentity) {
        throw new Error("Platform owner authentication could not be created.")
      }

      authIdentity = registration.authIdentity
      newlyCreatedAuthIdentityId = authIdentity.id
    } else {
      password = ""
    }

    if (!user) {
      const { result } = await createUserAccountWorkflow(container).run({
        input: {
          authIdentityId: authIdentity.id,
          userData: {
            email,
            first_name: firstName,
            last_name: lastName,
            roles: [SUPER_ADMIN_ROLE_ID],
          },
        },
      })
      user = result
      newlyCreatedUserId = user.id
      addedAuthMetadataIdentityId = authIdentity.id
    }

    const currentRoles = await query.graph({
      entity: "user",
      fields: ["id", "rbac_roles.id"],
      filters: { id: user.id },
    })

    if (currentRoles.data.length !== 1) {
      throw new Error("Ambiguous platform owner role assignment.")
    }

    const roleIds = (currentRoles.data[0]?.rbac_roles || []).map(
      (role) => role.id,
    )

    if (!roleIds.includes(SUPER_ADMIN_ROLE_ID)) {
      await link.create({
        [Modules.USER]: { user_id: user.id },
        [Modules.RBAC]: { rbac_role_id: SUPER_ADMIN_ROLE_ID },
      })
      addedRoleUserId = user.id
    }

    const verifiedRoles = await query.graph({
      entity: "user",
      fields: ["id", "rbac_roles.id"],
      filters: { id: user.id },
    })

    if (verifiedRoles.data.length !== 1) {
      throw new Error("Ambiguous platform owner role assignment.")
    }

    const verifiedRoleIds = (verifiedRoles.data[0]?.rbac_roles || []).map(
      (role) => role.id,
    )

    if (!verifiedRoleIds.includes(SUPER_ADMIN_ROLE_ID)) {
      throw new Error("The Super Admin role assignment could not be verified.")
    }

    if (userWasExisting) {
      if (!linkedUserId) {
        await setAuthAppMetadataWorkflow(container).run({
          input: {
            authIdentityId: authIdentity.id,
            actorType: "user",
            value: user.id,
          },
        })
        addedAuthMetadataIdentityId = authIdentity.id
      }

      user = await userService.updateUsers({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
      })
    }

    logger.info("Supabase development platform Super Admin is ready.")
  } catch {
    if (addedAuthMetadataIdentityId) {
      await setAuthAppMetadataWorkflow(container)
        .run({
          input: {
            authIdentityId: addedAuthMetadataIdentityId,
            actorType: "user",
            value: null,
          },
        })
        .catch(() => undefined)
    }

    const rollbackRoleUserId = addedRoleUserId || newlyCreatedUserId

    if (rollbackRoleUserId && link) {
      await link
        .dismiss({
          [Modules.USER]: { user_id: rollbackRoleUserId },
          [Modules.RBAC]: { rbac_role_id: SUPER_ADMIN_ROLE_ID },
        })
        .catch(() => undefined)
    }

    if (newlyCreatedUserId && userService) {
      await userService.deleteUsers([newlyCreatedUserId]).catch(() => undefined)
    }

    if (newlyCreatedAuthIdentityId && authService) {
      await authService
        .deleteAuthIdentities([newlyCreatedAuthIdentityId])
        .catch(() => undefined)
    }

    throw new Error("Supabase development platform Super Admin setup failed.")
  } finally {
    password = ""
  }
}
