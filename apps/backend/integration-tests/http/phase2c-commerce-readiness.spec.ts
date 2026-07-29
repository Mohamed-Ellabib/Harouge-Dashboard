import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  ContainerRegistrationKeys,
  LINKS,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

import { POST as commerceSetupApi } from "../../src/api/admin/saas/stores/[store_profile_id]/commerce-setup/route";
import { GET as commerceReadinessApi } from "../../src/api/admin/saas/stores/[store_profile_id]/commerce-readiness/route";
import { GET as commerceSetupStatusApi } from "../../src/api/admin/saas/commerce-setup/[id]/route";
import { listStoreOrderLinks } from "../../src/api/_utils/checkout-ownership-links";
import { platformProvisioningRateLimiter } from "../../src/api/_utils/platform-provisioning-rate-limit";
import { assertStoreOnlineCheckoutReady } from "../../src/api/_utils/store-commerce-readiness";
import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit";
import { SAAS_MODULE } from "../../src/modules/saas";
import {
  commerceFulfillmentSetName,
  commerceServiceZoneName,
  type CommerceSetupStep,
} from "../../src/workflows/commerce-readiness-contract";
import {
  hasExactCommerceShippingOptionPrices,
  hasExactCommerceShippingOptionRules,
  resolveCommercePrerequisites,
  resolveCommerceSetupPinnedPolicy,
} from "../../src/workflows/commerce-readiness-resources";
import { createOrResolveCommerceSetupRecord } from "../../src/workflows/commerce-readiness-state";
import { executeSaasStoreProvisioning } from "../../src/workflows/provision-saas-store";
import { executeStoreCommerceSetup } from "../../src/workflows/setup-store-commerce";
import {
  provisioningPassword,
  provisioningRequest,
} from "../helpers/provisioning-fixtures";

jest.setTimeout(240_000);

const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
  SAAS_SUPPORTED_CURRENCIES: "lyd,usd,eur",
  STORE_CORS: "http://127.0.0.1:8000",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5173",
};

let sequence = 0;
const unique = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${sequence}`;
};

const setupRequest = (amount = 500) => ({
  shipping_option: {
    name: "LabibTech standard delivery",
    description: "Gate-closure delivery option.",
    amount,
  },
});

const cookieFrom = (response: any): string =>
  response.headers["set-cookie"][0].split(";")[0];

const responseRecorder = () => {
  const state: Record<string, any> = { statusCode: 200, body: null };

  return {
    state,
    response: {
      status(code: number) {
        state.statusCode = code;
        return this;
      },
      json(body: unknown) {
        state.body = body;
        return this;
      },
      setHeader() {
        return this;
      },
    },
  };
};

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    const provision = async (
      suffix: string,
      planCode:
        "starter_whatsapp" | "professional_commerce" = "professional_commerce",
    ) =>
      await executeSaasStoreProvisioning(getContainer(), {
        idempotency_key: `provision:${suffix}`,
        actor_id: "platform-admin-readiness-test",
        request: provisioningRequest({ suffix, planCode }),
      });

    const setup = async (
      storeProfileId: string,
      key: string,
      amount = 500,
      failureStep?: CommerceSetupStep,
    ) =>
      await executeStoreCommerceSetup(getContainer(), {
        idempotency_key: key,
        actor_id: "platform-admin-readiness-test",
        store_profile_id: storeProfileId,
        request: setupRequest(amount),
        ...(failureStep ? { failure_step: failureStep } : {}),
      });

    beforeEach(() => {
      vendorLoginRateLimiter.reset();
      platformProvisioningRateLimiter.reset();
    });

    it("keeps Starter checkout disabled and Professional checkout pending", async () => {
      const starter = await provision(
        unique("readiness-starter"),
        "starter_whatsapp",
      );
      const professional = await provision(
        unique("readiness-professional"),
        "professional_commerce",
      );
      const saas = getContainer().resolve(SAAS_MODULE) as any;
      const [starterReadiness] = await saas.listStoreCommerceReadinesses({
        store_profile_id: starter.store_profile_id,
      });
      const [professionalReadiness] = await saas.listStoreCommerceReadinesses({
        store_profile_id: professional.store_profile_id,
      });
      const keyService = getContainer().resolve(Modules.API_KEY) as any;
      const [starterKey, professionalKey] = await Promise.all([
        keyService.retrieveApiKey(starter.publishable_api_key_id),
        keyService.retrieveApiKey(professional.publishable_api_key_id),
      ]);

      expect(starterReadiness.status).toBe("not_required");
      expect(professionalReadiness.status).toBe("pending");
      await expect(
        api.post(
          "/store/carts",
          { region_id: starter.region_id },
          {
            headers: {
              Host: starter.public_domain,
              "x-publishable-api-key": starterKey.token,
            },
          },
        ),
      ).rejects.toMatchObject({ response: { status: 400 } });
      await expect(
        api.post(
          "/store/carts",
          { region_id: professional.region_id },
          {
            headers: {
              Host: professional.public_domain,
              "x-publishable-api-key": professionalKey.token,
            },
          },
        ),
      ).rejects.toMatchObject({ response: { status: 400 } });
      await expect(
        setup(starter.store_profile_id, `commerce:${starter.handle}`),
      ).rejects.toThrow(/not included/i);
    });

    it("creates one durable shipping graph and safely replays the same setup", async () => {
      const provisioned = await provision(unique("readiness-graph"));
      const key = `commerce:${provisioned.handle}`;
      const first = await setup(provisioned.store_profile_id, key, 750);
      const replay = await setup(provisioned.store_profile_id, key, 750);
      const container = getContainer();
      const saas = container.resolve(SAAS_MODULE) as any;
      const fulfillment = container.resolve(Modules.FULFILLMENT) as any;
      const storeService = container.resolve(Modules.STORE) as any;
      const [readiness] = await saas.listStoreCommerceReadinesses({
        store_profile_id: provisioned.store_profile_id,
      });
      const records = await saas.listStoreCommerceSetups({
        idempotency_key: key,
      });
      const events = await saas.listStoreCommerceSetupEvents({
        setup_id: first.setup_id,
      });
      const set = await fulfillment.retrieveFulfillmentSet(
        first.fulfillment_set_id,
        { relations: ["service_zones", "service_zones.geo_zones"] },
      );
      const option = await fulfillment.retrieveShippingOption(
        first.shipping_option_ids[0],
      );
      const store = await storeService.retrieveStore(first.medusa_store_id);

      expect(replay).toEqual(first);
      expect(records).toHaveLength(1);
      expect(records[0].request_snapshot.pinned_policy).toEqual({
        version: 1,
        provisioning_id: provisioned.provisioning_id,
        tenant_id: provisioned.tenant_id,
        store_profile_id: provisioned.store_profile_id,
        medusa_store_id: provisioned.medusa_store_id,
        plan_code: "professional_commerce",
        region_id: provisioned.region_id,
        stock_location_id: provisioned.stock_location_id,
        sales_channel_id: provisioned.sales_channel_id,
        currency_code: "lyd",
        countries: ["ly"],
        fulfillment_provider_id: "manual_manual",
        payment_provider_id: "pp_system_default",
      });
      expect(readiness).toMatchObject({
        status: "ready",
        medusa_store_id: first.medusa_store_id,
        region_id: first.region_id,
        stock_location_id: first.stock_location_id,
        fulfillment_set_id: first.fulfillment_set_id,
        service_zone_id: first.service_zone_id,
        shipping_option_ids: first.shipping_option_ids,
      });
      expect(set.service_zones).toHaveLength(1);
      expect(set.name).toBe(
        commerceFulfillmentSetName(provisioned.store_profile_id),
      );
      expect(set.service_zones[0].name).toBe(
        commerceServiceZoneName(provisioned.store_profile_id),
      );
      expect(set.service_zones[0].geo_zones).toEqual([
        expect.objectContaining({ type: "country", country_code: "ly" }),
      ]);
      expect(option.provider_id).toBe("manual_manual");
      expect(store.metadata.saas_allowed_shipping_option_ids).toEqual(
        first.shipping_option_ids,
      );
      expect(
        events.some((event: any) => event.event_type === "completed"),
      ).toBe(true);
      expect(JSON.stringify(records[0])).not.toContain("password");
      expect(JSON.stringify(first)).not.toContain("token");

      await expect(
        setup(provisioned.store_profile_id, key, 751),
      ).rejects.toThrow(/different commerce setup input/i);
      await expect(
        setup(provisioned.store_profile_id, `${key}:replacement`, 750),
      ).rejects.toThrow(/already complete/i);
    });

    it("converges concurrent replays and resumes a retained shipping option", async () => {
      const concurrentStore = await provision(unique("readiness-concurrent"));
      const concurrentKey = `commerce:${concurrentStore.handle}`;
      const [first, second] = await Promise.all([
        setup(concurrentStore.store_profile_id, concurrentKey, 900),
        setup(concurrentStore.store_profile_id, concurrentKey, 900),
      ]);

      expect(first).toEqual(second);

      const retryStore = await provision(unique("readiness-retry"));
      const retryKey = `commerce:${retryStore.handle}`;
      await expect(
        setup(retryStore.store_profile_id, retryKey, 600, "shipping_option"),
      ).rejects.toThrow(/injected commerce setup failure/i);

      const saas = getContainer().resolve(SAAS_MODULE) as any;
      const [failed] = await saas.listStoreCommerceSetups({
        idempotency_key: retryKey,
      });
      const failedOptionId = failed.resource_state.shipping_option.id;
      const completed = await setup(retryStore.store_profile_id, retryKey, 600);
      const retried = await saas.retrieveStoreCommerceSetup(failed.id);

      expect(completed.shipping_option_ids).toEqual([failedOptionId]);
      expect(retried.status).toBe("completed");
      expect(retried.retry_count).toBe(1);
    });

    it("retains an expired lease and requires operator attention before replay", async () => {
      const provisioned = await provision(unique("readiness-expired-lease"));
      const key = `commerce:${provisioned.handle}`;
      const container = getContainer();
      const prerequisites = await resolveCommercePrerequisites(
        container,
        provisioned.store_profile_id,
      );
      const input = {
        idempotency_key: key,
        actor_id: "platform-admin-readiness-test",
        store_profile_id: provisioned.store_profile_id,
        request: setupRequest(625),
        pinned_policy: await resolveCommerceSetupPinnedPolicy(
          container,
          prerequisites,
        ),
      };
      const saas = container.resolve(SAAS_MODULE) as any;
      const { record } = await createOrResolveCommerceSetupRecord(
        container,
        input,
      );

      await saas.updateStoreCommerceSetups({
        id: record.id,
        status: "running",
      });
      const lease = await saas.createStoreCommerceSetupLeases({
        lease_key: `store:${provisioned.store_profile_id}`,
        setup_id: record.id,
        lease_token: "expired-owner-test-token",
        expires_at: new Date(Date.now() - 60_000),
      });

      await expect(
        executeStoreCommerceSetup(container, input),
      ).rejects.toMatchObject({
        type: MedusaError.Types.CONFLICT,
        message: expect.stringMatching(/requires operator attention/i),
      });

      const attention = await saas.retrieveStoreCommerceSetup(record.id);
      const [readiness] = await saas.listStoreCommerceReadinesses({
        store_profile_id: provisioned.store_profile_id,
      });
      const leases = await saas.listStoreCommerceSetupLeases({
        lease_key: `store:${provisioned.store_profile_id}`,
      });
      const eventsBeforeReplay = await saas.listStoreCommerceSetupEvents({
        setup_id: record.id,
      });

      expect(attention).toMatchObject({
        status: "requires_attention",
        failure_code: "commerce_setup_lease_expired",
        retry_count: 0,
        resource_state: {},
      });
      expect(readiness).toMatchObject({
        status: "requires_attention",
        last_setup_id: record.id,
        failure_code: "commerce_setup_lease_expired",
      });
      expect(leases).toHaveLength(1);
      expect(leases[0].id).toBe(lease.id);
      expect(
        eventsBeforeReplay.filter(
          (event: any) => event.event_type === "requires_attention",
        ),
      ).toHaveLength(1);

      await expect(
        executeStoreCommerceSetup(container, input),
      ).rejects.toMatchObject({
        type: MedusaError.Types.CONFLICT,
        message: expect.stringMatching(/requires operator attention/i),
      });

      const afterReplay = await saas.retrieveStoreCommerceSetup(record.id);
      const eventsAfterReplay = await saas.listStoreCommerceSetupEvents({
        setup_id: record.id,
      });
      expect(afterReplay.retry_count).toBe(0);
      expect(afterReplay.resource_state).toEqual({});
      expect(eventsAfterReplay).toHaveLength(eventsBeforeReplay.length);
      expect(
        await saas.listStoreCommerceSetupLeases({
          lease_key: `store:${provisioned.store_profile_id}`,
        }),
      ).toHaveLength(1);
    });

    it("preserves a concurrent renewal and completion after a stale expiry observation", async () => {
      const provisioned = await provision(unique("readiness-stale-expiry"));
      const key = `commerce:${provisioned.handle}`;
      const completedResult = await setup(
        provisioned.store_profile_id,
        key,
        628,
      );
      const container = getContainer();
      const saas = container.resolve(SAAS_MODULE) as any;
      const [record] = await saas.listStoreCommerceSetups({
        idempotency_key: key,
      });
      const eventsBefore = await saas.listStoreCommerceSetupEvents({
        setup_id: record.id,
      });

      await saas.updateStoreCommerceSetups({
        id: record.id,
        status: "running",
        completed_at: null,
      });
      const lease = await saas.createStoreCommerceSetupLeases({
        lease_key: `store:${provisioned.store_profile_id}`,
        setup_id: record.id,
        lease_token: "renewed-owner-test-token",
        expires_at: new Date(Date.now() - 60_000),
      });
      const originalListLeases = saas.listStoreCommerceSetupLeases;
      let completedDuringObservation = false;

      saas.listStoreCommerceSetupLeases = async (...args: any[]) => {
        const leases = await originalListLeases.apply(saas, args);

        if (
          !completedDuringObservation &&
          args[0]?.lease_key === `store:${provisioned.store_profile_id}` &&
          leases.some((entry: any) => entry.id === lease.id)
        ) {
          completedDuringObservation = true;
          const staleObservation = leases.map((entry: any) => ({ ...entry }));

          await saas.updateStoreCommerceSetupLeases({
            id: lease.id,
            expires_at: new Date(Date.now() + 5 * 60_000),
          });
          await saas.updateStoreCommerceSetups({
            id: record.id,
            status: "completed",
            completed_at: new Date(),
          });
          return staleObservation;
        }

        return leases;
      };

      let replay: Record<string, any>;

      try {
        replay = await setup(provisioned.store_profile_id, key, 628);
      } finally {
        saas.listStoreCommerceSetupLeases = originalListLeases;
      }

      const current = await saas.retrieveStoreCommerceSetup(record.id);
      const [readiness] = await saas.listStoreCommerceReadinesses({
        store_profile_id: provisioned.store_profile_id,
      });
      const eventsAfter = await saas.listStoreCommerceSetupEvents({
        setup_id: record.id,
      });

      expect(completedDuringObservation).toBe(true);
      expect(replay).toEqual(completedResult);
      expect(current.status).toBe("completed");
      expect(readiness.status).toBe("ready");
      expect(eventsAfter).toHaveLength(eventsBefore.length);
      expect(
        eventsAfter.some(
          (event: any) => event.event_type === "requires_attention",
        ),
      ).toBe(false);
    });

    it("fences a paused original owner after its expired lease enters attention", async () => {
      const provisioned = await provision(unique("readiness-fenced-owner"));
      const key = `commerce:${provisioned.handle}`;
      const container = getContainer();
      const saas = container.resolve(SAAS_MODULE) as any;
      const fulfillment = container.resolve(Modules.FULFILLMENT) as any;
      const originalListProviders = fulfillment.listFulfillmentProviders;
      let releaseOwner: () => void = () => {};
      let signalOwnerStarted: () => void = () => {};
      let intercepted = false;
      const ownerPaused = new Promise<void>((resolve) => {
        releaseOwner = resolve;
      });
      const ownerStarted = new Promise<void>((resolve) => {
        signalOwnerStarted = resolve;
      });

      fulfillment.listFulfillmentProviders = async (...args: any[]) => {
        if (!intercepted) {
          intercepted = true;
          signalOwnerStarted();
          await ownerPaused;
        }
        return await originalListProviders.apply(fulfillment, args);
      };

      const ownerResultPromise = setup(
        provisioned.store_profile_id,
        key,
        630,
      ).then(
        (result) => ({ result, error: null as unknown }),
        (error) => ({ result: null, error }),
      );
      let ownerResult: Awaited<typeof ownerResultPromise>;

      try {
        await ownerStarted;
        const [lease] = await saas.listStoreCommerceSetupLeases({
          lease_key: `store:${provisioned.store_profile_id}`,
        });
        expect(lease).toBeTruthy();
        await saas.updateStoreCommerceSetupLeases({
          id: lease.id,
          expires_at: new Date(Date.now() - 60_000),
        });

        await expect(
          setup(provisioned.store_profile_id, key, 630),
        ).rejects.toMatchObject({
          type: MedusaError.Types.CONFLICT,
          message: expect.stringMatching(/requires operator attention/i),
        });

        releaseOwner();
        ownerResult = await ownerResultPromise;
      } finally {
        releaseOwner();
        fulfillment.listFulfillmentProviders = originalListProviders;
        ownerResult ??= await ownerResultPromise;
      }

      expect(ownerResult.error).toMatchObject({
        type: MedusaError.Types.CONFLICT,
        message: expect.stringMatching(/requires operator attention/i),
      });
      expect(ownerResult.result).toBeNull();

      const [record] = await saas.listStoreCommerceSetups({
        idempotency_key: key,
      });
      const [readiness] = await saas.listStoreCommerceReadinesses({
        store_profile_id: provisioned.store_profile_id,
      });
      const leases = await saas.listStoreCommerceSetupLeases({
        lease_key: `store:${provisioned.store_profile_id}`,
      });
      const events = await saas.listStoreCommerceSetupEvents({
        setup_id: record.id,
      });

      expect(record).toMatchObject({
        status: "requires_attention",
        failure_code: "commerce_setup_lease_expired",
        result_snapshot: null,
      });
      expect(readiness).toMatchObject({
        status: "requires_attention",
        failure_code: "commerce_setup_lease_expired",
      });
      expect(leases).toHaveLength(1);
      expect(
        events.some((event: any) => event.event_type === "completed"),
      ).toBe(false);
    });

    it("sanitizes an unknown provider failure at the admin route boundary", async () => {
      const provisioned = await provision(unique("readiness-safe-error"));
      const key = `commerce:${provisioned.handle}:safe-error`;
      const sentinel = "provider-internal-sentinel-must-not-cross-boundary";
      const container = getContainer();
      const fulfillment = container.resolve(Modules.FULFILLMENT) as any;
      const originalListProviders = fulfillment.listFulfillmentProviders;
      let thrown: unknown;

      fulfillment.listFulfillmentProviders = async () => {
        throw new Error(sentinel);
      };

      try {
        const recorder = responseRecorder();
        await commerceSetupApi(
          {
            scope: container,
            auth_context: { actor_id: "platform-admin-readiness-test" },
            headers: { "idempotency-key": key },
            params: { store_profile_id: provisioned.store_profile_id },
            body: setupRequest(640),
          } as any,
          recorder.response as any,
        );
      } catch (error) {
        thrown = error;
      } finally {
        fulfillment.listFulfillmentProviders = originalListProviders;
      }

      expect(thrown).toBeInstanceOf(MedusaError);
      expect(thrown).toMatchObject({
        type: MedusaError.Types.UNEXPECTED_STATE,
        message: "Commerce setup failed at the recorded step.",
      });
      expect(JSON.stringify(thrown)).not.toContain(sentinel);

      const saas = container.resolve(SAAS_MODULE) as any;
      const [failed] = await saas.listStoreCommerceSetups({
        idempotency_key: key,
      });
      expect(failed).toMatchObject({
        status: "failed",
        failure_code: "commerce_setup_failed",
        failure_message_safe: "Commerce setup failed at the recorded step.",
      });
      expect(JSON.stringify(failed)).not.toContain(sentinel);

      const statusRecorder = responseRecorder();
      await commerceSetupStatusApi(
        {
          scope: container,
          auth_context: { actor_id: "platform-admin-readiness-test" },
          params: { id: failed.id },
        } as any,
        statusRecorder.response as any,
      );
      expect(statusRecorder.state.body.commerce_setup).toMatchObject({
        status: "failed",
        failure_code: "commerce_setup_failed",
        failure_message: "Commerce setup failed at the recorded step.",
      });
      expect(JSON.stringify(statusRecorder.state.body)).not.toContain(sentinel);
    });

    it("completes real HTTP checkout and preserves whole-Order Store isolation", async () => {
      const suffixA = unique("readiness-checkout-a");
      const suffixB = unique("readiness-checkout-b");
      const storeA = await provision(suffixA);
      const storeB = await provision(suffixB);
      const commerceA = await setup(
        storeA.store_profile_id,
        `commerce:${storeA.handle}`,
        100,
      );
      const commerceB = await setup(
        storeB.store_profile_id,
        `commerce:${storeB.handle}`,
        120,
      );

      expect(storeB.region_id).toBe(storeA.region_id);
      expect(commerceB.fulfillment_set_id).not.toBe(
        commerceA.fulfillment_set_id,
      );
      expect(commerceB.shipping_option_ids[0]).not.toBe(
        commerceA.shipping_option_ids[0],
      );

      const keyService = getContainer().resolve(Modules.API_KEY) as any;
      const [keyA, keyB] = await Promise.all([
        keyService.retrieveApiKey(storeA.publishable_api_key_id),
        keyService.retrieveApiKey(storeB.publishable_api_key_id),
      ]);
      const headersA = {
        Host: storeA.public_domain,
        "x-publishable-api-key": keyA.token,
      };
      const headersB = {
        Host: storeB.public_domain,
        "x-publishable-api-key": keyB.token,
      };
      const loginA = await api.post("/vendor/auth/login", {
        email: `owner-${suffixA}@example.test`,
        password: provisioningPassword,
      });
      const loginB = await api.post("/vendor/auth/login", {
        email: `owner-${suffixB}@example.test`,
        password: provisioningPassword,
      });
      const cookieA = cookieFrom(loginA);
      const cookieB = cookieFrom(loginB);
      const currencyMismatch = await api.post(
        "/vendor/products",
        {
          title: "Wrong Currency Product",
          handle: `wrong-currency-${suffixA}`,
          status: "published",
          price: 1500,
          currency_code: "eur",
        },
        { headers: { Cookie: cookieA }, validateStatus: () => true },
      );

      expect(currencyMismatch.status).toBe(400);
      expect(
        (await api.get("/vendor/me", { headers: { Cookie: cookieA } })).data
          .commerce,
      ).toEqual({ currency_code: "lyd" });

      const productA = (
        await api.post(
          "/vendor/products",
          {
            title: "Checkout Product A",
            handle: `checkout-product-${suffixA}`,
            status: "published",
            price: 1500,
          },
          { headers: { Cookie: cookieA } },
        )
      ).data.product;
      const productB = (
        await api.post(
          "/vendor/products",
          {
            title: "Checkout Product B",
            handle: `checkout-product-${suffixB}`,
            status: "published",
            price: 1800,
            currency_code: "lyd",
          },
          { headers: { Cookie: cookieB } },
        )
      ).data.product;
      const capabilityA = await api.get("/store/saas/commerce-capabilities", {
        headers: headersA,
      });
      const purchaseA = await api.get(
        `/store/saas/products/${productA.handle}/purchase-options`,
        { headers: headersA },
      );
      const crossedCapability = await api.get(
        "/store/saas/commerce-capabilities",
        {
          headers: {
            Host: storeA.public_domain,
            "x-publishable-api-key": keyB.token,
          },
          validateStatus: () => true,
        },
      );
      const crossStorePurchase = await api.get(
        `/store/saas/products/${productB.handle}/purchase-options`,
        { headers: headersA, validateStatus: () => true },
      );

      expect(capabilityA.data).toEqual({
        online_checkout: {
          status: "available",
          currency_code: "lyd",
          country_codes: ["ly"],
        },
      });
      expect(purchaseA.data).toEqual({
        product_handle: productA.handle,
        currency_code: "lyd",
        variant: {
          id: productA.variants[0].id,
          title: productA.variants[0].title,
          unit_price: 1500,
          available_for_sale: true,
        },
      });
      expect(crossedCapability.status).toBe(404);
      expect(crossStorePurchase.status).toBe(404);
      const cart = (
        await api.post(
          "/store/carts",
          { region_id: storeA.region_id },
          { headers: headersA },
        )
      ).data.cart;

      expect(
        (
          await api.post(
            `/store/carts/${cart.id}/line-items`,
            { variant_id: productA.variants[0].id, quantity: 1 },
            { headers: headersA },
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await api.post(
            `/store/carts/${cart.id}/line-items`,
            { variant_id: productB.variants[0].id, quantity: 1 },
            { headers: headersA, validateStatus: () => true },
          )
        ).status,
      ).toBe(400);

      await api.post(
        `/store/carts/${cart.id}`,
        {
          email: `checkout-${suffixA}@example.test`,
          shipping_address: {
            first_name: "Checkout",
            last_name: "Customer",
            address_1: "Gate closure address",
            city: "Tripoli",
            country_code: "ly",
          },
        },
        { headers: headersA },
      );
      const available = await api.get("/store/shipping-options", {
        params: { cart_id: cart.id },
        headers: headersA,
      });
      const availableIds = available.data.shipping_options.map(
        (option: any) => option.id,
      );

      expect(availableIds).toEqual(commerceA.shipping_option_ids);
      expect(
        (
          await api.post(
            `/store/carts/${cart.id}/shipping-methods`,
            { option_id: commerceB.shipping_option_ids[0] },
            { headers: headersA, validateStatus: () => true },
          )
        ).status,
      ).toBe(400);
      await api.post(
        `/store/carts/${cart.id}/shipping-methods`,
        { option_id: commerceA.shipping_option_ids[0] },
        { headers: headersA },
      );
      const collection = await api.post(
        "/store/payment-collections",
        { cart_id: cart.id },
        { headers: headersA },
      );
      expect(
        (
          await api.post(
            `/store/payment-collections/${collection.data.payment_collection.id}/payment-sessions`,
            { provider_id: "pp_not_allowed" },
            { headers: headersA, validateStatus: () => true },
          )
        ).status,
      ).toBe(400);
      await api.post(
        `/store/payment-collections/${collection.data.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        { headers: headersA },
      );
      const completed = await api.post(
        `/store/carts/${cart.id}/complete`,
        {},
        { headers: headersA },
      );
      const orderId = completed.data.order.id;
      const links = await listStoreOrderLinks(getContainer(), {
        order_id: orderId,
      });
      const ownOrder = await api.get(`/vendor/orders/${orderId}`, {
        headers: { Cookie: cookieA },
      });
      const otherMerchant = await api.get(`/vendor/orders/${orderId}`, {
        headers: { Cookie: cookieB },
        validateStatus: () => true,
      });

      expect(links).toEqual([
        expect.objectContaining({ store_id: storeA.medusa_store_id }),
      ]);
      expect(ownOrder.status).toBe(200);
      expect(otherMerchant.status).toBe(404);
      expect(
        (
          await api.get(`/store/carts/${cart.id}`, {
            headers: headersB,
            validateStatus: () => true,
          })
        ).status,
      ).toBe(404);
    });

    it("fails closed when a recorded ready graph is no longer real", async () => {
      const provisioned = await provision(unique("readiness-stale-graph"));
      const commerce = await setup(
        provisioned.store_profile_id,
        `commerce:${provisioned.handle}`,
        300,
      );
      const container = getContainer();

      await expect(
        assertStoreOnlineCheckoutReady(
          container,
          provisioned.store_profile_id,
          provisioned.medusa_store_id,
          { validateGraph: true },
        ),
      ).resolves.toMatchObject({ status: "ready" });

      const fulfillment = container.resolve(Modules.FULFILLMENT) as any;
      await fulfillment.deleteShippingOptions(commerce.shipping_option_ids[0]);

      await expect(
        assertStoreOnlineCheckoutReady(
          container,
          provisioned.store_profile_id,
          provisioned.medusa_store_id,
          { validateGraph: true },
        ),
      ).rejects.toThrow(/not available/i);

      const keyService = container.resolve(Modules.API_KEY) as any;
      const key = await keyService.retrieveApiKey(
        provisioned.publishable_api_key_id,
      );
      await expect(
        api.post(
          "/store/carts",
          { region_id: provisioned.region_id },
          {
            headers: {
              Host: provisioned.public_domain,
              "x-publishable-api-key": key.token,
            },
          },
        ),
      ).rejects.toMatchObject({ response: { status: 400 } });
    });

    it("rejects extra Shipping Option rules and prices without exposing checkout", async () => {
      const provisioned = await provision(unique("readiness-exact-pricing"));
      const commerce = await setup(
        provisioned.store_profile_id,
        `commerce:${provisioned.handle}`,
        330,
      );
      const container = getContainer();
      const fulfillment = container.resolve(Modules.FULFILLMENT) as any;
      const remoteQuery = container.resolve(
        ContainerRegistrationKeys.REMOTE_QUERY,
      ) as any;
      const pricing = container.resolve(Modules.PRICING) as any;
      const optionId = commerce.shipping_option_ids[0];
      const option = await fulfillment.retrieveShippingOption(optionId, {
        relations: ["rules"],
      });
      const priceRows = await remoteQuery({
        service: LINKS.ShippingOptionPriceSet,
        variables: { filters: { shipping_option_id: optionId } },
        fields: [
          "shipping_option_id",
          "price_set_id",
          "price_set.prices.*",
          "price_set.prices.price_rules.*",
        ],
      });

      expect(hasExactCommerceShippingOptionRules(option.rules)).toBe(true);
      expect(priceRows).toHaveLength(1);
      expect(
        hasExactCommerceShippingOptionPrices(
          priceRows[0].price_set.prices,
          commerce.currency_code,
          commerce.region_id,
          330,
        ),
      ).toBe(true);

      const extraRule = await fulfillment.createShippingOptionRules({
        shipping_option_id: optionId,
        attribute: "customer_group_id",
        operator: "eq",
        value: "cusgrp_cross_store",
      });

      await expect(
        assertStoreOnlineCheckoutReady(
          container,
          provisioned.store_profile_id,
          provisioned.medusa_store_id,
          { validateGraph: true },
        ),
      ).rejects.toThrow(/not available/i);

      const keyService = container.resolve(Modules.API_KEY) as any;
      const key = await keyService.retrieveApiKey(
        provisioned.publishable_api_key_id,
      );
      const headers = {
        Host: provisioned.public_domain,
        "x-publishable-api-key": key.token,
      };
      const ruleBlockedCart = await api.post(
        "/store/carts",
        { region_id: provisioned.region_id },
        { headers, validateStatus: () => true },
      );

      expect(ruleBlockedCart.status).toBe(400);

      await fulfillment.deleteShippingOptionRules(extraRule.id);
      await expect(
        assertStoreOnlineCheckoutReady(
          container,
          provisioned.store_profile_id,
          provisioned.medusa_store_id,
          { validateGraph: true },
        ),
      ).resolves.toMatchObject({ status: "ready" });

      const cart = (
        await api.post(
          "/store/carts",
          { region_id: provisioned.region_id },
          { headers },
        )
      ).data.cart;

      await pricing.addPrices({
        priceSetId: priceRows[0].price_set_id,
        prices: [{ currency_code: "usd", amount: 1 }],
      });

      await expect(
        assertStoreOnlineCheckoutReady(
          container,
          provisioned.store_profile_id,
          provisioned.medusa_store_id,
          { validateGraph: true },
        ),
      ).rejects.toThrow(/not available/i);

      const priceBlockedOptions = await api.get("/store/shipping-options", {
        params: { cart_id: cart.id },
        headers,
        validateStatus: () => true,
      });

      expect(priceBlockedOptions.status).toBe(400);
      expect(JSON.stringify(priceBlockedOptions.data)).not.toContain(optionId);
    });

    it("blocks cross-Store fulfillment-set and shipping-option exposure", async () => {
      const storeA = await provision(unique("readiness-link-owner-a"));
      const storeB = await provision(unique("readiness-link-owner-b"));
      const commerceA = await setup(
        storeA.store_profile_id,
        `commerce:${storeA.handle}`,
        310,
      );
      const commerceB = await setup(
        storeB.store_profile_id,
        `commerce:${storeB.handle}`,
        320,
      );
      const container = getContainer();
      const keyService = container.resolve(Modules.API_KEY) as any;
      const keyA = await keyService.retrieveApiKey(
        storeA.publishable_api_key_id,
      );
      const headersA = {
        Host: storeA.public_domain,
        "x-publishable-api-key": keyA.token,
      };
      const cart = (
        await api.post(
          "/store/carts",
          { region_id: storeA.region_id },
          { headers: headersA },
        )
      ).data.cart;
      const link = container.resolve(ContainerRegistrationKeys.LINK) as any;

      await link.dismiss({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: commerceB.stock_location_id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: commerceB.fulfillment_set_id,
        },
      });
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: commerceA.stock_location_id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: commerceB.fulfillment_set_id,
        },
      });

      await expect(
        assertStoreOnlineCheckoutReady(
          container,
          storeA.store_profile_id,
          storeA.medusa_store_id,
          { validateGraph: true },
        ),
      ).rejects.toThrow(/not available/i);

      const shippingOptions = await api.get("/store/shipping-options", {
        params: { cart_id: cart.id },
        headers: headersA,
        validateStatus: () => true,
      });

      expect(shippingOptions.status).toBe(400);
      expect(JSON.stringify(shippingOptions.data)).not.toContain(
        commerceB.shipping_option_ids[0],
      );
    });

    it("protects the commerce setup endpoint with platform authentication", async () => {
      const provisioned = await provision(unique("readiness-auth"));

      await expect(
        api.post(
          `/admin/saas/stores/${provisioned.store_profile_id}/commerce-setup`,
          setupRequest(),
          { headers: { "Idempotency-Key": `commerce:${provisioned.handle}` } },
        ),
      ).rejects.toMatchObject({ response: { status: 401 } });

      const recorder = responseRecorder();
      await commerceSetupApi(
        {
          scope: getContainer(),
          auth_context: { actor_id: "platform-admin-readiness-test" },
          headers: {
            "idempotency-key": `commerce:${provisioned.handle}:route`,
          },
          params: { store_profile_id: provisioned.store_profile_id },
          body: setupRequest(450),
        } as any,
        recorder.response as any,
      );

      expect(recorder.state.statusCode).toBe(201);
      expect(recorder.state.body.commerce_setup).toMatchObject({
        status: "completed",
        readiness_status: "ready",
        store_profile_id: provisioned.store_profile_id,
      });

      const setupStatusRecorder = responseRecorder();
      await commerceSetupStatusApi(
        {
          scope: getContainer(),
          auth_context: { actor_id: "platform-admin-readiness-test" },
          params: { id: recorder.state.body.commerce_setup.setup_id },
        } as any,
        setupStatusRecorder.response as any,
      );
      expect(setupStatusRecorder.state.body.commerce_setup).toMatchObject({
        id: recorder.state.body.commerce_setup.setup_id,
        status: "completed",
      });

      const readinessRecorder = responseRecorder();
      await commerceReadinessApi(
        {
          scope: getContainer(),
          auth_context: { actor_id: "platform-admin-readiness-test" },
          params: { store_profile_id: provisioned.store_profile_id },
        } as any,
        readinessRecorder.response as any,
      );
      expect(readinessRecorder.state.body.commerce_readiness).toMatchObject({
        store_profile_id: provisioned.store_profile_id,
        status: "ready",
        last_setup_id: recorder.state.body.commerce_setup.setup_id,
      });
    });
  },
});
