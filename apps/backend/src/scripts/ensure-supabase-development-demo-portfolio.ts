/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createHmac } from "node:crypto"

import {
  createPlatformMerchantMembership,
  updatePlatformMerchantMembership,
} from "../api/_utils/platform-merchant-memberships"
import { installPlatformStorefrontTemplateStarter } from "../api/_utils/platform-storefront-template-starter"
import { SAAS_MODULE } from "../modules/saas"
import {
  publishPlatformStorefront,
  readPlatformStorefront,
} from "../modules/saas/platform-storefront-document"
import { provisionSaasStoreWorkflow } from "../workflows/provision-saas-store"
import { executeStoreCommerceSetup } from "../workflows/setup-store-commerce"

const SUPABASE_DEVELOPMENT_GUARD = "validated-v1"
const FIXTURE_ACTOR = "platform-development-fixture"

type FixtureStore = {
  name: string
  handle: string
  ownerName: string
  ownerEmail: string
  plan: "starter_whatsapp" | "professional_commerce"
  reuseOwner?: boolean
  primaryColor: string
  secondaryColor: string
}

const fixtureStores: FixtureStore[] = [
  {
    name: "Al-Sanousi & Sons",
    handle: "dev-al-sanousi",
    ownerName: "Ahmed Sanousi",
    ownerEmail: "ahmed.sanousi@vendors.example.test",
    plan: "professional_commerce",
    primaryColor: "#063f2c",
    secondaryColor: "#d9a441",
  },
  {
    name: "HomeNest Libya",
    handle: "dev-homenest-libya",
    ownerName: "Sara Omar",
    ownerEmail: "sara.omar@vendors.example.test",
    plan: "professional_commerce",
    primaryColor: "#8a6848",
    secondaryColor: "#efe2d2",
  },
  {
    name: "Al-Fikr Market",
    handle: "dev-al-fikr-market",
    ownerName: "Khaled Ali",
    ownerEmail: "khaled.ali@vendors.example.test",
    plan: "starter_whatsapp",
    primaryColor: "#0b6d8b",
    secondaryColor: "#f0b429",
  },
  {
    name: "Noor Boutique",
    handle: "dev-noor-boutique",
    ownerName: "Mariam Salem",
    ownerEmail: "mariam.salem@vendors.example.test",
    plan: "starter_whatsapp",
    primaryColor: "#7950b8",
    secondaryColor: "#f0d8c2",
  },
  {
    name: "Tripoli Tech",
    handle: "dev-tripoli-tech",
    ownerName: "Omar Faraj",
    ownerEmail: "omar.faraj@vendors.example.test",
    plan: "professional_commerce",
    primaryColor: "#1759a8",
    secondaryColor: "#dbeafe",
  },
  {
    name: "Glow Beauty",
    handle: "dev-glow-beauty",
    ownerName: "Nour Alami",
    ownerEmail: "nour.alami@vendors.example.test",
    plan: "professional_commerce",
    primaryColor: "#d96856",
    secondaryColor: "#f4c9bd",
  },
  {
    name: "Sanousi Outlet",
    handle: "dev-sanousi-outlet",
    ownerName: "Ahmed Sanousi",
    ownerEmail: "ahmed.sanousi@vendors.example.test",
    plan: "starter_whatsapp",
    reuseOwner: true,
    primaryColor: "#0f766e",
    secondaryColor: "#ccfbf1",
  },
]

const assertGuardedSupabaseDevelopment = () => {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.LABIBTECH_SUPABASE_DEVELOPMENT_GUARD !==
      SUPABASE_DEVELOPMENT_GUARD ||
    !process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN ||
    process.env.LABIBTECH_LOCAL_DATABASE_GUARD ||
    process.env.LABIBTECH_DISPOSABLE_TEST_DATABASE_GUARD
  ) {
    throw new Error(
      "The guarded Supabase development runner is required for demo portfolio setup.",
    )
  }
}

const fixturePasswordSecret = (): string => {
  const activeKey =
    process.env.PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID?.trim() || ""
  let keyRing: unknown

  try {
    keyRing = JSON.parse(process.env.PROVISIONING_FINGERPRINT_KEYS || "")
  } catch {
    throw new Error("The provisioning fingerprint key-ring is unavailable.")
  }

  if (
    !activeKey ||
    !keyRing ||
    typeof keyRing !== "object" ||
    Array.isArray(keyRing) ||
    typeof (keyRing as Record<string, unknown>)[activeKey] !== "string"
  ) {
    throw new Error("The provisioning fingerprint key-ring is unavailable.")
  }

  return (keyRing as Record<string, string>)[activeKey]
}

const derivedTemporaryPassword = (secret: string, email: string): string =>
  `D${createHmac("sha256", secret)
    .update(`labibtech-development-vendor:${email}`)
    .digest("base64url")
    .slice(0, 30)}9a`

export default async function ensureSupabaseDevelopmentDemoPortfolio({
  container,
}: ExecArgs) {
  assertGuardedSupabaseDevelopment()

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const saas = container.resolve(SAAS_MODULE) as any
  let passwordSecret = fixturePasswordSecret()
  let created = 0
  let existing = 0

  try {
    for (const fixture of fixtureStores) {
      const profiles = await saas.listStoreProfiles({ handle: fixture.handle })

      const exactProfiles = profiles.filter(
        (profile: any) => profile.handle === fixture.handle,
      )

      if (exactProfiles.length > 1) {
        throw new Error("The development fixture Store identity is ambiguous.")
      }

      if (exactProfiles[0]?.status === "active") {
        existing += 1
        continue
      }

      let initialPassword = fixture.reuseOwner
        ? undefined
        : derivedTemporaryPassword(passwordSecret, fixture.ownerEmail)

      try {
        await provisionSaasStoreWorkflow(container).run({
          input: {
            idempotency_key: `labibtech-dev-fixture-v1-${fixture.handle}`,
            actor_id: FIXTURE_ACTOR,
            request: {
              tenant: {
                name: `${fixture.name} Development`,
                key: fixture.handle,
                reuse_existing: false,
              },
              store: {
                name: fixture.name,
                handle: fixture.handle,
                plan_code: fixture.plan,
                locale: "ar-LY",
                timezone: "Africa/Tripoli",
                currency_code: "lyd",
                status_after_provisioning: "active",
              },
              owner: {
                email: fixture.ownerEmail,
                display_name: fixture.ownerName,
                ...(initialPassword
                  ? { initial_password: initialPassword }
                  : {}),
                reuse_existing_account: Boolean(fixture.reuseOwner),
              },
              brand: {
                primary_color: fixture.primaryColor,
                secondary_color: fixture.secondaryColor,
              },
              commerce: {
                region_name: `${fixture.name} - Libya`,
                countries: ["ly"],
                stock_location_name: `${fixture.name} - Main stock`,
                sales_channel_name: `${fixture.name} - Main channel`,
              },
              contact: {
                public_email: fixture.ownerEmail,
              },
              domain: {},
            },
          },
        })
      } finally {
        initialPassword = undefined
      }

      created += 1
    }

    const allProfiles = await saas.listStoreProfiles({}, { take: 1_000 })
    const fixtureProfileByHandle = new Map<string, any>(
      allProfiles
        .filter((profile: any) =>
          fixtureStores.some((fixture) => fixture.handle === profile.handle),
        )
        .map((profile: any) => [profile.handle, profile]),
    )

    if (
      fixtureProfileByHandle.size !== fixtureStores.length ||
      fixtureStores.some(
        (fixture) =>
          fixtureProfileByHandle.get(fixture.handle)?.status !== "active",
      )
    ) {
      throw new Error("The development fixture Store graph is incomplete.")
    }

    const glowProfile = fixtureProfileByHandle.get("dev-glow-beauty")
    if (!glowProfile?.id) {
      throw new Error("The Glow Beauty development Store is unavailable.")
    }
    await executeStoreCommerceSetup(container, {
      idempotency_key: "labibtech-dev-fixture-v1-glow-beauty-commerce",
      actor_id: FIXTURE_ACTOR,
      store_profile_id: glowProfile.id,
      request: {
        shipping_option: {
          name: "Libya standard delivery",
          description: "Delivery price confirmed during checkout.",
          amount: 15,
        },
      },
    })
    const glowStorefront = await readPlatformStorefront(container, glowProfile.id)
    const installedGlowStorefront = await installPlatformStorefrontTemplateStarter(
      container,
      glowProfile.id,
      {
        template_key: "glow-beauty",
        revision: glowStorefront.storefront.revision,
      },
      FIXTURE_ACTOR,
    )
    await publishPlatformStorefront(
      container,
      glowProfile.id,
      { draft_revision: installedGlowStorefront.storefront.revision },
      FIXTURE_ACTOR,
    )

    const profileIds = Array.from(fixtureProfileByHandle.values()).map(
      (profile: any) => profile.id,
    )
    let memberships = await saas.listMerchantMemberships(
      { store_profile_id: profileIds },
      { take: 1_000 },
    )

    const sanousiProfile = fixtureProfileByHandle.get("dev-al-sanousi")
    const homeNestProfile = fixtureProfileByHandle.get("dev-homenest-libya")
    const sanousiOwner = memberships.find(
      (membership: any) =>
        membership.store_profile_id === sanousiProfile?.id &&
        membership.role === "owner",
    )

    if (!sanousiOwner || !homeNestProfile) {
      throw new Error("The development fixture shared access is unavailable.")
    }

    let sharedManager = memberships.find(
      (membership: any) =>
        membership.store_profile_id === homeNestProfile.id &&
        membership.merchant_account_reference ===
          sanousiOwner.merchant_account_reference,
    )

    if (!sharedManager) {
      const createdMembership = await createPlatformMerchantMembership(
        container,
        homeNestProfile.id,
        {
          email: "ahmed.sanousi@vendors.example.test",
          display_name: "Ahmed Sanousi",
          role: "manager",
          reuse_existing_account: true,
        },
        "labibtech-dev-fixture-v1-homenest-shared-manager",
      )
      sharedManager = createdMembership.membership
    }

    await updatePlatformMerchantMembership(container, sharedManager.id, {
      role: "manager",
      status: "disabled",
    })

    memberships = await saas.listMerchantMemberships(
      { store_profile_id: profileIds },
      { take: 1_000 },
    )
    const distinctAccounts = new Set(
      memberships.map(
        (membership: any) => membership.merchant_account_reference,
      ),
    )
    const verifiedSharedManager = memberships.find(
      (membership: any) => membership.id === sharedManager.id,
    )

    if (
      memberships.length < fixtureStores.length ||
      distinctAccounts.size < fixtureStores.length - 1 ||
      verifiedSharedManager?.role !== "manager" ||
      verifiedSharedManager?.status !== "disabled" ||
      profileIds.some(
        (profileId) =>
          !memberships.some(
            (membership: any) =>
              membership.store_profile_id === profileId &&
              membership.status === "active",
          ),
      )
    ) {
      throw new Error(
        "The development fixture merchant access graph is incomplete.",
      )
    }

    logger.info(
      `Supabase development demo portfolio is ready (${created} created, ${existing} already present, ${memberships.length} Store access records).`,
    )
  } finally {
    passwordSecret = ""
  }
}
