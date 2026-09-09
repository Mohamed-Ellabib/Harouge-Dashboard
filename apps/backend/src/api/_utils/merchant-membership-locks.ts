import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const merchantMembershipIdempotencyLock = (keyHash: string) =>
  `0:platform-merchant-idempotency:${keyHash}`

export const merchantAccountMutationLock = (normalizedEmail: string) =>
  `1:platform-merchant-account:${normalizedEmail}`

export const merchantStoreMembershipMutationLock = (
  storeProfileId: string,
) => `2:platform-merchant-store:${storeProfileId}`

export const acquireMerchantMembershipMutationLocks = async (
  transaction: any,
  lockNames: string[],
) => {
  for (const lockName of [...new Set(lockNames)].sort()) {
    await transaction.raw(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [lockName],
    )
  }
}

export const withMerchantMembershipMutationLocks = async <T>(
  container: MedusaContainer,
  lockNames: string[],
  work: (transaction: any) => Promise<T>,
): Promise<T> => {
  const database = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any

  return await database.transaction(async (transaction: any) => {
    await acquireMerchantMembershipMutationLocks(transaction, lockNames)
    return await work(transaction)
  })
}
