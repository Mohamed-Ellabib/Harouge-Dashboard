import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { z } from "zod"
import { listStoreOrderLinks } from "./checkout-ownership-links"

const dbFor = (container: MedusaContainer): any => container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
const missing = () => new MedusaError(MedusaError.Types.NOT_FOUND, "Order status was not found.")
async function assertOwned(container: MedusaContainer, storeId: string, orderId: string) {
  const links = await listStoreOrderLinks(container, { order_id: orderId })
  if (links.length !== 1 || links[0].store_id !== storeId) throw missing()
}
export async function issueOrderTrackingGrant(container: MedusaContainer, storeId: string, orderId: string, snapshot: unknown) {
  await assertOwned(container, storeId, orderId)
  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 180 * 86_400_000)
  await dbFor(container)("store_order_tracking_grant").insert({ id: `stgrant_${randomUUID()}`, token_hash: createHash("sha256").update(token).digest("hex"),
    store_id: storeId, order_id: orderId, snapshot: JSON.stringify(snapshot), expires_at: expires })
  return { token, expires_at: expires.toISOString() }
}
export async function readTrackedOrder(container: MedusaContainer, storeId: string, token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw missing()
  const db = dbFor(container)
  const grant = await db("store_order_tracking_grant").where({ token_hash: createHash("sha256").update(token).digest("hex"), store_id: storeId })
    .whereNull("deleted_at").where("expires_at", ">", db.fn.now()).first()
  if (!grant) throw missing()
  await assertOwned(container, storeId, grant.order_id)
  const progress = await db("store_order_progress").where({ order_id: grant.order_id, store_id: storeId }).whereNull("deleted_at").first()
  return { ...grant.snapshot, progress: progress?.status ?? "confirmed", progress_revision: progress?.revision ?? 0,
    updated_at: progress?.updated_at ?? grant.created_at, created_at: grant.created_at }
}
const progressSchema = z.object({ revision: z.number().int().min(0), status: z.enum(["processing", "shipped", "delivered"]) }).strict()
export async function updateOrderProgress(container: MedusaContainer, storeId: string, orderId: string, actorId: string, body: unknown) {
  const parsed = progressSchema.safeParse(body)
  if (!parsed.success) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose a valid order progress and revision.")
  await assertOwned(container, storeId, orderId)
  return dbFor(container).transaction(async (tx: any) => {
    await tx.raw("select pg_advisory_xact_lock(hashtextextended(?, 0))", [`order-progress:${orderId}`])
    const row = await tx("store_order_progress").where({ order_id: orderId, store_id: storeId }).whereNull("deleted_at").forUpdate().first()
    const statuses = ["confirmed", "processing", "shipped", "delivered"]
    if ((row?.revision ?? 0) !== parsed.data.revision || statuses.indexOf(parsed.data.status) !== statuses.indexOf(row?.status ?? "confirmed") + 1) {
      throw new MedusaError(MedusaError.Types.CONFLICT, "Refresh this order before moving it to the next delivery step.")
    }
    const event = { status: parsed.data.status, at: new Date().toISOString(), actor_id: actorId }
    const changes = { status: parsed.data.status, revision: (row?.revision ?? 0) + 1, events: JSON.stringify([...(row?.events ?? []), event]), updated_at: tx.fn.now() }
    if (row) await tx("store_order_progress").where({ id: row.id }).update(changes)
    else await tx("store_order_progress").insert({ id: `stprogress_${randomUUID()}`, store_id: storeId, order_id: orderId, ...changes })
    return { status: changes.status, revision: changes.revision }
  })
}
