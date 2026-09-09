import { createHmac } from "crypto";
import { isIP } from "net";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import {
  MAX_VENDOR_PASSWORD_LENGTH,
  normalizeVendorPassword,
} from "../api/_utils/vendor-auth";
import {
  normalizeDomain,
  normalizeEmail,
  normalizeHandle,
} from "../api/_utils/vendors";

export const PLAN_CODES = [
  "starter_whatsapp",
  "professional_commerce",
] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

const planEntitlements: Record<PlanCode, readonly string[]> = {
  starter_whatsapp: ["catalog", "merchant_orders", "whatsapp_contact"],
  professional_commerce: [
    "catalog",
    "merchant_orders",
    "cart_checkout",
    "customer_accounts",
  ],
};

export const entitlementsForPlan = (planCode: PlanCode): readonly string[] =>
  planEntitlements[planCode];

const timezoneIsValid = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

const localeIsValid = (value: string): boolean => {
  try {
    return Boolean(new Intl.Locale(value).baseName);
  } catch {
    return false;
  }
};

const supportedCurrencies = (): Set<string> =>
  new Set(
    (process.env.SAAS_SUPPORTED_CURRENCIES ?? "lyd,usd,eur")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

const isPublicAssetHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^[|]$/g, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return false;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (ipVersion === 6) {
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return true;
};
const publicHttpsUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      Boolean(url.hostname) &&
      isPublicAssetHostname(url.hostname)
    );
  }, "URL must be a public HTTPS URL without credentials.");

const optionalColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, "Color must be a six-digit hex value.")
  .optional();

const inputSchema = z
  .object({
    tenant: z
      .object({
        name: z.string().trim().min(2).max(120),
        key: z
          .string()
          .trim()
          .min(2)
          .max(80)
          .transform((value) => normalizeHandle(value))
          .refine(Boolean, "Tenant key is invalid."),
        reuse_existing: z.boolean().default(false),
      })
      .strict(),
    store: z
      .object({
        name: z.string().trim().min(2).max(120),
        handle: z
          .string()
          .trim()
          .min(2)
          .max(80)
          .transform((value) => normalizeHandle(value))
          .refine(
            (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
            "Store handle is invalid.",
          ),
        plan_code: z.enum(PLAN_CODES),
        locale: z
          .string()
          .trim()
          .max(35)
          .refine(localeIsValid, "Locale is invalid."),
        timezone: z
          .string()
          .trim()
          .max(100)
          .refine(timezoneIsValid, "Timezone is invalid."),
        currency_code: z
          .string()
          .trim()
          .length(3)
          .transform((value) => value.toLowerCase())
          .refine(
            (value) => supportedCurrencies().has(value),
            "Currency is not supported.",
          ),
        status_after_provisioning: z.literal("active").default("active"),
      })
      .strict(),
    owner: z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .max(320)
          .transform((value) => normalizeEmail(value)),
        display_name: z.string().trim().min(2).max(120).optional(),
        initial_password: z
          .string()
          .min(8)
          .max(MAX_VENDOR_PASSWORD_LENGTH)
          .optional(),
        reuse_existing_account: z.boolean().default(false),
      })
      .strict(),
    brand: z
      .object({
        logo_url: publicHttpsUrl.optional(),
        favicon_url: publicHttpsUrl.optional(),
        primary_color: optionalColor,
        secondary_color: optionalColor,
        typography_key: z
          .string()
          .trim()
          .regex(/^[a-z0-9][a-z0-9_-]{0,49}$/i)
          .optional(),
      })
      .strict()
      .default({}),
    commerce: z
      .object({
        region_name: z.string().trim().min(2).max(120),
        countries: z
          .array(
            z
              .string()
              .trim()
              .length(2)
              .transform((value) => value.toLowerCase()),
          )
          .min(1)
          .max(25),
        stock_location_name: z.string().trim().min(2).max(120),
        sales_channel_name: z.string().trim().min(2).max(120),
      })
      .strict(),
    contact: z
      .object({
        public_phone: z.string().trim().min(5).max(40).optional(),
        public_email: z
          .string()
          .trim()
          .email()
          .max(320)
          .transform((value) => normalizeEmail(value))
          .optional(),
        whatsapp_number: z.string().trim().min(5).max(40).optional(),
      })
      .strict()
      .default({}),
    domain: z
      .object({
        custom_hostname: z.string().trim().max(253).optional(),
      })
      .strict()
      .default({}),
  })
  .strict()
  .superRefine((input, context) => {
    const password = normalizeVendorPassword(input.owner.initial_password);

    if (!input.owner.reuse_existing_account && !password) {
      context.addIssue({
        code: "custom",
        path: ["owner", "initial_password"],
        message:
          "A valid initial password is required for a new owner account.",
      });
    }

    if (input.owner.reuse_existing_account && input.owner.initial_password) {
      context.addIssue({
        code: "custom",
        path: ["owner", "initial_password"],
        message: "Do not provide a password when reusing an owner account.",
      });
    }

    if (input.domain.custom_hostname) {
      const normalized = normalizeDomain(input.domain.custom_hostname);
      const valid =
        normalized === input.domain.custom_hostname.toLowerCase() &&
        normalized.length <= 253 &&
        /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
          normalized,
        );

      if (!valid) {
        context.addIssue({
          code: "custom",
          path: ["domain", "custom_hostname"],
          message:
            "Custom domain must be a valid hostname without a scheme or path.",
        });
      }
    }
  });

export type ProvisionStoreInput = z.infer<typeof inputSchema>;

export type ProvisioningWorkflowInput = {
  idempotency_key: string;
  actor_id: string;
  request: unknown;
  failure_step?: ProvisioningStep;
};

export type ProvisioningStep =
  | "tenant"
  | "medusa_store"
  | "store_profile"
  | "sales_channel"
  | "publishable_key"
  | "region"
  | "stock_location"
  | "brand"
  | "domain"
  | "merchant_account"
  | "membership"
  | "graph_validation";

export type SafeProvisioningResult = {
  provisioning_id: string;
  status: "completed";
  tenant_id: string;
  store_profile_id: string;
  medusa_store_id: string;
  sales_channel_id: string;
  publishable_api_key_id: string;
  region_id: string;
  stock_location_id: string;
  handle: string;
  public_domain: string;
  custom_domain: string | null;
  owner_email: string;
  plan_code: PlanCode;
  created_resources: Record<string, "created" | "reused">;
};

const invalidInput = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

export const normalizeIdempotencyKey = (value: unknown): string => {
  if (typeof value !== "string") {
    throw invalidInput("An idempotency key is required.");
  }

  const normalized = value.trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9._:-]{7,127}$/.test(normalized)) {
    throw invalidInput("The idempotency key is invalid.");
  }

  return normalized;
};

export const normalizeProvisionStoreInput = (
  value: unknown,
): ProvisionStoreInput => {
  const parsed = inputSchema.safeParse(value);

  if (!parsed.success) {
    throw invalidInput(
      parsed.error.issues[0]?.message ?? "Provisioning input is invalid.",
    );
  }

  return parsed.data;
};

export const temporaryDomainBase = (): string => {
  const configured = normalizeDomain(process.env.SAAS_TEMPORARY_DOMAIN_BASE);

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw invalidInput("SAAS_TEMPORARY_DOMAIN_BASE must be configured.");
  }

  return "local.test";
};

export const temporaryDomainForHandle = (handle: string): string =>
  normalizeDomain(`${handle}.${temporaryDomainBase()}`);

export const safeRequestSnapshot = (input: ProvisionStoreInput) => ({
  tenant: input.tenant,
  store: input.store,
  owner: {
    email: input.owner.email,
    display_name: input.owner.display_name ?? null,
    reuse_existing_account: input.owner.reuse_existing_account,
    initial_password_strategy: input.owner.reuse_existing_account
      ? "existing_account"
      : "administrator_generated_temporary_password",
    initial_password_provided: Boolean(input.owner.initial_password),
  },
  brand: input.brand,
  commerce: input.commerce,
  contact: input.contact,
  domain: input.domain,
});

type ProvisioningFingerprintKey = {
  id: string;
  secret: string;
  versioned: boolean;
};

const dedicatedFingerprintKeys = (): ProvisioningFingerprintKey[] | null => {
  const activeKeyId = process.env.PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID?.trim();
  const serializedKeys = process.env.PROVISIONING_FINGERPRINT_KEYS?.trim();

  if (!activeKeyId && !serializedKeys) {
    return null;
  }

  if (!activeKeyId || !serializedKeys) {
    throw invalidInput(
      "Provisioning fingerprint key configuration is incomplete.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedKeys);
  } catch {
    throw invalidInput("Provisioning fingerprint keys must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw invalidInput("Provisioning fingerprint keys must be a JSON object.");
  }

  const entries = Object.entries(parsed);
  if (entries.length < 1 || entries.length > 5) {
    throw invalidInput("Provisioning fingerprint key count is invalid.");
  }

  const keys = entries.map(([id, secret]) => {
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(id)) {
      throw invalidInput("Provisioning fingerprint key ID is invalid.");
    }

    if (typeof secret !== "string" || secret.length < 32) {
      throw invalidInput("Provisioning fingerprint key is invalid.");
    }

    return { id, secret, versioned: true };
  });
  const activeIndex = keys.findIndex((key) => key.id === activeKeyId);

  if (activeIndex < 0) {
    throw invalidInput(
      "The active provisioning fingerprint key is not in the key-ring.",
    );
  }

  return [keys[activeIndex], ...keys.filter((_, index) => index !== activeIndex)];
};

const provisioningFingerprintKeys = (): ProvisioningFingerprintKey[] => {
  const dedicatedKeys = dedicatedFingerprintKeys();
  if (dedicatedKeys) {
    return dedicatedKeys;
  }

  if (process.env.NODE_ENV === "production") {
    throw invalidInput(
      "Dedicated provisioning fingerprint keys must be configured in production.",
    );
  }

  const legacySecret =
    process.env.VENDOR_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET;

  if (!legacySecret) {
    throw invalidInput("A server secret is required for provisioning.");
  }

  return [
    { id: "legacy-session-secret", secret: legacySecret, versioned: false },
  ];
};

const hashProvisioningValue = (
  input: unknown,
  key: ProvisioningFingerprintKey,
): string =>
  createHmac("sha256", key.secret)
    .update(JSON.stringify(input))
    .digest("hex");

const storedProvisioningValueHash = (
  input: unknown,
  key: ProvisioningFingerprintKey,
): string => {
  const hash = hashProvisioningValue(input, key);

  return key.versioned ? `${key.id}:${hash}` : hash;
};

export const provisioningValueFingerprint = (input: unknown): string =>
  storedProvisioningValueHash(input, provisioningFingerprintKeys()[0]);

export const provisioningValueFingerprintMatches = (
  input: unknown,
  storedHash: string,
): boolean =>
  provisioningFingerprintKeys().some((key) => {
    const hash = hashProvisioningValue(input, key);

    return storedHash === hash || storedHash === `${key.id}:${hash}`;
  });

export const provisioningRequestHash = (input: ProvisionStoreInput): string =>
  provisioningValueFingerprint(input);

export const provisioningRequestHashMatches = (
  input: ProvisionStoreInput,
  storedHash: string,
): boolean => provisioningValueFingerprintMatches(input, storedHash);

export const safeProvisioningError = (
  error: unknown,
): { code: string; message: string } => {
  if (
    error instanceof MedusaError &&
    (error as MedusaError & { provisioning_safe?: boolean })
      .provisioning_safe === true
  ) {
    return {
      code: String(error.type ?? "provisioning_failed"),
      message: error.message.slice(0, 500),
    };
  }

  return {
    code: "provisioning_failed",
    message: "Provisioning failed at the recorded step.",
  };
};
