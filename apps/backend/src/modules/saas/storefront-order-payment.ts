import {
  completeCartWorkflow,
  getOrdersListWorkflow,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import {
  assertPublicCartContext,
  getOrderIdForCart,
  resolveCartStoreContext,
  validateCartForCompletion,
} from "../../api/_utils/cart-store-context"
import { listStoreOrderLinks } from "../../api/_utils/checkout-ownership-links"
import { issueOrderTrackingGrant } from "../../api/_utils/store-order-progress"
import { isAllowedPublicImageUrl } from "./presentation-validation"
import type { PublicStoreContext } from "../../api/_utils/public-store-context"
import { assertStoreOnlineCheckoutReady } from "../../api/_utils/store-commerce-readiness"
import { bankTransferConfigurationSchema } from "./platform-storefront-document"

export const STOREFRONT_PAYMENT_METHODS = ["cod", "bank_transfer"] as const
export type StorefrontPaymentMethod = (typeof STOREFRONT_PAYMENT_METHODS)[number]

const completeBodySchema = z
  .object({ payment_method: z.enum(STOREFRONT_PAYMENT_METHODS) })
  .strict()

const ID = /^[A-Za-z0-9_-]{1,160}$/
const INLINE_CONTROL = /[\u0000-\u001f\u007f]/
const BODY_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const MARKUP = /[<>]/
const LOCK_PREFIX = "store-order-payment:"
const WORKFLOW_LOCK_PREFIX = "store-order-payment-workflow:"
const STOREFRONT_LOCK_PREFIX = "platform-storefront-document:"

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const conflict = (message: string) =>
  new MedusaError(MedusaError.Types.CONFLICT, message)

const notFound = () =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "Cart was not found.")

const unexpected = () =>
  new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "The order could not be confirmed safely.",
  )

const databaseFor = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

const withCompletionLock = async <T>(
  container: MedusaContainer,
  cartId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const database = databaseFor(container)
  const connection = await database.client.acquireConnection()
  let locked = false
  let reusable = true
  try {
    await database
      .raw("select pg_advisory_lock(hashtextextended(?, 0))", [
        `${WORKFLOW_LOCK_PREFIX}${cartId}`,
      ])
      .connection(connection)
    locked = true
    return await operation()
  } finally {
    if (locked) {
      try {
        const result = await database
          .raw(
            "select pg_advisory_unlock(hashtextextended(?, 0)) as unlocked",
            [`${WORKFLOW_LOCK_PREFIX}${cartId}`],
          )
          .connection(connection)
        reusable = result?.rows?.[0]?.unlocked === true
      } catch {
        reusable = false
      }
    }
    if (reusable) {
      await database.client.releaseConnection(connection)
    } else {
      await database.client.destroyConnection(connection)
    }
  }
}

const parseId = (value: unknown): string => {
  if (typeof value !== "string" || !ID.test(value)) throw notFound()
  return value
}

const parseMethod = (body: unknown): StorefrontPaymentMethod => {
  const result = completeBodySchema.safeParse(body)
  if (!result.success) {
    throw invalid("Choose cash on delivery or manual bank transfer.")
  }
  return result.data.payment_method
}

const isCompleteBank = (
  value: z.infer<typeof bankTransferConfigurationSchema>,
) =>
  Boolean(
    value.bank_name &&
      value.account_holder_name &&
      value.account_reference &&
      value.instructions.ar &&
      value.instructions.en,
  )

const parseBankRecord = (record: Record<string, any>) => {
  const result = bankTransferConfigurationSchema.safeParse({
    bank_name: record.bank_name ?? null,
    account_holder_name: record.account_holder_name ?? null,
    account_reference: record.account_reference ?? null,
    instructions: record.instructions,
  })
  return result.success && isCompleteBank(result.data) ? result.data : null
}

export const listAvailableStorefrontPaymentMethods = async (
  container: MedusaContainer,
  storeProfileId: string,
): Promise<StorefrontPaymentMethod[]> => {
  if (!ID.test(storeProfileId)) return ["cod"]
  try {
    const rows = await databaseFor(container)(
      "store_manual_bank_transfer_configuration",
    )
      .where({ store_profile_id: storeProfileId })
      .whereNull("deleted_at")
      .limit(2)
    return rows.length === 1 && parseBankRecord(rows[0])
      ? ["cod", "bank_transfer"]
      : ["cod"]
  } catch {
    return ["cod"]
  }
}

const validateStoredSelection = (
  row: Record<string, any>,
  context: PublicStoreContext,
  method: StorefrontPaymentMethod,
) => {
  if (
    row.store_profile_id !== context.storeProfileId ||
    row.medusa_store_id !== context.medusaStoreId
  ) {
    throw conflict("The Cart payment ownership is inconsistent.")
  }
  if (row.payment_method !== method) {
    throw conflict("The payment method for this Cart cannot be changed.")
  }
  if (method === "bank_transfer") {
    const parsed = bankTransferConfigurationSchema.safeParse({
      bank_name: row.bank_name,
      account_holder_name: row.account_holder_name,
      account_reference: row.account_reference,
      instructions: row.bank_instructions,
    })
    if (
      !parsed.success ||
      !isCompleteBank(parsed.data) ||
      !Number.isSafeInteger(Number(row.bank_configuration_revision)) ||
      Number(row.bank_configuration_revision) < 1
    ) {
      throw unexpected()
    }
  } else if (
    row.bank_name != null ||
    row.account_holder_name != null ||
    row.account_reference != null ||
    row.bank_instructions != null ||
    row.bank_configuration_revision != null
  ) {
    throw unexpected()
  }
  return row
}

const ensureSelection = async (
  container: MedusaContainer,
  context: PublicStoreContext,
  cartId: string,
  cartCompleted: boolean,
  method: StorefrontPaymentMethod,
) =>
  await databaseFor(container).transaction(async (transaction: any) => {
    await transaction.raw(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [`${LOCK_PREFIX}${cartId}`],
    )
    const existing = await transaction("store_order_payment")
      .where({ cart_id: cartId })
      .whereNull("deleted_at")
      .forUpdate()
    if (existing.length > 1) throw unexpected()
    if (existing.length === 1) {
      return validateStoredSelection(existing[0], context, method)
    }
    if (cartCompleted) {
      throw conflict(
        "This completed Cart has no recoverable payment selection.",
      )
    }

    let bank: ReturnType<typeof parseBankRecord> = null
    let bankRevision: number | null = null
    if (method === "bank_transfer") {
      await transaction.raw(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        [`${STOREFRONT_LOCK_PREFIX}${context.storeProfileId}`],
      )
      const rows = await transaction(
        "store_manual_bank_transfer_configuration",
      )
        .where({ store_profile_id: context.storeProfileId })
        .whereNull("deleted_at")
        .forUpdate()
      bank = rows.length === 1 ? parseBankRecord(rows[0]) : null
      bankRevision = rows.length === 1 ? Number(rows[0].revision) : null
      if (
        !bank ||
        !Number.isSafeInteger(bankRevision) ||
        Number(bankRevision) < 1
      ) {
        throw invalid(
          "Manual bank transfer is not configured for this Store.",
        )
      }
    }

    const now = new Date()
    const row = {
      id: generateEntityId(undefined, "stpay"),
      store_profile_id: context.storeProfileId,
      medusa_store_id: context.medusaStoreId,
      cart_id: cartId,
      order_id: null,
      payment_method: method,
      status: "pending",
      bank_name: bank?.bank_name ?? null,
      account_holder_name: bank?.account_holder_name ?? null,
      account_reference: bank?.account_reference ?? null,
      bank_instructions: bank?.instructions ?? null,
      bank_configuration_revision: bankRevision,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    await transaction("store_order_payment").insert(row)
    return row
  })

const finalizeSelection = async (
  container: MedusaContainer,
  context: PublicStoreContext,
  cartId: string,
  orderId: string,
  method: StorefrontPaymentMethod,
) =>
  await databaseFor(container).transaction(async (transaction: any) => {
    await transaction.raw(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [`${LOCK_PREFIX}${cartId}`],
    )
    const rows = await transaction("store_order_payment")
      .where({ cart_id: cartId })
      .whereNull("deleted_at")
      .forUpdate()
    if (rows.length !== 1) throw unexpected()
    const row = validateStoredSelection(rows[0], context, method)
    if (row.order_id && row.order_id !== orderId) {
      throw conflict("The Cart is already linked to another Order.")
    }
    if (row.status === "submitted" && row.order_id === orderId) return row
    if (row.status !== "pending" || row.order_id != null) throw unexpected()
    await transaction("store_order_payment").where({ id: row.id }).update({
      order_id: orderId,
      status: "submitted",
      updated_at: new Date(),
    })
    return { ...row, order_id: orderId, status: "submitted" }
  })

const safeAmount = (value: unknown): number => {
  const amount = Number(value)
  if (!Number.isSafeInteger(amount) || amount < 0) throw unexpected()
  return amount
}

const safeTitle = (value: unknown): string => {
  if (typeof value !== "string") throw unexpected()
  const title = value.trim()
  if (!title || title.length > 240 || INLINE_CONTROL.test(title)) {
    throw unexpected()
  }
  return title
}

const safeBody = (value: unknown): string => {
  if (typeof value !== "string") throw unexpected()
  const body = value.replace(/\r\n?/g, "\n").trim().normalize("NFC")
  if (
    !body ||
    body.length > 3000 ||
    BODY_CONTROL.test(body) ||
    MARKUP.test(body)
  ) {
    throw unexpected()
  }
  return body
}

const serializeConfirmationItem = (item: Record<string, any>) => {
  const quantity = safeAmount(item.quantity)
  const unitPrice = safeAmount(item.unit_price)
  if (quantity < 1) throw unexpected()
  const total =
    item.total == null ? safeAmount(quantity * unitPrice) : safeAmount(item.total)
  return {
    title: safeTitle(item.product_title ?? item.title),
    ...(typeof item.variant_title === "string" && item.variant_title.trim() ? { variant_title: safeTitle(item.variant_title) } : {}),
    ...(typeof item.thumbnail === "string" && isAllowedPublicImageUrl(item.thumbnail) ? { thumbnail_url: item.thumbnail } : {}),
    quantity,
    unit_price: unitPrice,
    total,
  }
}

const serializeConfirmation = async (
  container: MedusaContainer,
  context: PublicStoreContext,
  orderId: string,
  selection: Record<string, any>,
) => {
  const { result } = await getOrdersListWorkflow(container).run({
    input: {
      fields: [
        "id",
        "display_id",
        "currency_code",
        "item_subtotal",
        "shipping_total",
        "total",
        "*items",
      ],
      variables: {
        filters: { id: orderId, is_draft_order: false },
        skip: 0,
        take: 2,
      },
    },
  })
  const rows = Array.isArray(result) ? result : result.rows
  const order = rows.length === 1 ? rows[0] : null
  const items = Array.isArray(order?.items) ? order.items : []
  const currency = String(order?.currency_code ?? "").toLowerCase()
  const displayId: unknown = order?.display_id
  if (
    !order ||
    order.id !== orderId ||
    currency !== "lyd" ||
    items.length < 1 ||
    items.length > 100 ||
    !(
      (typeof displayId === "number" && Number.isSafeInteger(displayId)) ||
      (typeof displayId === "string" &&
        displayId.length > 0 &&
        displayId.length <= 80 &&
        !INLINE_CONTROL.test(displayId))
    )
  ) {
    throw unexpected()
  }
  const payment =
    selection.payment_method === "bank_transfer"
      ? {
          method: "bank_transfer" as const,
          status: "pending_verification" as const,
          bank_transfer: {
            bank_name: safeTitle(selection.bank_name),
            account_holder_name: safeTitle(selection.account_holder_name),
            account_reference: safeTitle(selection.account_reference),
            instructions: safeBody(
              context.profile.locale === "en-LY"
                ? selection.bank_instructions?.en
                : selection.bank_instructions?.ar,
            ),
          },
        }
      : {
          method: "cod" as const,
          status: "pending_fulfillment" as const,
        }
  return {
    type: "order" as const,
    order: {
      display_id: displayId,
      currency_code: currency,
      items: items.map(serializeConfirmationItem),
      item_subtotal: safeAmount(order.item_subtotal),
      shipping_total: safeAmount(order.shipping_total),
      total: safeAmount(order.total),
      payment,
    },
  }
}

export const completeStorefrontOrder = async (
  container: MedusaContainer,
  publicContext: PublicStoreContext,
  cartIdInput: unknown,
  body: unknown,
  actorIdInput?: unknown,
) => {
  const cartId = parseId(cartIdInput)
  const method = parseMethod(body)
  return await withCompletionLock(container, cartId, async () => {
    const cartContext = await resolveCartStoreContext(
      container,
      cartId,
      publicContext.publishableApiKeyId,
    )
    assertPublicCartContext(cartContext, publicContext)
    const actorId = typeof actorIdInput === "string" ? actorIdInput : null
    if (
      cartContext.cart.customer_id &&
      cartContext.cart.customer?.has_account &&
      actorId !== cartContext.cart.customer_id
    ) {
      throw notFound()
    }
    await assertStoreOnlineCheckoutReady(
      container,
      cartContext.storeProfileId,
      cartContext.medusaStoreId,
      { validateGraph: true },
    )
    await validateCartForCompletion(container, cartId)
    await ensureSelection(
      container,
      publicContext,
      cartId,
      cartContext.cartStatus === "completed",
      method,
    )

    const { result } = await completeCartWorkflow(container).run({
      input: { id: cartId },
    })
    const orderId = parseId(result?.id)
    const [cartOrderId, orderLinks] = await Promise.all([
      getOrderIdForCart(container, cartId),
      listStoreOrderLinks(container, { order_id: orderId }),
    ])
    if (
      cartOrderId !== orderId ||
      orderLinks.length !== 1 ||
      orderLinks[0].store_id !== publicContext.medusaStoreId
    ) {
      throw conflict("The completed Order ownership could not be verified.")
    }
    const selection = await finalizeSelection(
      container,
      publicContext,
      cartId,
      orderId,
      method,
    )
    const confirmation = await serializeConfirmation(
      container,
      publicContext,
      orderId,
      selection,
    )
    const tracking = await issueOrderTrackingGrant(container, publicContext.medusaStoreId, orderId, confirmation.order)
    return { ...confirmation, order: { ...confirmation.order, tracking } }
  })
}
