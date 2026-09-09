import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { isAllowedPublicImageUrl } from "../../modules/saas/presentation-validation"

const STORE_CONFIGURATION_LOCK_PREFIX = "platform-store-configuration:"
const STORE_PROFILE_ID = /^[A-Za-z0-9_-]{1,128}$/
const INLINE_TEXT = /^[^\u0000-\u001f\u007f]+$/
const PHONE = /^[+0-9() .-]+$/
const HEX_COLOR = /^#[0-9a-f]{6}$/
const TYPOGRAPHY_KEY = /^[a-z0-9][a-z0-9_-]{0,49}$/i

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value

const nullableEmail = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .email("Enter a valid public email address.")
    .max(254)
    .transform((value) => value.toLowerCase())
    .nullable(),
)

const nullablePhone = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .min(5, "Phone numbers must contain at least 5 characters.")
    .max(40, "Phone numbers must contain at most 40 characters.")
    .regex(PHONE, "Phone numbers may contain digits, spaces, +, -, and parentheses only.")
    .nullable(),
)

const nullableColor = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .toLowerCase()
    .regex(HEX_COLOR, "Colors must use the six-digit #RRGGBB format.")
    .nullable(),
)

export const nullablePublicImageUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(2048)
    .refine(isAllowedPublicImageUrl, {
      message: "Use an uploaded image or a public HTTPS image URL.",
    })
    .nullable(),
)

export const platformStoreConfigurationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(INLINE_TEXT, "Store names must be a single line."),
    locale: z.enum(["ar-LY", "en-LY"]),
    contact: z
      .object({
        public_email: nullableEmail,
        public_phone: nullablePhone,
        whatsapp_number: nullablePhone,
      })
      .strict(),
    brand: z
      .object({
        logo_url: nullablePublicImageUrl,
        primary_color: nullableColor,
        secondary_color: nullableColor,
        typography_key: z.enum(["cairo"]).nullable(),
      })
      .strict(),
  })
  .strict()

const updateRequestSchema = z
  .object({
    configuration: platformStoreConfigurationSchema,
    revision: z.number().int().min(1),
  })
  .strict()

const merchantPresentationSchema = z
  .object({
    name: platformStoreConfigurationSchema.shape.name.optional(),
    public_contact_email: nullableEmail.optional(),
    logo_url: nullablePublicImageUrl.optional(),
    primary_color: nullableColor.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No supported Store presentation fields were provided.",
  })

export type PlatformStoreConfiguration = z.infer<
  typeof platformStoreConfigurationSchema
>

export type PlatformStoreConfigurationRecord = {
  configuration: {
    name: string
    locale: string
    contact: {
      public_email: string | null
      public_phone: string | null
      whatsapp_number: string | null
    }
    brand: {
      logo_url: string | null
      primary_color: string | null
      secondary_color: string | null
      typography_key: string | null
    }
  }
  revision: number
  updated_at: string | null
  updated_by: string | null
}

type LockedStoreGraph = {
  profile: Record<string, any>
  store: Record<string, any>
  vendor: Record<string, any>
  brand: Record<string, any> | null
}

const boundedStringOr = (
  value: unknown,
  fallback: string,
  maxLength: number,
) =>
  typeof value === "string" && value.trim() && value.length <= maxLength
    ? value.trim()
    : fallback

const nullableBoundedString = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.trim() && value.length <= maxLength
    ? value.trim()
    : null

const isoOrNull = (value: unknown) => {
  if (!value) {
    return null
  }
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const normalizeReadColor = (value: unknown) => {
  const normalized = nullableBoundedString(value, 7)?.toLowerCase() ?? null
  return normalized && HEX_COLOR.test(normalized) ? normalized : null
}

const normalizeReadLogo = (value: unknown) => {
  const normalized = nullableBoundedString(value, 2048)
  return normalized && isAllowedPublicImageUrl(normalized) ? normalized : null
}

const normalizeReadEmail = (value: unknown) => {
  const parsed = nullableEmail.safeParse(value ?? null)
  return parsed.success ? parsed.data : null
}

const normalizeReadPhone = (value: unknown) => {
  const parsed = nullablePhone.safeParse(value ?? null)
  return parsed.success ? parsed.data : null
}

const normalizeRecord = (
  graph: LockedStoreGraph,
): PlatformStoreConfigurationRecord => ({
  configuration: {
    name: boundedStringOr(graph.store.name, "Unnamed Store", 120),
    locale: boundedStringOr(graph.profile.locale, "ar-LY", 64),
    contact: {
      public_email: normalizeReadEmail(graph.profile.public_contact_email),
      public_phone: normalizeReadPhone(graph.profile.public_phone),
      whatsapp_number: normalizeReadPhone(graph.profile.whatsapp_number),
    },
    brand: {
      logo_url: normalizeReadLogo(graph.brand?.logo_url),
      primary_color: normalizeReadColor(graph.brand?.primary_color),
      secondary_color: normalizeReadColor(graph.brand?.secondary_color),
      typography_key:
        typeof graph.brand?.typography_key === "string" &&
        TYPOGRAPHY_KEY.test(graph.brand.typography_key)
          ? graph.brand.typography_key
          : null,
    },
  },
  revision: Number(graph.profile.configuration_revision ?? 1),
  updated_at: isoOrNull(graph.profile.configuration_updated_at),
  updated_by: nullableBoundedString(
    graph.profile.configuration_updated_by,
    255,
  ),
})

const validateStoreProfileId = (storeProfileId: string) => {
  if (!STORE_PROFILE_ID.test(storeProfileId)) {
    throw invalid("A valid Store profile is required.")
  }
}

const lockStoreGraph = async (
  transaction: any,
  storeProfileId: string,
): Promise<LockedStoreGraph> => {
  const profile = await transaction("store_profile")
    .where({ id: storeProfileId })
    .whereNull("deleted_at")
    .forUpdate()
    .first()
  if (!profile) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Store not found.")
  }

  const links = await transaction("store_profile_store")
    .where({ store_profile_id: storeProfileId })
    .whereNull("deleted_at")
    .forUpdate()
  if (links.length !== 1 || !links[0]?.store_id) {
    throw invalid("The Store has a missing or ambiguous commerce identity.")
  }
  const reverseLinks = await transaction("store_profile_store")
    .where({ store_id: links[0].store_id })
    .whereNull("deleted_at")
    .forUpdate()
  if (
    reverseLinks.length !== 1 ||
    reverseLinks[0]?.store_profile_id !== storeProfileId
  ) {
    throw invalid("The Store has a missing or ambiguous commerce identity.")
  }

  const store = await transaction("store")
    .where({ id: links[0].store_id })
    .whereNull("deleted_at")
    .forUpdate()
    .first()
  if (!store) {
    throw invalid("The Store commerce identity is unavailable.")
  }

  if (!profile.legacy_vendor_id) {
    throw invalid("The Store compatibility identity is unavailable.")
  }
  const vendor = await transaction("vendor")
    .where({ id: profile.legacy_vendor_id })
    .whereNull("deleted_at")
    .forUpdate()
    .first()
  if (!vendor) {
    throw invalid("The Store compatibility identity is unavailable.")
  }

  const brands = await transaction("store_brand")
    .where({ store_profile_id: storeProfileId })
    .whereNull("deleted_at")
    .forUpdate()
  if (brands.length > 1) {
    throw invalid("The Store has ambiguous brand configuration.")
  }

  return { profile, store, vendor, brand: brands[0] ?? null }
}

const withLockedStoreGraph = async <T>(
  container: MedusaContainer,
  storeProfileId: string,
  operation: (transaction: any, graph: LockedStoreGraph) => Promise<T>,
) => {
  validateStoreProfileId(storeProfileId)
  const database = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  try {
    return await database.transaction(async (transaction: any) => {
      await transaction.raw(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        [`${STORE_CONFIGURATION_LOCK_PREFIX}${storeProfileId}`],
      )
      const graph = await lockStoreGraph(transaction, storeProfileId)
      return await operation(transaction, graph)
    })
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error
    }
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The Store configuration could not be processed safely.",
    )
  }
}

export const readPlatformStoreConfiguration = async (
  container: MedusaContainer,
  storeProfileId: string,
) => {
  validateStoreProfileId(storeProfileId)
  const database = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  try {
    return await database.transaction(async (transaction: any) =>
      normalizeRecord(await lockStoreGraph(transaction, storeProfileId)),
    )
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error
    }
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The Store configuration could not be read safely.",
    )
  }
}

export const updatePlatformStoreConfiguration = async (
  container: MedusaContainer,
  storeProfileId: string,
  body: unknown,
  actorId: string,
) => {
  const parsed = updateRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw invalid(
      parsed.error.issues[0]?.message ?? "The Store configuration is invalid.",
    )
  }
  if (!actorId || actorId.length > 255) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "A verified platform administrator is required.",
    )
  }

  return await withLockedStoreGraph(
    container,
    storeProfileId,
    async (transaction, graph) => {
      const currentRevision = Number(graph.profile.configuration_revision ?? 1)
      if (currentRevision !== parsed.data.revision) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Store configuration changed in another session. Reload and try again.",
        )
      }

      const { configuration } = parsed.data
      const now = new Date()
      const nextRevision = currentRevision + 1

      await transaction("store").where({ id: graph.store.id }).update({
        name: configuration.name,
        updated_at: now,
      })
      await transaction("store_profile")
        .where({ id: graph.profile.id })
        .update({
          locale: configuration.locale,
          public_contact_email: configuration.contact.public_email,
          public_phone: configuration.contact.public_phone,
          whatsapp_number: configuration.contact.whatsapp_number,
          configuration_revision: nextRevision,
          configuration_updated_by: actorId,
          configuration_updated_at: now,
          updated_at: now,
        })

      if (graph.brand) {
        await transaction("store_brand")
          .where({ id: graph.brand.id })
          .update({
            logo_url: configuration.brand.logo_url,
            primary_color: configuration.brand.primary_color,
            secondary_color: configuration.brand.secondary_color,
            typography_key: configuration.brand.typography_key,
            updated_at: now,
          })
      } else {
        await transaction("store_brand").insert({
          id: generateEntityId(undefined, "stbrand"),
          store_profile_id: graph.profile.id,
          logo_url: configuration.brand.logo_url,
          favicon_url: null,
          primary_color: configuration.brand.primary_color,
          secondary_color: configuration.brand.secondary_color,
          typography_key: configuration.brand.typography_key,
          configuration: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
      }

      await transaction("vendor").where({ id: graph.vendor.id }).update({
        name: configuration.name,
        contact_email: configuration.contact.public_email,
        logo_url: configuration.brand.logo_url,
        primary_color: configuration.brand.primary_color,
        updated_at: now,
      })

      return {
        configuration,
        revision: nextRevision,
        updated_at: now.toISOString(),
        updated_by: actorId,
      } satisfies PlatformStoreConfigurationRecord
    },
  )
}

/**
 * Keeps the existing merchant-owned presentation subset atomic with the
 * platform editor. Every write shares the same lock and advances the same
 * revision, so a stale Super Admin form fails instead of overwriting it.
 */
export const updateMerchantStorePresentation = async (
  container: MedusaContainer,
  binding: {
    storeProfileId: string
    medusaStoreId: string
    vendorId: string
  },
  update: unknown,
  actorId: string,
) => {
  const parsed = merchantPresentationSchema.safeParse(update)
  if (!parsed.success) {
    throw invalid(
      parsed.error.issues[0]?.message ??
        "The Store presentation update is invalid.",
    )
  }
  if (!actorId || actorId.length > 255) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "A verified Store operator is required.",
    )
  }

  return await withLockedStoreGraph(
    container,
    binding.storeProfileId,
    async (transaction, graph) => {
      if (
        graph.store.id !== binding.medusaStoreId ||
        graph.vendor.id !== binding.vendorId
      ) {
        throw invalid("The Store presentation identity is inconsistent.")
      }

      const now = new Date()
      const nextRevision =
        Number(graph.profile.configuration_revision ?? 1) + 1
      const updateValue = parsed.data

      if (updateValue.name !== undefined) {
        await transaction("store").where({ id: graph.store.id }).update({
          name: updateValue.name,
          updated_at: now,
        })
      }

      await transaction("store_profile")
        .where({ id: graph.profile.id })
        .update({
          ...(updateValue.public_contact_email !== undefined
            ? { public_contact_email: updateValue.public_contact_email }
            : {}),
          configuration_revision: nextRevision,
          configuration_updated_by: actorId,
          configuration_updated_at: now,
          updated_at: now,
        })

      const brandChanged =
        updateValue.logo_url !== undefined ||
        updateValue.primary_color !== undefined
      if (brandChanged && graph.brand) {
        await transaction("store_brand")
          .where({ id: graph.brand.id })
          .update({
            ...(updateValue.logo_url !== undefined
              ? { logo_url: updateValue.logo_url }
              : {}),
            ...(updateValue.primary_color !== undefined
              ? { primary_color: updateValue.primary_color }
              : {}),
            updated_at: now,
          })
      } else if (brandChanged) {
        await transaction("store_brand").insert({
          id: generateEntityId(undefined, "stbrand"),
          store_profile_id: graph.profile.id,
          logo_url: updateValue.logo_url ?? null,
          favicon_url: null,
          primary_color: updateValue.primary_color ?? null,
          secondary_color: null,
          typography_key: null,
          configuration: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
      }

      await transaction("vendor").where({ id: graph.vendor.id }).update({
        ...(updateValue.name !== undefined ? { name: updateValue.name } : {}),
        ...(updateValue.public_contact_email !== undefined
          ? { contact_email: updateValue.public_contact_email }
          : {}),
        ...(updateValue.logo_url !== undefined
          ? { logo_url: updateValue.logo_url }
          : {}),
        ...(updateValue.primary_color !== undefined
          ? { primary_color: updateValue.primary_color }
          : {}),
        updated_at: now,
      })
    },
  )
}
