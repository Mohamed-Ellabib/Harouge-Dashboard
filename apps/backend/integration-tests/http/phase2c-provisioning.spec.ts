import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";

import { POST as provisionApi } from "../../src/api/admin/saas/provisioning/route";
import { POST as createLegacyVendorApi } from "../../src/api/admin/vendors/route";
import {
  DELETE as deleteLegacyVendorApi,
  PATCH as updateLegacyVendorApi,
} from "../../src/api/admin/vendors/[id]/route";
import { platformProvisioningRateLimiter } from "../../src/api/_utils/platform-provisioning-rate-limit";
import { resolveMerchantStoreContext } from "../../src/api/_utils/merchant-store-context";
import { resolvePublicStoreContext } from "../../src/api/_utils/public-store-context";
import { getVendorSessionVersion } from "../../src/api/_utils/vendor-auth";
import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit";
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace";
import { SAAS_MODULE } from "../../src/modules/saas";
import { executeSaasStoreProvisioning } from "../../src/workflows/provision-saas-store";
import { serializeProvisioningStatus } from "../../src/workflows/provisioning-state";
import type { ProvisioningStep } from "../../src/workflows/provisioning-contract";
import {
  provisioningPassword,
  provisioningRequest,
} from "../helpers/provisioning-fixtures";

jest.setTimeout(180_000);

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
const suffix = (prefix: string) => {
  sequence += 1;
  return prefix + "-" + sequence;
};

const provision = (
  container: any,
  key: string,
  request: Record<string, any>,
  failureStep?: ProvisioningStep,
) =>
  executeSaasStoreProvisioning(container, {
    idempotency_key: key,
    actor_id: "platform-admin-test",
    request,
    ...(failureStep ? { failure_step: failureStep } : {}),
  });

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
      send(body?: unknown) {
        state.body = body ?? null;
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
    describe("Phase 2C idempotent Store provisioning", () => {
      beforeEach(() => {
        vendorLoginRateLimiter.reset();
        platformProvisioningRateLimiter.reset();
      });

      it("provisions a complete Starter Store and returns an allowlisted result", async () => {
        const id = suffix("starter");
        const request = provisioningRequest({ suffix: id });
        const result = await provision(
          getContainer(),
          "provision:" + id,
          request,
        );
        const container = getContainer();
        const saas = container.resolve(SAAS_MODULE) as any;
        const marketplace = container.resolve(MARKETPLACE_MODULE) as any;
        const storeService = container.resolve(Modules.STORE) as any;
        const regionService = container.resolve(Modules.REGION) as any;
        const locationService = container.resolve(
          Modules.STOCK_LOCATION,
        ) as any;
        const keyService = container.resolve(Modules.API_KEY) as any;
        const record = (
          await saas.listStoreProvisionings({
            idempotency_key: "provision:" + id,
          })
        )[0];
        const [
          profile,
          tenant,
          store,
          region,
          location,
          key,
          domains,
          brands,
          memberships,
          readinessRecords,
          events,
        ] = await Promise.all([
          saas.retrieveStoreProfile(result.store_profile_id),
          saas.retrieveTenant(result.tenant_id),
          storeService.retrieveStore(result.medusa_store_id),
          regionService.retrieveRegion(result.region_id),
          locationService.retrieveStockLocation(result.stock_location_id),
          keyService.retrieveApiKey(result.publishable_api_key_id),
          saas.listStoreDomains({
            store_profile_id: result.store_profile_id,
          }),
          saas.listStoreBrands({
            store_profile_id: result.store_profile_id,
          }),
          saas.listMerchantMemberships({
            store_profile_id: result.store_profile_id,
          }),
          saas.listStoreCommerceReadinesses({
            store_profile_id: result.store_profile_id,
          }),
          saas.listStoreProvisioningEvents({
            provisioning_id: result.provisioning_id,
          }),
        ]);

        expect(result.status).toBe("completed");
        expect(result.plan_code).toBe("starter_whatsapp");
        expect(result.public_domain).toBe(request.store.handle + ".local.test");
        expect(tenant.status).toBe("active");
        expect(profile.status).toBe("active");
        expect(profile.plan_code).toBe("starter_whatsapp");
        expect(store.default_sales_channel_id).toBe(result.sales_channel_id);
        expect(store.default_region_id).toBe(result.region_id);
        expect(store.default_location_id).toBe(result.stock_location_id);
        expect(region.currency_code).toBe("lyd");
        expect(location.id).toBe(result.stock_location_id);
        expect(key.type).toBe("publishable");
        expect(domains).toHaveLength(1);
        expect(domains[0].verification_status).toBe("verified");
        expect(brands).toHaveLength(1);
        expect(memberships).toHaveLength(1);
        expect(memberships[0].role).toBe("owner");
        expect(readinessRecords).toHaveLength(1);
        expect(readinessRecords[0]).toMatchObject({
          plan_code: "starter_whatsapp",
          status: "not_required",
          shipping_option_ids: [],
        });
        expect(
          events.some((event: any) => event.event_type === "completed"),
        ).toBe(true);

        const serializedRecord = JSON.stringify(record);
        const serializedResult = JSON.stringify(result);
        expect(serializedRecord).not.toContain(provisioningPassword);
        expect(serializedRecord).not.toContain("database_url");
        expect(serializedResult).not.toContain("token");
        expect(serializedResult).not.toContain("password");
        expect(
          await marketplace.retrieveVendor(profile.legacy_vendor_id),
        ).toMatchObject({ status: "active", handle: request.store.handle });
      });

      it("freezes mapped legacy Vendor lifecycle writes while preserving unmapped cleanup", async () => {
        const id = suffix("legacy-freeze");
        const request = provisioningRequest({ suffix: id });
        const result = await provision(
          getContainer(),
          "provision:" + id,
          request,
        );
        const container = getContainer();
        const saas = container.resolve(SAAS_MODULE) as any;
        const marketplace = container.resolve(MARKETPLACE_MODULE) as any;
        const profile = await saas.retrieveStoreProfile(result.store_profile_id);
        const mappedVendorId = profile.legacy_vendor_id;

        const createRecorder = responseRecorder();
        await createLegacyVendorApi(
          {
            scope: container,
            body: {
              name: "Blocked standalone Vendor",
              handle: "blocked-" + id,
            },
          } as any,
          createRecorder.response as any,
        );
        expect(createRecorder.state.statusCode).toBe(409);
        expect(createRecorder.state.body).toMatchObject({
          code: "legacy_vendor_creation_disabled",
        });
        expect(
          await marketplace.listVendors({ handle: "blocked-" + id }),
        ).toHaveLength(0);

        const updateRecorder = responseRecorder();
        await updateLegacyVendorApi(
          {
            scope: container,
            params: { id: mappedVendorId },
            body: { status: "suspended" },
          } as any,
          updateRecorder.response as any,
        );
        expect(updateRecorder.state.statusCode).toBe(409);
        expect(updateRecorder.state.body).toMatchObject({
          code: "canonical_store_compatibility_read_only",
        });
        expect((await marketplace.retrieveVendor(mappedVendorId)).status).toBe(
          "active",
        );

        const deleteRecorder = responseRecorder();
        await deleteLegacyVendorApi(
          {
            scope: container,
            params: { id: mappedVendorId },
          } as any,
          deleteRecorder.response as any,
        );
        expect(deleteRecorder.state.statusCode).toBe(409);
        expect(deleteRecorder.state.body).toMatchObject({
          code: "canonical_store_delete_blocked",
        });
        expect(await marketplace.retrieveVendor(mappedVendorId)).toBeTruthy();

        const unmappedVendor = await marketplace.createVendors({
          name: "Unmapped legacy cleanup",
          handle: "unmapped-" + id,
          status: "draft",
        });
        const unmappedUpdateRecorder = responseRecorder();
        await updateLegacyVendorApi(
          {
            scope: container,
            params: { id: unmappedVendor.id },
            body: { status: "suspended" },
          } as any,
          unmappedUpdateRecorder.response as any,
        );
        expect(unmappedUpdateRecorder.state.statusCode).toBe(200);
        expect((await marketplace.retrieveVendor(unmappedVendor.id)).status).toBe(
          "suspended",
        );

        const unmappedDeleteRecorder = responseRecorder();
        await deleteLegacyVendorApi(
          {
            scope: container,
            params: { id: unmappedVendor.id },
          } as any,
          unmappedDeleteRecorder.response as any,
        );
        expect(unmappedDeleteRecorder.state.statusCode).toBe(204);
        expect(
          await marketplace.retrieveVendor(unmappedVendor.id).catch(() => null),
        ).toBeNull();
      });

      it("provisions Professional branding and a pending custom domain", async () => {
        const id = suffix("professional");
        const customDomain = id + ".shops.example.test";
        const request = provisioningRequest({
          suffix: id,
          planCode: "professional_commerce",
          customDomain,
        });
        const result = await provision(
          getContainer(),
          "provision:" + id,
          request,
        );
        const saas = getContainer().resolve(SAAS_MODULE) as any;
        const [profile, domains, brands, readinessRecords] = await Promise.all([
          saas.retrieveStoreProfile(result.store_profile_id),
          saas.listStoreDomains({
            store_profile_id: result.store_profile_id,
          }),
          saas.listStoreBrands({
            store_profile_id: result.store_profile_id,
          }),
          saas.listStoreCommerceReadinesses({
            store_profile_id: result.store_profile_id,
          }),
        ]);

        expect(profile.plan_code).toBe("professional_commerce");
        expect(domains).toHaveLength(2);
        expect(
          domains.find((domain: any) => domain.type === "custom"),
        ).toMatchObject({
          normalized_hostname: customDomain,
          verification_status: "pending",
          is_primary: false,
        });
        expect(brands[0]).toMatchObject({
          primary_color: "#1257A6",
          secondary_color: "#F2B134",
          typography_key: "cairo",
        });
        expect(readinessRecords).toHaveLength(1);
        expect(readinessRecords[0]).toMatchObject({
          plan_code: "professional_commerce",
          status: "pending",
          shipping_option_ids: [],
        });
      });

      it("returns the same result on replay and rejects changed input for the key", async () => {
        const id = suffix("replay");
        const request = provisioningRequest({ suffix: id });
        const first = await provision(
          getContainer(),
          "provision:" + id,
          request,
        );
        const second = await provision(
          getContainer(),
          "provision:" + id,
          request,
        );

        expect(second).toEqual(first);
        const changed = {
          ...request,
          store: { ...request.store, name: "Changed Name" },
        };
        await expect(
          provision(getContainer(), "provision:" + id, changed),
        ).rejects.toThrow(/different provisioning input/i);
      });

      it("serializes status without snapshots, leases, actor data, or secrets", async () => {
        const id = suffix("status");
        await provision(
          getContainer(),
          "provision:" + id,
          provisioningRequest({ suffix: id }),
        );
        const saas = getContainer().resolve(SAAS_MODULE) as any;
        const record = (
          await saas.listStoreProvisionings({
            idempotency_key: "provision:" + id,
          })
        )[0];
        const status = serializeProvisioningStatus(record);

        expect(Object.keys(status).sort()).toEqual([
          "completed_at",
          "created_at",
          "current_step",
          "failure_code",
          "failure_message",
          "id",
          "requested_domain",
          "requested_handle",
          "requested_owner_email",
          "requested_plan_code",
          "result",
          "retry_count",
          "status",
          "updated_at",
        ]);
        expect(JSON.stringify(status)).not.toContain(provisioningPassword);
        expect(status).not.toHaveProperty("request_snapshot");
        expect(status).not.toHaveProperty("resource_state");
        expect(status).not.toHaveProperty("actor_id");
      });

      it("uses one database lease for concurrent requests with the same key", async () => {
        const id = suffix("same-key");
        const request = provisioningRequest({ suffix: id });
        const [first, second] = await Promise.all([
          provision(getContainer(), "provision:" + id, request),
          provision(getContainer(), "provision:" + id, request),
        ]);
        const saas = getContainer().resolve(SAAS_MODULE) as any;
        const records = await saas.listStoreProvisionings({
          idempotency_key: "provision:" + id,
        });
        const activeLeases = await saas.listStoreProvisioningLeases({
          idempotency_key: "provision:" + id,
        });

        expect(first).toEqual(second);
        expect(records).toHaveLength(1);
        expect(activeLeases).toHaveLength(0);
      });

      it("resolves concurrent handle conflicts deterministically", async () => {
        const id = suffix("same-handle");
        const request = provisioningRequest({ suffix: id });
        const outcomes = await Promise.allSettled([
          provision(getContainer(), "provision:" + id + ":a", request),
          provision(getContainer(), "provision:" + id + ":b", request),
        ]);

        expect(
          outcomes.filter((outcome) => outcome.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
          outcomes.filter((outcome) => outcome.status === "rejected"),
        ).toHaveLength(1);
      });

      it("resolves concurrent normalized-domain conflicts safely", async () => {
        const id = suffix("same-domain");
        const customDomain = id + ".example.test";
        const first = provisioningRequest({
          suffix: id + "-a",
          customDomain,
        });
        const second = provisioningRequest({
          suffix: id + "-b",
          customDomain,
        });
        const outcomes = await Promise.allSettled([
          provision(getContainer(), "provision:" + id + ":a", first),
          provision(getContainer(), "provision:" + id + ":b", second),
        ]);

        expect(
          outcomes.filter((outcome) => outcome.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
          outcomes.filter((outcome) => outcome.status === "rejected"),
        ).toHaveLength(1);
      });

      it("resumes safely after a retained partial failure", async () => {
        const id = suffix("retry");
        const request = provisioningRequest({ suffix: id });

        await expect(
          provision(
            getContainer(),
            "provision:" + id,
            request,
            "stock_location",
          ),
        ).rejects.toThrow(/injected provisioning failure/i);

        const saas = getContainer().resolve(SAAS_MODULE) as any;
        const failed = (
          await saas.listStoreProvisionings({
            idempotency_key: "provision:" + id,
          })
        )[0];
        const failedProfile = await saas.retrieveStoreProfile(
          failed.store_profile_id,
        );

        expect(failed.status).toBe("failed");
        expect(failedProfile.status).toBe("draft");
        expect(
          Object.values(failed.resource_state).some(
            (state: any) => state.disposition === "retained_for_retry",
          ),
        ).toBe(true);

        const completed = await provision(
          getContainer(),
          "provision:" + id,
          request,
        );
        const retried = await saas.retrieveStoreProvisioning(failed.id);

        expect(completed.medusa_store_id).toBe(failed.medusa_store_id);
        expect(completed.sales_channel_id).toBe(failed.sales_channel_id);
        expect(completed.region_id).toBe(failed.region_id);
        expect(retried.retry_count).toBe(1);
        expect(retried.status).toBe("completed");
      });

      it("supports one explicit owner and Tenant across two Stores", async () => {
        const id = suffix("multi-store");
        const ownerEmail = "shared-" + id + "@example.test";
        const tenantKey = "shared-" + id;
        const firstRequest = provisioningRequest({
          suffix: id + "-a",
          tenantKey,
          ownerEmail,
        });
        const first = await provision(
          getContainer(),
          "provision:" + id + ":a",
          firstRequest,
        );
        const secondRequest = provisioningRequest({
          suffix: id + "-b",
          tenantKey,
          tenantName: firstRequest.tenant.name,
          reuseTenant: true,
          ownerEmail,
          reuseOwner: true,
        });
        const second = await provision(
          getContainer(),
          "provision:" + id + ":b",
          secondRequest,
        );
        const saas = getContainer().resolve(SAAS_MODULE) as any;
        const [firstMembership] = await saas.listMerchantMemberships({
          store_profile_id: first.store_profile_id,
        });
        const [secondMembership] = await saas.listMerchantMemberships({
          store_profile_id: second.store_profile_id,
        });

        expect(second.tenant_id).toBe(first.tenant_id);
        expect(secondMembership.merchant_account_reference).toBe(
          firstMembership.merchant_account_reference,
        );

        const loginA = await api.post("/vendor/auth/login", {
          email: ownerEmail,
          password: provisioningPassword,
          store_handle: first.handle,
        });
        const loginB = await api.post("/vendor/auth/login", {
          email: ownerEmail,
          password: provisioningPassword,
          store_handle: second.handle,
        });

        expect(loginA.status).toBe(200);
        expect(loginB.status).toBe(200);
        await expect(
          api.post("/vendor/auth/login", {
            email: ownerEmail,
            password: provisioningPassword,
          }),
        ).rejects.toMatchObject({ response: { status: 401 } });
      });

      it("resolves merchant/public contexts and rejects a mismatched Store key", async () => {
        const id = suffix("contexts");
        const requestA = provisioningRequest({ suffix: id + "-a" });
        const requestB = provisioningRequest({ suffix: id + "-b" });
        const [storeA, storeB] = await Promise.all([
          provision(getContainer(), "provision:" + id + ":a", requestA),
          provision(getContainer(), "provision:" + id + ":b", requestB),
        ]);
        const container = getContainer();
        const saas = container.resolve(SAAS_MODULE) as any;
        const marketplace = container.resolve(MARKETPLACE_MODULE) as any;
        const keyService = container.resolve(Modules.API_KEY) as any;
        const [membership] = await saas.listMerchantMemberships({
          store_profile_id: storeA.store_profile_id,
        });
        const member = await marketplace.retrieveVendorMember(
          membership.merchant_account_reference,
        );
        const profile = await saas.retrieveStoreProfile(
          storeA.store_profile_id,
        );
        const [keyA, keyB] = await Promise.all([
          keyService.retrieveApiKey(storeA.publishable_api_key_id),
          keyService.retrieveApiKey(storeB.publishable_api_key_id),
        ]);
        const merchant = await resolveMerchantStoreContext({
          scope: container,
          vendor_auth: {
            member_id: member.id,
            vendor_id: profile.legacy_vendor_id,
            store_profile_id: profile.id,
            session_version: getVendorSessionVersion(member.metadata),
          },
        } as any);
        const publicContext = await resolvePublicStoreContext({
          scope: container,
          headers: { host: storeA.public_domain },
          publishable_key_context: {
            key: keyA.token,
            sales_channel_ids: [storeA.sales_channel_id],
          },
        } as any);

        expect(merchant.medusaStoreId).toBe(storeA.medusa_store_id);
        expect(publicContext.medusaStoreId).toBe(storeA.medusa_store_id);
        await expect(
          resolvePublicStoreContext({
            scope: container,
            headers: { host: storeA.public_domain },
            publishable_key_context: {
              key: keyB.token,
              sales_channel_ids: [storeB.sales_channel_id],
            },
          } as any),
        ).rejects.toThrow(/not found/i);
      });

      it("does not silently activate an existing disabled owner", async () => {
        const id = suffix("disabled-owner");
        const ownerEmail = "disabled-" + id + "@example.test";
        const first = await provision(
          getContainer(),
          "provision:" + id + ":a",
          provisioningRequest({
            suffix: id + "-a",
            ownerEmail,
          }),
        );
        const container = getContainer();
        const saas = container.resolve(SAAS_MODULE) as any;
        const marketplace = container.resolve(MARKETPLACE_MODULE) as any;
        const [membership] = await saas.listMerchantMemberships({
          store_profile_id: first.store_profile_id,
        });
        await marketplace.updateVendorMembers([
          {
            id: membership.merchant_account_reference,
            status: "disabled",
          },
        ]);

        await expect(
          provision(
            container,
            "provision:" + id + ":b",
            provisioningRequest({
              suffix: id + "-b",
              ownerEmail,
              reuseOwner: true,
            }),
          ),
        ).rejects.toThrow(/unavailable or ambiguous/i);
        expect(
          (
            await marketplace.retrieveVendorMember(
              membership.merchant_account_reference,
            )
          ).status,
        ).toBe("disabled");
      });

      it("exposes provisioning only to platform-admin authentication", async () => {
        const id = suffix("api-auth");

        await expect(
          api.post(
            "/admin/saas/provisioning",
            provisioningRequest({ suffix: id }),
            { headers: { "Idempotency-Key": "provision:" + id } },
          ),
        ).rejects.toMatchObject({ response: { status: 401 } });

        const recorder = responseRecorder();
        await provisionApi(
          {
            scope: getContainer(),
            auth_context: { actor_id: "platform-admin-test" },
            headers: { "idempotency-key": "provision:" + id + ":direct" },
            body: provisioningRequest({ suffix: id + "-direct" }),
          } as any,
          recorder.response as any,
        );

        expect(recorder.state.statusCode).toBe(201);
        expect(recorder.state.body.provisioning.status).toBe("completed");
        expect(JSON.stringify(recorder.state.body)).not.toContain(
          provisioningPassword,
        );
      });

      it.each<ProvisioningStep>([
        "tenant",
        "medusa_store",
        "store_profile",
        "sales_channel",
        "publishable_key",
        "region",
        "stock_location",
        "brand",
        "domain",
        "merchant_account",
        "membership",
        "graph_validation",
      ])("records safe inactive failure state at %s", async (step) => {
        const id = suffix("failure-" + step.replace("_", "-"));
        const request = provisioningRequest({ suffix: id });

        await expect(
          provision(getContainer(), "provision:" + id, request, step),
        ).rejects.toThrow(/injected provisioning failure/i);

        const saas = getContainer().resolve(SAAS_MODULE) as any;
        const record = (
          await saas.listStoreProvisionings({
            idempotency_key: "provision:" + id,
          })
        )[0];

        expect(record.status).toBe("failed");
        expect(JSON.stringify(record)).not.toContain(provisioningPassword);
        if (record.store_profile_id) {
          expect(
            (await saas.retrieveStoreProfile(record.store_profile_id)).status,
          ).toBe("draft");
        }
      });
    });
  },
});
