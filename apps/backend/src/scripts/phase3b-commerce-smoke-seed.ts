/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
import { createProductsWorkflow } from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createCipheriv, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";

import { storeProductLinkDefinition } from "../api/_utils/legacy-vendor-compatibility";
import { vendorProductLinkDefinition } from "../api/_utils/vendors";
import { MARKETPLACE_MODULE } from "../modules/marketplace";
import type MarketplaceModuleService from "../modules/marketplace/service";
import { SAAS_MODULE } from "../modules/saas";
import type SaasModuleService from "../modules/saas/service";
import { executeSaasStoreProvisioning } from "../workflows/provision-saas-store";
import { executeStoreCommerceSetup } from "../workflows/setup-store-commerce";

const DISPOSABLE_DATABASE_NAME = "medusa_phase05_disposable";
const SMOKE_ACKNOWLEDGEMENT = "guarded-local-phase3b";
const SMOKE_DIRECTORY = resolve(tmpdir(), "medusa-phase3b-smoke");

const normalizedDatabaseIdentity = (value: string): string => {
  const url = new URL(value);
  url.searchParams.sort();
  return url.toString();
};

const guardedOutputPath = (): string => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const outputValue = process.env.PHASE3B_SMOKE_OUTPUT_FILE ?? "";
  let testDatabase: URL;
  let database: URL;

  try {
    testDatabase = new URL(testDatabaseUrl);
    database = new URL(databaseUrl);
  } catch {
    throw new Error(
      "The guarded Phase 3B smoke database configuration is invalid.",
    );
  }

  if (
    process.env.NODE_ENV !== "test" ||
    process.env.TEST_DATABASE_DISPOSABLE !== DISPOSABLE_DATABASE_NAME ||
    process.env.TEST_DATABASE_GUARD_VALIDATED !== "true" ||
    process.env.PHASE3B_COMMERCE_SMOKE !== SMOKE_ACKNOWLEDGEMENT ||
    !["127.0.0.1", "localhost", "::1"].includes(testDatabase.hostname) ||
    testDatabase.pathname.slice(1) !== DISPOSABLE_DATABASE_NAME ||
    normalizedDatabaseIdentity(testDatabaseUrl) !==
      normalizedDatabaseIdentity(databaseUrl)
  ) {
    throw new Error(
      "The guarded Phase 3B smoke database boundary was not satisfied.",
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
    throw new Error("The Phase 3B smoke handoff path is invalid.");
  }

  return outputPath;
};

const guardedHandoffEncryptionKey = (): Buffer => {
  const encryptionKey = Buffer.from(
    process.env.PHASE3B_SMOKE_HANDOFF_KEY ?? "",
    "base64",
  );

  if (encryptionKey.length !== 32) {
    throw new Error("The Phase 3B smoke handoff key is invalid.");
  }

  return encryptionKey;
};

type PilotStore = {
  handle: string;
  medusaStoreId: string;
  salesChannelId: string;
  shippingProfileId: string;
  legacyVendorId: string;
  publishableKey: string;
  ownerEmail: string;
  ownerPassword: string;
};

const provisionPilotStore = async (
  container: MedusaContainer,
  input: {
    suffix: "a" | "b";
    hostname: "127.0.0.1" | "localhost";
    name: string;
    primaryColor: string;
    shippingAmount: number;
  },
): Promise<PilotStore> => {
  const runtimePassword = randomBytes(32).toString("base64url");
  const handle = `phase3b-pilot-store-${input.suffix}`;
  const ownerEmail = `owner-${input.suffix}@phase3b.example.test`;
  const provisioned = await executeSaasStoreProvisioning(container, {
    idempotency_key: `phase3b:provision:${input.suffix}`,
    actor_id: "guarded-phase3b-acceptance",
    request: {
      tenant: {
        name: `Phase 3B Pilot Tenant ${input.suffix.toUpperCase()}`,
        key: `phase3b-pilot-${input.suffix}`,
        reuse_existing: false,
      },
      store: {
        name: input.name,
        handle,
        plan_code: "professional_commerce",
        locale: "ar-LY",
        timezone: "Africa/Tripoli",
        currency_code: "lyd",
        status_after_provisioning: "active",
      },
      owner: {
        email: ownerEmail,
        display_name: `Synthetic owner ${input.suffix.toUpperCase()}`,
        initial_password: runtimePassword,
        reuse_existing_account: false,
      },
      brand: {
        primary_color: input.primaryColor,
        secondary_color: "#f4eee5",
        typography_key: "cairo",
      },
      commerce: {
        region_name: `Phase 3B Libya ${input.suffix.toUpperCase()}`,
        countries: ["ly"],
        stock_location_name: `Phase 3B Stock ${input.suffix.toUpperCase()}`,
        sales_channel_name: `Phase 3B Web ${input.suffix.toUpperCase()}`,
      },
      contact: {},
      domain: {},
    },
  });

  const commerce = await executeStoreCommerceSetup(container, {
    idempotency_key: `phase3b:commerce:${input.suffix}`,
    actor_id: "guarded-phase3b-acceptance",
    store_profile_id: provisioned.store_profile_id,
    request: {
      shipping_option: {
        name: "توصيل محلي قياسي",
        description: "توصيل محلي تجريبي داخل ليبيا.",
        amount: input.shippingAmount,
      },
    },
  });

  const saas = container.resolve(SAAS_MODULE) as SaasModuleService;
  const marketplace = container.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceModuleService;
  const profile = await saas.retrieveStoreProfile(provisioned.store_profile_id);

  if (!profile.legacy_vendor_id) {
    throw new Error("The Phase 3B legacy compatibility identity is missing.");
  }

  await saas.createStoreDomains({
    store_profile_id: provisioned.store_profile_id,
    normalized_hostname: input.hostname,
    original_hostname: input.hostname,
    type: "custom",
    verification_status: "verified",
    ssl_status: "active",
    is_primary: false,
  } as any);
  await marketplace.createVendorDomains({
    vendor_id: profile.legacy_vendor_id,
    domain: input.hostname,
    is_primary: false,
  } as any);

  const apiKeyService = container.resolve(Modules.API_KEY) as any;
  const apiKey = await apiKeyService.retrieveApiKey(
    provisioned.publishable_api_key_id,
  );

  if (typeof apiKey.token !== "string" || !apiKey.token) {
    throw new Error("The Phase 3B publishable key was not generated.");
  }

  return {
    handle,
    medusaStoreId: provisioned.medusa_store_id,
    salesChannelId: provisioned.sales_channel_id,
    shippingProfileId: commerce.shipping_profile_id,
    legacyVendorId: profile.legacy_vendor_id,
    publishableKey: apiKey.token,
    ownerEmail,
    ownerPassword: runtimePassword,
  };
};

const createPilotProducts = async (
  container: MedusaContainer,
  store: PilotStore,
  products: Array<{
    title: string;
    subtitle: string;
    description: string;
    handle: string;
    imagePath: string;
    amount: number;
  }>,
): Promise<string[]> => {
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: products.map((product) => ({
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        handle: product.handle,
        status: "published",
        thumbnail: product.imagePath,
        images: [{ url: product.imagePath }],
        shipping_profile_id: store.shippingProfileId,
        sales_channels: [{ id: store.salesChannelId }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: product.title,
            manage_inventory: false,
            allow_backorder: true,
            options: { Default: "Default" },
            prices: [{ amount: product.amount, currency_code: "lyd" }],
          },
        ],
      })),
    } as any,
  });
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any;

  await link.create(
    result.flatMap((product) => [
      storeProductLinkDefinition(store.medusaStoreId, product.id),
      vendorProductLinkDefinition(store.legacyVendorId, product.id),
    ]),
  );

  return result.map((product) => product.handle);
};

export default async function phase3bCommerceSmokeSeed({
  container,
}: {
  container: MedusaContainer;
}) {
  const outputPath = guardedOutputPath();
  const storeA = await provisionPilotStore(container, {
    suffix: "a",
    hostname: "127.0.0.1",
    name: "دار السكون",
    primaryColor: "#1257a6",
    shippingAmount: 15,
  });
  const storeB = await provisionPilotStore(container, {
    suffix: "b",
    hostname: "localhost",
    name: "بيت الحرفة",
    primaryColor: "#8a4b2d",
    shippingAmount: 25,
  });
  const storeAProducts = await createPilotProducts(container, storeA, [
    {
      title: "شمعة المساء",
      subtitle: "ضوء هادئ للحظات الدافئة",
      description: "شمعة مختارة بعناية لتضيف هدوءاً بسيطاً إلى مساحتك.",
      handle: "phase3b-store-a-evening-candle",
      imagePath: "/assets/preview/candle.png",
      amount: 125,
    },
    {
      title: "مزهرية السكون",
      subtitle: "خطوط ناعمة بلمسة طبيعية",
      description: "مزهرية سيراميك بتفاصيل هادئة تناسب المساحات اليومية.",
      handle: "phase3b-store-a-calm-vase",
      imagePath: "/assets/preview/vase.png",
      amount: 150,
    },
  ]);
  const storeBProducts = await createPilotProducts(container, storeB, [
    {
      title: "كوب الحرفة",
      subtitle: "قطعة يومية مصنوعة بروح دافئة",
      description: "كوب عملي بتفاصيل بسيطة للاستخدام اليومي.",
      handle: "phase3b-store-b-craft-mug",
      imagePath: "/assets/preview/mug.png",
      amount: 180,
    },
    {
      title: "وسادة الكتان",
      subtitle: "نسيج مريح بدرجة محايدة",
      description: "وسادة كتان تمنح المكان ملمساً هادئاً ومريحاً.",
      handle: "phase3b-store-b-linen-cushion",
      imagePath: "/assets/preview/cushion.png",
      amount: 220,
    },
  ]);
  const encryptionKey = guardedHandoffEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const plaintext = Buffer.from(
    JSON.stringify({
      publishableKeyA: storeA.publishableKey,
      publishableKeyB: storeB.publishableKey,
      merchantA: {
        email: storeA.ownerEmail,
        password: storeA.ownerPassword,
        handle: storeA.handle,
      },
      merchantB: {
        email: storeB.ownerEmail,
        password: storeB.ownerPassword,
        handle: storeB.handle,
      },
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
