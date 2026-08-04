import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchStorefrontProductDetail,
  mapStorefrontCartResponse,
  mapStorefrontCatalogResponse,
  mapStorefrontCommerceCapabilitiesResponse,
  mapStorefrontOrderConfirmationResponse,
  mapStorefrontProfileResponse,
  mapStorefrontPurchaseOptionsResponse,
  mapStorefrontShippingOptionsResponse,
  StorefrontApiError,
} from "./storefront-api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("storefront response allowlists", () => {
  it("maps a profile to the exact public DTO and discards private fields", () => {
    const mapped = mapStorefrontProfileResponse({
      vendor: {
        id: "internal-vendor-id",
        name: "  متجر الاختبار  ",
        handle: "test-store",
        domain: "SHOP.EXAMPLE.TEST.",
        contact_email: "private@example.test",
        metadata: { tenant_id: "tenant-private" },
        branding: {
          logo_url: "/images/logo.png",
          primary_color: "#1455E6",
          arbitrary_css: "body { display: none }",
        },
      },
    });

    expect(mapped).toEqual({
      name: "متجر الاختبار",
      handle: "test-store",
      domain: "shop.example.test",
      branding: {
        logo_url: "/images/logo.png",
        primary_color: "#1455e6",
      },
    });
    expect(JSON.stringify(mapped)).not.toContain("private");
    expect(JSON.stringify(mapped)).not.toContain("metadata");
    expect(JSON.stringify(mapped)).not.toContain("arbitrary_css");
  });

  it("maps catalog cards without retaining ids, metadata, variants, or prices", () => {
    const mapped = mapStorefrontCatalogResponse(
      {
        products: [
          {
            id: "prod_internal",
            handle: "quiet-candle",
            title: "شمعة هادئة",
            subtitle: "تفاصيل بسيطة",
            description: "Not part of a card DTO",
            thumbnail: "/images/candle.png",
            metadata: { tenant: "private" },
            variants: [{ prices: [{ amount: 999_999 }] }],
          },
        ],
        count: 1,
        offset: 0,
        limit: 12,
        internal_cursor: "private",
      },
      0,
      12,
    );

    expect(mapped).toEqual({
      products: [
        {
          handle: "quiet-candle",
          title: "شمعة هادئة",
          subtitle: "تفاصيل بسيطة",
          thumbnail_url: "/images/candle.png",
        },
      ],
      count: 1,
      offset: 0,
      limit: 12,
    });
    expect(JSON.stringify(mapped)).not.toMatch(
      /prod_internal|metadata|variant|price|private/,
    );
  });

  it("fails closed when pagination is inconsistent", () => {
    expect(() =>
      mapStorefrontCatalogResponse(
        {
          products: [{ handle: "one", title: "منتج", subtitle: null }],
          count: 1,
          offset: 12,
          limit: 12,
        },
        0,
        12,
      ),
    ).toThrowError(StorefrontApiError);
  });

  it("maps exact commerce capability and purchase DTOs without internal state", () => {
    const capability = mapStorefrontCommerceCapabilitiesResponse({
      online_checkout: {
        status: "available",
        currency_code: "LYD",
        country_codes: ["LY"],
        readiness_id: "readiness_private",
        plan: "professional_commerce",
      },
      store_id: "store_private",
    });
    const purchase = mapStorefrontPurchaseOptionsResponse(
      {
        product_handle: "quiet-vase",
        currency_code: "lyd",
        options: [
          { name: "size", values: ["M", "L"], option_id: "private" },
          { name: "color", values: ["Black"] },
        ],
        variants: [
          {
            id: "variant_public_reference",
            title: "M / Black",
            options: { size: "M", color: "Black", private: "discarded" },
            unit_price: 120,
            available_for_sale: true,
            sku: "private",
            inventory_quantity: 999,
          },
          {
            id: "variant_second_reference",
            title: "L / Black",
            options: { size: "L", color: "Black" },
            unit_price: 125,
            available_for_sale: true,
          },
        ],
        product_id: "prod_private",
      },
      "quiet-vase",
      "lyd",
    );

    expect(capability).toEqual({
      online_checkout: {
        status: "available",
        currency_code: "lyd",
        country_codes: ["ly"],
      },
    });
    expect(purchase).toEqual({
      product_handle: "quiet-vase",
      currency_code: "lyd",
      options: [
        { name: "size", values: ["M", "L"] },
        { name: "color", values: ["Black"] },
      ],
      variants: [
        {
          id: "variant_public_reference",
          title: "M / Black",
          options: { size: "M", color: "Black" },
          unit_price: 120,
          available_for_sale: true,
        },
        {
          id: "variant_second_reference",
          title: "L / Black",
          options: { size: "L", color: "Black" },
          unit_price: 125,
          available_for_sale: true,
        },
      ],
    });
    expect(JSON.stringify({ capability, purchase })).not.toMatch(
      /private|readiness|professional|inventory|sku|product_id/,
    );
  });

  it("reduces Cart, shipping, and confirmation responses to customer DTOs", () => {
    const cart = mapStorefrontCartResponse(
      {
        cart: {
          id: "cart_public_reference",
          currency_code: "lyd",
          email: "guest@example.test",
          items: [
            {
              id: "item_public_reference",
              variant_id: "variant_public_reference",
              product_title: "Quiet vase",
              thumbnail: "/images/vase.png",
              quantity: 1,
              unit_price: 120,
              metadata: { private: true },
            },
          ],
          item_subtotal: 120,
          shipping_total: 15,
          total: 135,
          shipping_methods: [{ id: "method_private" }],
          payment_collection: {
            id: "collection_private",
            payment_sessions: [{ id: "session_private" }],
          },
          customer: { id: "customer_private" },
          completed_at: null,
        },
      },
      "lyd",
    );
    const shipping = mapStorefrontShippingOptionsResponse({
      shipping_options: [
        {
          id: "shipping_option_reference",
          name: "Local delivery",
          amount: 15,
          provider_id: "provider_private",
        },
      ],
    });
    const confirmation = mapStorefrontOrderConfirmationResponse(
      {
        type: "order",
        order: {
          id: "order_private",
          display_id: 42,
          currency_code: "lyd",
          items: [
            {
              product_title: "Quiet vase",
              quantity: 2,
              unit_price: 120,
              metadata: { private: true },
            },
          ],
          item_subtotal: 120,
          shipping_total: 15,
          total: 135,
          shipping_address: { address_1: "private" },
          payment_collections: [{ id: "private" }],
        },
      },
      "lyd",
    );

    expect(cart).toMatchObject({
      id: "cart_public_reference",
      items: [expect.objectContaining({ total: 120 })],
      shipping_method_selected: true,
      payment_session_ready: true,
      completed: false,
    });
    expect(shipping).toEqual([
      {
        id: "shipping_option_reference",
        name: "Local delivery",
        amount: 15,
      },
    ]);
    expect(confirmation).toMatchObject({
      display_id: 42,
      items: [expect.objectContaining({ total: 240 })],
      total: 135,
    });
    expect(JSON.stringify({ cart, shipping, confirmation })).not.toMatch(
      /provider_private|collection_private|session_private|customer_private|order_private|address_1|metadata/,
    );
  });
});

describe("storefront product requests", () => {
  it("uses a relative, presentation-only GET and returns an exact detail DTO", async () => {
    vi.stubEnv("VITE_MEDUSA_PUBLISHABLE_KEY", "pk_public_test_value");
    vi.stubEnv("VITE_STOREFRONT_VISUAL_PREVIEW", "false");
    vi.stubEnv("VITE_STOREFRONT_DEV_HANDLE", "");

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            products: [
              {
                id: "prod_internal",
                handle: "blue-mug",
                title: "كوب أزرق",
                subtitle: "تصميم يومي",
                description: "وصف واضح.",
                thumbnail: "/images/mug.png",
                images: [
                  { id: "image_internal", url: "/images/mug.png" },
                  { id: "image_private", url: "/images/mug-side.png" },
                ],
                metadata: { secret: "discard-me" },
                variants: [{ prices: [{ amount: 1500 }] }],
              },
            ],
            count: 1,
            offset: 0,
            limit: 2,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const detail = await fetchStorefrontProductDetail("blue-mug");

    expect(detail).toEqual({
      handle: "blue-mug",
      title: "كوب أزرق",
      subtitle: "تصميم يومي",
      description: "وصف واضح.",
      thumbnail_url: "/images/mug.png",
      image_urls: ["/images/mug.png", "/images/mug-side.png"],
    });
    expect(JSON.stringify(detail)).not.toMatch(
      /prod_internal|image_internal|metadata|secret|variant|price|1500/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [requestPath, requestInit] = fetchMock.mock.calls[0];
    const parsedPath = new URL(
      String(requestPath),
      "https://store.example.test",
    );
    const headers = new Headers(requestInit?.headers);
    const fields = parsedPath.searchParams.get("fields") ?? "";

    expect(parsedPath.origin).toBe("https://store.example.test");
    expect(parsedPath.pathname).toBe("/store/products");
    expect(parsedPath.searchParams.get("handle")).toBe("blue-mug");
    expect(fields).toBe(
      "handle,title,subtitle,description,thumbnail,images.url",
    );
    expect(fields).not.toMatch(/metadata|variant|price|inventory/);
    expect(headers.get("x-publishable-api-key")).toBe("pk_public_test_value");
    expect(headers.has("x-store-handle")).toBe(false);
    expect(requestInit).toEqual(
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
      }),
    );
  });

  it("rejects invalid and crossed detail handles before rendering", async () => {
    vi.stubEnv("VITE_MEDUSA_PUBLISHABLE_KEY", "pk_public_test_value");
    vi.stubEnv("VITE_STOREFRONT_VISUAL_PREVIEW", "false");

    await expect(
      fetchStorefrontProductDetail("../other-store"),
    ).rejects.toMatchObject({ code: "invalid_request" });

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            products: [
              {
                handle: "store-b-product",
                title: "منتج آخر",
                images: [],
              },
            ],
            count: 1,
            offset: 0,
            limit: 2,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchStorefrontProductDetail("store-a-product"),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
