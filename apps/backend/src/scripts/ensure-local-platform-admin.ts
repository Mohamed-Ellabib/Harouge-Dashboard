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

const LOCAL_DATABASE_GUARD = "validated-v1"
const LOCAL_DATABASE_HOST = "127.0.0.1"
const LOCAL_DATABASE_PORT = "55433"
const LOCAL_DATABASE_NAME = "labibtech_commerce_local"
const SUPER_ADMIN_ROLE_ID = "role_super_admin"

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

const assertLocalDatabase = () => {
  if (process.env.LABIBTECH_LOCAL_DATABASE_GUARD !== LOCAL_DATABASE_GUARD) {
    throw new Error("The persistent local database guard is required.")
  }

  const databaseUrl = new URL(process.env.DATABASE_URL || "")

  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    databaseUrl.hostname !== LOCAL_DATABASE_HOST ||
    databaseUrl.port !== LOCAL_DATABASE_PORT ||
    databaseUrl.pathname !== `/${LOCAL_DATABASE_NAME}`
  ) {
    throw new Error("The persistent local database identity is invalid.")
  }

  if (process.env.MEDUSA_FF_RBAC !== "true") {
    throw new Error("RBAC must be enabled before creating a platform owner.")
  }

  const localAppData = process.env.LOCALAPPDATA?.trim()
  const runToken = process.env.LABIBTECH_LOCAL_RUN_TOKEN?.trim()

  if (!localAppData || !runToken) {
    throw new Error("The persistent local database owner is unavailable.")
  }

  const lockPath = resolve(
    localAppData,
    "LabibTech-Commerce-SaaS",
    "local-dev",
    "local-postgres-run.lock",
  )
  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
    pid?: number
    childPid?: number
    runTokenHash?: string
  }
  const actualHash = createHash("sha256").update(runToken).digest()
  const expectedHash = Buffer.from(lock.runTokenHash || "", "hex")

  if (
    lock.pid !== process.ppid ||
    !processIsAlive(Number(lock.pid)) ||
    expectedHash.length !== actualHash.length ||
    !timingSafeEqual(expectedHash, actualHash)
  ) {
    throw new Error("The persistent local database owner is invalid.")
  }

  delete process.env.LABIBTECH_LOCAL_RUN_TOKEN
}

const requiredBootstrapValue = (name: string): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error("The protected platform owner input is incomplete.")
  }

  return value
}

export default async function ensureLocalPlatformAdmin({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = requiredBootstrapValue(
    "PLATFORM_ADMIN_BOOTSTRAP_EMAIL",
  ).toLowerCase()
  let password = process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD?.trim() || ""
  const firstName =
    process.env.PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME?.trim() || "Mohamed"
  const lastName =
    process.env.PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME?.trim() || "Ellabib"

  delete process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL
  delete process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD
  delete process.env.PLATFORM_ADMIN_BOOTSTRAP_FIRST_NAME
  delete process.env.PLATFORM_ADMIN_BOOTSTRAP_LAST_NAME

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    (password.length > 0 && (password.length < 10 || password.length > 128)) ||
    firstName.length > 64 ||
    lastName.length > 64
  ) {
    password = ""
    throw new Error("The protected platform owner input is invalid.")
  }

  assertLocalDatabase()

  const authService = container.resolve(Modules.AUTH) as any
  const userService = container.resolve(Modules.USER) as any
  const rbacService = container.resolve(Modules.RBAC) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any

  let newlyCreatedAuthIdentityId: string | undefined
  let newlyCreatedUserId: string | undefined

  try {
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
      if (!password) {
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
    }

    const currentRoles = await query.graph({
      entity: "user",
      fields: ["id", "rbac_roles.id"],
      filters: { id: user.id },
    })
    const roleIds = (currentRoles.data[0]?.rbac_roles || []).map(
      (role) => role.id,
    )

    if (!roleIds.includes(SUPER_ADMIN_ROLE_ID)) {
      await link.create({
        [Modules.USER]: { user_id: user.id },
        [Modules.RBAC]: { rbac_role_id: SUPER_ADMIN_ROLE_ID },
      })
    }

    const verifiedRoles = await query.graph({
      entity: "user",
      fields: ["id", "rbac_roles.id"],
      filters: { id: user.id },
    })
    const verifiedRoleIds = (verifiedRoles.data[0]?.rbac_roles || []).map(
      (role) => role.id,
    )

    if (!verifiedRoleIds.includes(SUPER_ADMIN_ROLE_ID)) {
      throw new Error("The Super Admin role assignment could not be verified.")
    }

    if (userWasExisting) {
      user = await userService.updateUsers({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
      })

      if (!linkedUserId) {
        await setAuthAppMetadataWorkflow(container).run({
          input: {
            authIdentityId: authIdentity.id,
            actorType: "user",
            value: user.id,
          },
        })
      }
    }

    logger.info("Persistent local platform Super Admin is ready.")
  } catch {
    if (newlyCreatedUserId) {
      await link
        .dismiss({
          [Modules.USER]: { user_id: newlyCreatedUserId },
          [Modules.RBAC]: { rbac_role_id: SUPER_ADMIN_ROLE_ID },
        })
        .catch(() => undefined)
      await userService.deleteUsers([newlyCreatedUserId]).catch(() => undefined)
    }

    if (newlyCreatedAuthIdentityId) {
      await authService
        .deleteAuthIdentities([newlyCreatedAuthIdentityId])
        .catch(() => undefined)
    }

    throw new Error("Persistent local platform Super Admin setup failed.")
  } finally {
    password = ""
  }
}
