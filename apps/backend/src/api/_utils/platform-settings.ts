import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

const PLATFORM_SETTINGS_SCOPE = "system"
const PLATFORM_SETTINGS_ID = "pltset_system"
const PLATFORM_SETTINGS_LOCK = "platform-settings:system"

export const platformSettingsSchema = z
  .object({
    platformName: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(120),
    logoUrl: z.string().trim().url().max(2048).nullable(),
    systemEmail: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
    supportEmail: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
    companyWebsite: z
      .string()
      .trim()
      .max(2048)
      .transform((value) =>
        /^https?:\/\//i.test(value) ? value : `https://${value}`,
      )
      .pipe(z.string().url())
      .refine((value) => new URL(value).protocol === "https:", {
        message: "The company website must use HTTPS.",
      }),
  })
  .strict()

export type PlatformSettings = z.infer<typeof platformSettingsSchema>

export const defaultPlatformSettings: PlatformSettings = Object.freeze({
  platformName: "LabibTech Commerce",
  companyName: "LabibTech",
  logoUrl: null,
  systemEmail: "system@labibtech.ly",
  supportEmail: "support@labibtech.ly",
  companyWebsite: "https://www.labibtech.ly",
})

export type PlatformSettingsRecord = {
  settings: PlatformSettings
  revision: number
  updated_at: string | null
  updated_by: string | null
}

const invalidSettings = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const parseSettings = (value: unknown): PlatformSettings => {
  const result = platformSettingsSchema.safeParse(value)
  if (!result.success) {
    throw invalidSettings(
      result.error.issues[0]?.message ?? "The platform settings are invalid.",
    )
  }
  return result.data
}

const normalizeRecord = (row: Record<string, any> | undefined): PlatformSettingsRecord => {
  if (!row) {
    return {
      settings: { ...defaultPlatformSettings },
      revision: 0,
      updated_at: null,
      updated_by: null,
    }
  }

  const saved = row.values && typeof row.values === "object" ? row.values : {}
  return {
    settings: parseSettings({
      platformName: saved.platformName ?? defaultPlatformSettings.platformName,
      companyName: saved.companyName ?? defaultPlatformSettings.companyName,
      logoUrl: saved.logoUrl ?? defaultPlatformSettings.logoUrl,
      systemEmail: saved.systemEmail ?? defaultPlatformSettings.systemEmail,
      supportEmail: saved.supportEmail ?? defaultPlatformSettings.supportEmail,
      companyWebsite: saved.companyWebsite ?? defaultPlatformSettings.companyWebsite,
    }),
    revision: Number(row.revision),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    updated_by:
      typeof row.updated_by === "string" && row.updated_by
        ? row.updated_by
        : null,
  }
}

export const readPlatformSettings = async (
  container: MedusaContainer,
): Promise<PlatformSettingsRecord> => {
  const database = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  const row = await database("platform_setting")
    .where({ scope: PLATFORM_SETTINGS_SCOPE })
    .whereNull("deleted_at")
    .first()
  return normalizeRecord(row)
}

export const updatePlatformSettings = async (
  container: MedusaContainer,
  input: { settings: unknown; revision: unknown; actorId: string },
): Promise<PlatformSettingsRecord> => {
  const settings = parseSettings(input.settings)
  const revisionResult = z.number().int().min(0).safeParse(input.revision)
  if (!revisionResult.success) {
    throw invalidSettings("A valid platform settings revision is required.")
  }
  const expectedRevision = revisionResult.data
  const database = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any

  return await database.transaction(async (transaction: any) => {
    await transaction.raw(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [PLATFORM_SETTINGS_LOCK],
    )
    const current = await transaction("platform_setting")
      .where({ scope: PLATFORM_SETTINGS_SCOPE })
      .whereNull("deleted_at")
      .forUpdate()
      .first()
    const currentRevision = current ? Number(current.revision) : 0

    if (currentRevision !== expectedRevision) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "Platform settings changed in another session. Reload and try again.",
      )
    }

    const now = new Date()
    const nextRevision = currentRevision + 1
    if (current) {
      await transaction("platform_setting")
        .where({ id: current.id })
        .update({
          values: JSON.stringify(settings),
          revision: nextRevision,
          updated_by: input.actorId,
          updated_at: now,
        })
    } else {
      await transaction("platform_setting").insert({
        id: PLATFORM_SETTINGS_ID,
        scope: PLATFORM_SETTINGS_SCOPE,
        values: JSON.stringify(settings),
        revision: nextRevision,
        updated_by: input.actorId,
        created_at: now,
        updated_at: now,
      })
    }

    return {
      settings,
      revision: nextRevision,
      updated_at: now.toISOString(),
      updated_by: input.actorId,
    }
  })
}
