/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createCipheriv, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";

import {
  storeProductLinkDefinition,
  storeProfileStoreLinkDefinition,
} from "../api/_utils/legacy-vendor-compatibility";
import { vendorProductLinkDefinition } from "../api/_utils/vendors";
import { MARKETPLACE_MODULE } from "../modules/marketplace";
import type MarketplaceModuleService from "../modules/marketplace/service";
import { SAAS_MODULE } from "../modules/saas";
import type SaasModuleService from "../modules/saas/service";

const DISPOSABLE_DATABASE_NAME = "medusa_phase05_disposable";
const SMOKE_ACKNOWLEDGEMENT = "guarded-local-phase3a";
const SMOKE_DIRECTORY = resolve(tmpdir(), "medusa-phase3a-smoke");

const normalizedDatabaseIdentity = (value: string): string => {
  const url = new URL(value);
  url.searchParams.sort();
  return url.toString();
};

const guardedOutputPath = (): string => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const outputValue = process.env.PHASE3A_SMOKE_OUTPUT_FILE ?? "";

  let testDatabase: URL;
  let database: URL;

  try {
    testDatabase = new URL(testDatabaseUrl);
    database = new URL(databaseUrl);
  } catch {
    throw new Error(
      "The guarded Phase 3A smoke database configuration is invalid.",
    );
  }

  const localDatabase = ["127.0.0.1", "localhost", "::1"].includes(
    testDatabase.hostname,
  );

  if (
    process.env.NODE_ENV !== "test" ||
    process.env.TEST_DATABASE_DISPOSABLE !== DISPOSABLE_DATABASE_NAME ||
    process.env.TEST_DATABASE_GUARD_VALIDATED !== "true" ||
    process.env.PHASE3A_STOREFRONT_SMOKE !== SMOKE_ACKNOWLEDGEMENT ||
    !localDatabase ||
    testDatabase.pathname.slice(1) !== DISPOSABLE_DATABASE_NAME ||
    normalizedDatabaseIdentity(testDatabaseUrl) !==
      normalizedDatabaseIdentity(databaseUrl)
  ) {
    throw new Error(
      "The guarded Phase 3A smoke database boundary was not satisfied.",
    );
  }

  const outputPath = resolve(outputValue);
  const relativeOutput = relative(SMOKE_DIRECTORY, outputPath);

  if (
    !outputValue ||
    !relativeOutput ||
    relativeOutput.startsWith("..") ||
    isAbsolute(relativeOutput) ||
    extname(outputPath) !== ".json"
  ) {
    throw new Error("The Phase 3A smoke handoff path is invalid.");
  }

  return outputPath;
};

const guardedHandoffEncryptionKey = (): Buffer => {
  const encodedKey = process.env.PHASE3A_SMOKE_HANDOFF_KEY ?? "";
  const encryptionKey = Buffer.from(encodedKey, "base64");

  if (encryptionKey.length !== 32) {
    throw new Error("The Phase 3A smoke handoff key is invalid.");
  }

  return encryptionKey;
};

type SmokeStoreInput = {
  salesChannelId: string;
  legacyVendorId: string;
  medusaStoreId: string;
  shippingProfileId: string;
  products: Array<{
    title: string;
    subtitle: string;
    description: string;
    handle: string;
    imagePath: string;
  }>;
};

const createSmokeProducts = async (
  container: MedusaContainer,
  input: SmokeStoreInput,
): Promise<string[]> => {
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: input.products.map((product, index) => ({
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        handle: product.handle,
        status: "published",
        thumbnail: product.imagePath,
        images: [{ url: product.imagePath }],
        shipping_profile_id: input.shippingProfileId,
        sales_channels: [{ id: input.salesChannelId }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: product.title,
            manage_inventory: false,
            allow_backorder: true,
            options: { Default: "Default" },
            prices: [
              {
                amount: 12_500 + index * 2_500,
                currency_code: "lyd",
              },
            ],
          },
        ],
      })),
    } as any,
  });

  const link = container.resolve(ContainerRegistrationKeys.LINK) as any;

  await link.create(
    result.flatMap((product) => [
      storeProductLinkDefinition(input.medusaStoreId, product.id),
      vendorProductLinkDefinition(input.legacyVendorId, product.id),
    ]),
  );

  return result.map((product) => product.handle);
};

export default async function phase3aStorefrontSmokeSeed({
  container,
}: {
  container: MedusaContainer;
}) {
  const outputPath = guardedOutputPath();
  const { result: salesChannels } = await createSalesChannelsWorkflow(
    container,
  ).run({
    input: {
      salesChannelsData: [
        { name: "Phase 3A Browser Store A" },
        { name: "Phase 3A Browser Store B" },
      ],
    },
  });
  const [salesChannelA, salesChannelB] = salesChannels;

  const { result: apiKeys } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Phase 3A Browser Key A",
          type: "publishable",
          created_by: "",
        },
        {
          title: "Phase 3A Browser Key B",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });
  const [apiKeyA, apiKeyB] = apiKeys;

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKeyA.id, add: [salesChannelA.id] },
  });
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKeyB.id, add: [salesChannelB.id] },
  });

  const { result: shippingProfiles } = await createShippingProfilesWorkflow(
    container,
  ).run({
    input: {
      data: [{ name: "Phase 3A Browser Default", type: "default" }],
    },
  });
  const shippingProfile = shippingProfiles[0];
  const marketplace = container.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceModuleService;

  const vendorA = await marketplace.createVendors({
    name: "دار السكون",
    handle: "phase3a-browser-store-a",
    status: "active",
    contact_email: null,
    logo_url: null,
    primary_color: "#1257A6",
    metadata: null,
  } as any);
  const vendorB = await marketplace.createVendors({
    name: "بيت الحرفة",
    handle: "phase3a-browser-store-b",
    status: "active",
    contact_email: null,
    logo_url: null,
    primary_color: "#8A4B2D",
    metadata: null,
  } as any);

  await marketplace.createVendorDomains([
    { vendor_id: vendorA.id, domain: "127.0.0.1", is_primary: true },
    { vendor_id: vendorB.id, domain: "localhost", is_primary: true },
  ] as any);

  const saas = container.resolve(SAAS_MODULE) as SaasModuleService;
  const tenantA = await saas.createTenants({
    name: "Phase 3A Browser Tenant A",
    status: "active",
  } as any);
  const tenantB = await saas.createTenants({
    name: "Phase 3A Browser Tenant B",
    status: "active",
  } as any);
  const storeProfileA = await saas.createStoreProfiles({
    tenant_id: tenantA.id,
    legacy_vendor_id: vendorA.id,
    handle: vendorA.handle,
    status: "active",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    plan_code: "starter_whatsapp",
  } as any);
  const storeProfileB = await saas.createStoreProfiles({
    tenant_id: tenantB.id,
    legacy_vendor_id: vendorB.id,
    handle: vendorB.handle,
    status: "active",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    plan_code: "professional_commerce",
  } as any);

  const storeService = container.resolve(Modules.STORE) as any;
  const medusaStoreA = await storeService.createStores({
    name: vendorA.name,
    default_sales_channel_id: salesChannelA.id,
    supported_currencies: [{ currency_code: "lyd", is_default: true }],
  });
  const medusaStoreB = await storeService.createStores({
    name: vendorB.name,
    default_sales_channel_id: salesChannelB.id,
    supported_currencies: [{ currency_code: "lyd", is_default: true }],
  });

  const link = container.resolve(ContainerRegistrationKeys.LINK) as any;
  await link.create([
    storeProfileStoreLinkDefinition(storeProfileA.id, medusaStoreA.id),
    storeProfileStoreLinkDefinition(storeProfileB.id, medusaStoreB.id),
  ]);

  await saas.createStoreDomains([
    {
      store_profile_id: storeProfileA.id,
      normalized_hostname: "127.0.0.1",
      original_hostname: "127.0.0.1",
      type: "custom",
      verification_status: "verified",
      ssl_status: "active",
      is_primary: true,
    },
    {
      store_profile_id: storeProfileB.id,
      normalized_hostname: "localhost",
      original_hostname: "localhost",
      type: "custom",
      verification_status: "verified",
      ssl_status: "active",
      is_primary: true,
    },
  ] as any);
  await saas.createStoreBrands([
    {
      store_profile_id: storeProfileA.id,
      logo_url: null,
      primary_color: vendorA.primary_color,
    },
    {
      store_profile_id: storeProfileB.id,
      logo_url: null,
      primary_color: vendorB.primary_color,
    },
  ] as any);

  const storeAProducts = await createSmokeProducts(container, {
    salesChannelId: salesChannelA.id,
    legacyVendorId: vendorA.id,
    medusaStoreId: medusaStoreA.id,
    shippingProfileId: shippingProfile.id,
    products: [
      {
        title: "شمعة المساء",
        subtitle: "ضوء هادئ للحظات الدافئة",
        description: "شمعة مختارة بعناية لتضيف هدوءاً بسيطاً إلى مساحتك.",
        handle: "phase3a-store-a-evening-candle",
        imagePath: "/assets/preview/candle.png",
      },
      {
        title: "مزهرية السكون",
        subtitle: "خطوط ناعمة بلمسة طبيعية",
        description: "مزهرية سيراميك بتفاصيل هادئة تناسب المساحات اليومية.",
        handle: "phase3a-store-a-calm-vase",
        imagePath: "/assets/preview/vase.png",
      },
    ],
  });
  const storeBProducts = await createSmokeProducts(container, {
    salesChannelId: salesChannelB.id,
    legacyVendorId: vendorB.id,
    medusaStoreId: medusaStoreB.id,
    shippingProfileId: shippingProfile.id,
    products: [
      {
        title: "كوب الحرفة",
        subtitle: "قطعة يومية مصنوعة بروح دافئة",
        description: "كوب عملي بتفاصيل بسيطة للاستخدام اليومي.",
        handle: "phase3a-store-b-craft-mug",
        imagePath: "/assets/preview/mug.png",
      },
      {
        title: "وسادة الكتان",
        subtitle: "نسيج مريح بدرجة محايدة",
        description: "وسادة كتان تمنح المكان ملمساً هادئاً ومريحاً.",
        handle: "phase3a-store-b-linen-cushion",
        imagePath: "/assets/preview/cushion.png",
      },
    ],
  });

  if (
    typeof apiKeyA.token !== "string" ||
    !apiKeyA.token ||
    typeof apiKeyB.token !== "string" ||
    !apiKeyB.token
  ) {
    throw new Error("The Phase 3A smoke publishable keys were not generated.");
  }

  const encryptionKey = guardedHandoffEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const plaintext = Buffer.from(
    JSON.stringify({
      publishableKeyA: apiKeyA.token,
      publishableKeyB: apiKeyB.token,
      storeAProducts,
      storeBProducts,
    }),
    "utf8",
  );

  mkdirSync(dirname(outputPath), { recursive: true });

  try {
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    writeFileSync(
      outputPath,
      JSON.stringify({
        version: 1,
        algorithm: "aes-256-gcm",
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
      }),
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
  } finally {
    plaintext.fill(0);
    encryptionKey.fill(0);
  }
}
