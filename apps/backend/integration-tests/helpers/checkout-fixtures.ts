import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit";
import {
  createSecurityFixtures,
  type SecurityFixtures,
} from "./security-fixtures";

const cookieFrom = (response: any): string =>
  response.headers["set-cookie"][0].split(";")[0];

export type CheckoutFixtures = SecurityFixtures & {
  regionA: Record<string, any>;
  regionB: Record<string, any>;
  customerA: Record<string, any>;
  customerB: Record<string, any>;
  productA: Record<string, any>;
  productB: Record<string, any>;
  variantA: Record<string, any>;
  variantB: Record<string, any>;
  shippingOptionA: Record<string, any>;
  shippingOptionB: Record<string, any>;
  merchantCookieA: string;
  merchantCookieB: string;
};

export const createCheckoutFixtures = async (
  container: MedusaContainer,
  api: any,
): Promise<CheckoutFixtures> => {
  vendorLoginRateLimiter.reset();
  const base = await createSecurityFixtures(container);
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Phase 2B Region A",
          currency_code: "lyd",
          countries: ["ly"],
          payment_providers: ["pp_system_default"],
        },
        {
          name: "Phase 2B Region B",
          currency_code: "lyd",
          countries: ["tn"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const [regionA, regionB] = regions;
  const customerService = container.resolve(Modules.CUSTOMER) as any;
  const [customerA, customerB] = await customerService.createCustomers([
    { email: "customer-a@example.test", has_account: true },
    { email: "customer-b@example.test", has_account: true },
  ]);
  const loginA = await api.post("/vendor/auth/login", {
    email: base.memberA.email,
    password: base.passwordA,
  });
  const loginB = await api.post("/vendor/auth/login", {
    email: base.memberB.email,
    password: base.passwordB,
  });
  const merchantCookieA = cookieFrom(loginA);
  const merchantCookieB = cookieFrom(loginB);
  const createProduct = async (
    cookie: string,
    title: string,
    handle: string,
    price: number,
  ) =>
    (
      await api.post(
        "/vendor/products",
        {
          title,
          handle,
          status: "published",
          price,
          currency_code: "lyd",
        },
        { headers: { Cookie: cookie } },
      )
    ).data.product;
  const productA = await createProduct(
    merchantCookieA,
    "Phase 2B Product A",
    "phase-2b-product-a",
    1500,
  );
  const productB = await createProduct(
    merchantCookieB,
    "Phase 2B Product B",
    "phase-2b-product-b",
    2200,
  );
  const variantA = productA.variants[0];
  const variantB = productB.variants[0];
  const { result: locations } = await createStockLocationsWorkflow(
    container,
  ).run({
    input: {
      locations: [
        {
          name: "Phase 2B Location A",
          address: {
            city: "Tripoli",
            country_code: "LY",
            address_1: "Test A",
          },
        },
        {
          name: "Phase 2B Location B",
          address: {
            city: "Tunis",
            country_code: "TN",
            address_1: "Test B",
          },
        },
      ],
    },
  });
  const [locationA, locationB] = locations;
  const fulfillment = container.resolve(Modules.FULFILLMENT) as any;
  const profiles = await fulfillment.listShippingProfiles({}, { take: 100 });
  const shippingProfile =
    profiles.find(
      (profile: any) => profile.id === productA.shipping_profile_id,
    ) ?? profiles[0];
  const fulfillmentSetA = await fulfillment.createFulfillmentSets({
    name: "Phase 2B Delivery A",
    type: "shipping",
    service_zones: [
      {
        name: "Phase 2B Zone A",
        geo_zones: [{ country_code: "ly", type: "country" }],
      },
    ],
  });
  const fulfillmentSetB = await fulfillment.createFulfillmentSets({
    name: "Phase 2B Delivery B",
    type: "shipping",
    service_zones: [
      {
        name: "Phase 2B Zone B",
        geo_zones: [{ country_code: "tn", type: "country" }],
      },
    ],
  });
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any;

  await link.create([
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: locationA.id },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    },
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: locationB.id },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    },
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: locationA.id },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSetA.id,
      },
    },
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: locationB.id },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSetB.id,
      },
    },
    {
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: base.salesChannelA.id,
      },
      [Modules.STOCK_LOCATION]: { stock_location_id: locationA.id },
    },
    {
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: base.salesChannelB.id,
      },
      [Modules.STOCK_LOCATION]: { stock_location_id: locationB.id },
    },
  ]);
  const { result: shippingOptions } = await createShippingOptionsWorkflow(
    container,
  ).run({
    input: [
      {
        name: "Phase 2B Shipping A",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSetA.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Store A",
          description: "Store A test shipping",
          code: "phase-2b-a",
        },
        prices: [
          { currency_code: "lyd", amount: 100 },
          { region_id: regionA.id, amount: 100 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Phase 2B Shipping B",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSetB.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Store B",
          description: "Store B test shipping",
          code: "phase-2b-b",
        },
        prices: [
          { currency_code: "lyd", amount: 120 },
          { region_id: regionB.id, amount: 120 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  const [shippingOptionA, shippingOptionB] = shippingOptions;
  const stores = container.resolve(Modules.STORE) as any;

  await stores.updateStores(base.medusaStoreA.id, {
    metadata: {
      saas_allowed_region_ids: [regionA.id],
      saas_allowed_shipping_option_ids: [shippingOptionA.id],
      saas_allowed_promotion_codes: [],
    },
  });
  await stores.updateStores(base.medusaStoreB.id, {
    metadata: {
      saas_allowed_region_ids: [regionB.id],
      saas_allowed_shipping_option_ids: [shippingOptionB.id],
      saas_allowed_promotion_codes: [],
    },
  });

  return {
    ...base,
    regionA,
    regionB,
    customerA,
    customerB,
    productA,
    productB,
    variantA,
    variantB,
    shippingOptionA,
    shippingOptionB,
    merchantCookieA,
    merchantCookieB,
  };
};
