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

const publishedStorefront = {
  schema_version: 1,
  template_key: "modern-market",
  content: {
    navigation: {
      items: [
        { key: "orders", label: { ar: "طلباتي", en: "My orders" }, enabled: true },
        { key: "home", label: { ar: "البداية", en: "Main" }, enabled: true },
        { key: "categories", label: { ar: "الأقسام", en: "Categories" }, enabled: true },
        { key: "favorites", label: { ar: "المفضلة", en: "Favorites" }, enabled: false },
        { key: "cart", label: { ar: "السلة", en: "Cart" }, enabled: false },
        { key: "account", label: { ar: "الحساب", en: "Account" }, enabled: false },
        { key: "settings", label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
      ],
    },
    hero: {
      eyebrow: { ar: "أهلاً بك", en: "Welcome" },
      heading: { ar: "اختيارات يومية", en: "Everyday essentials" },
      subheading: { ar: "تسوق بثقة.", en: "Shop with confidence." },
      cta_label: { ar: "تسوق الآن", en: "Shop now" },
      cta_target: "catalog",
      image_url: "/images/hero.png",
      slides: [{
        id: "hero-slide-1",
        image_url: "/images/hero.png",
        alt: { ar: "واجهة المتجر", en: "Store hero" },
        enabled: true,
      }],
      buttons: [{
        id: "hero-button-1",
        label: { ar: "تسوق الآن", en: "Shop now" },
        href: "/products",
        background_color: "#B77F3F",
        text_color: "#FFFFFF",
        style: "solid",
        enabled: true,
      }],
      benefits: [{
        id: "hero-benefit-1",
        icon: "shield",
        title: { ar: "ضمان", en: "Warranty" },
        subtitle: { ar: "تغطية موثوقة", en: "Trusted coverage" },
      }],
    },
    brands: {
      heading: { ar: "علاماتنا", en: "Our brands" },
      subheading: { ar: "مختارات موثوقة", en: "A trusted selection" },
      items: [
        { id: "brand-text", name: { ar: "علامة نصية", en: "Text Brand" }, slug: "text-brand", image_url: null },
        { id: "brand-image", name: { ar: "علامة مصورة", en: "Image Brand" }, slug: "image-brand", image_url: "/images/image-brand.webp" },
      ],
    },
    about: {
      title: { ar: "من نحن", en: "About us" },
      body: { ar: "متجر محلي موثوق.", en: "A trusted local store." },
    },
    contact: {
      heading: { ar: "تواصل معنا", en: "Contact us" },
      body: { ar: "يسعدنا مساعدتك.", en: "We are happy to help." },
    },
    policies: {
      delivery: {
        title: { ar: "التوصيل", en: "Delivery" },
        body: { ar: "توصيل داخل ليبيا.", en: "Delivery within Libya." },
      },
      returns: {
        title: { ar: "الإرجاع", en: "Returns" },
        body: { ar: "تواصل معنا للإرجاع.", en: "Contact us for returns." },
      },
      privacy: {
        title: { ar: "الخصوصية", en: "Privacy" },
        body: { ar: "نحترم خصوصيتك.", en: "We respect your privacy." },
      },
      terms: {
        title: { ar: "الشروط", en: "Terms" },
        body: { ar: "شروط المتجر المنشورة.", en: "The store's published terms." },
      },
    },
  },
} as const;

describe("storefront response allowlists", () => {
  it("maps a profile to the exact public DTO and discards private fields", () => {
    const mapped = mapStorefrontProfileResponse({
      vendor: {
        id: "internal-vendor-id",
        name: "  متجر الاختبار  ",
        handle: "test-store",
        domain: "SHOP.EXAMPLE.TEST.",
        locale: "en-LY",
        contact: {
          public_email: "hello@example.test",
          public_phone: "+218 91 234 5678",
          whatsapp_number: "+218 92 345 6789",
          private_contact_note: "discard me",
        },
        contact_email: "private@example.test",
        metadata: { tenant_id: "tenant-private" },
        branding: {
          logo_url: "/images/logo.png",
          primary_color: "#1455E6",
          secondary_color: "#F2B134",
          typography_key: "cairo",
          arbitrary_css: "body { display: none }",
        },
        storefront: {
          ...publishedStorefront,
          revision: 42,
          bank_transfer: { account_reference: "must-not-reach-browser" },
          content: {
            ...publishedStorefront.content,
            bank_instructions: "must-not-reach-browser",
          },
        },
      },
    });

    expect(mapped).toEqual({
      name: "متجر الاختبار",
      handle: "test-store",
      domain: "shop.example.test",
      locale: "en-LY",
      contact: {
        public_email: "hello@example.test",
        public_phone: "+218 91 234 5678",
        whatsapp_number: "+218 92 345 6789",
      },
      branding: {
        logo_url: "/images/logo.png",
        primary_color: "#1455e6",
        secondary_color: "#f2b134",
        typography_key: "cairo",
      },
      storefront: {
        ...publishedStorefront,
        content: {
          ...publishedStorefront.content,
          hero: {
            ...publishedStorefront.content.hero,
            buttons: [{
              ...publishedStorefront.content.hero.buttons[0],
              background_color: "#b77f3f",
              text_color: "#ffffff",
            }],
          },
        },
      },
    });
    expect(JSON.stringify(mapped)).not.toContain("private");
    expect(JSON.stringify(mapped)).not.toContain("metadata");
    expect(JSON.stringify(mapped)).not.toContain("arbitrary_css");
    expect(JSON.stringify(mapped)).not.toContain("bank");
    expect(JSON.stringify(mapped)).not.toContain("revision");
  });

  it("fails closed for unallowlisted Store locale, typography, contact, or brand color", () => {
    const profile = {
      vendor: {
        name: "Store",
        handle: "store",
        domain: "store.example.test",
        locale: "ar-LY",
        contact: {
          public_email: null,
          public_phone: null,
          whatsapp_number: null,
        },
        branding: {
          logo_url: null,
          primary_color: "#1455e6",
          secondary_color: null,
          typography_key: "cairo",
        },
        storefront: publishedStorefront,
      },
    };

    expect(() =>
      mapStorefrontProfileResponse({
        vendor: { ...profile.vendor, locale: "fr-FR" },
      }),
    ).toThrowError(StorefrontApiError);
    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...profile.vendor,
          branding: { ...profile.vendor.branding, typography_key: "script" },
        },
      }),
    ).toThrowError(StorefrontApiError);
    expect(() =>
      mapStorefrontProfileResponse({
        vendor: { ...profile.vendor, contact: { public_email: null } },
      }),
    ).toThrowError(StorefrontApiError);
    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...profile.vendor,
          branding: {
            ...profile.vendor.branding,
            secondary_color: "url(javascript:alert(1))",
          },
        },
      }),
    ).toThrowError(StorefrontApiError);
  });

  it("accepts an unpublished storefront without inventing public content", () => {
    const mapped = mapStorefrontProfileResponse({
      vendor: {
        name: "Store",
        handle: "store",
        domain: "store.example.test",
        locale: "ar-LY",
        contact: {
          public_email: null,
          public_phone: null,
          whatsapp_number: null,
        },
        branding: {
          logo_url: null,
          primary_color: null,
          secondary_color: null,
          typography_key: "cairo",
        },
        storefront: null,
      },
    });

    expect(mapped.storefront).toBeNull();
    expect(JSON.stringify(mapped)).not.toContain("default-storefront");
  });

  it("fails closed for an unknown template or unsafe published content", () => {
    const base = {
      name: "Store",
      handle: "store",
      domain: "store.example.test",
      locale: "ar-LY",
      contact: {
        public_email: null,
        public_phone: null,
        whatsapp_number: null,
      },
      branding: {
        logo_url: null,
        primary_color: null,
        secondary_color: null,
        typography_key: "cairo",
      },
    };

    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...base,
          storefront: { ...publishedStorefront, template_key: "merchant-code" },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "storefront_setup" }));

    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...base,
          storefront: {
            ...publishedStorefront,
            content: {
              ...publishedStorefront.content,
              about: {
                ...publishedStorefront.content.about,
                body: { ar: "<script>bad</script>", en: "Unsafe" },
              },
            },
          },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "storefront_setup" }));

    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...base,
          storefront: {
            ...publishedStorefront,
            content: {
              ...publishedStorefront.content,
              hero: {
                ...publishedStorefront.content.hero,
                heading: { ar: "عنوان\nآخر", en: "Two\nlines" },
              },
            },
          },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "storefront_setup" }));

    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...base,
          storefront: {
            ...publishedStorefront,
            content: {
              ...publishedStorefront.content,
              hero: {
                ...publishedStorefront.content.hero,
                benefits: [{
                  ...publishedStorefront.content.hero.benefits[0],
                  icon: "arbitrary-svg",
                }],
              },
            },
          },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "storefront_setup" }));

    expect(() =>
      mapStorefrontProfileResponse({
        vendor: {
          ...base,
          storefront: {
            ...publishedStorefront,
            content: {
              ...publishedStorefront.content,
              brands: {
                ...publishedStorefront.content.brands,
                items: [{
                  ...publishedStorefront.content.brands.items[0],
                  image_url: "javascript:alert(1)",
                }],
              },
            },
          },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "storefront_setup" }));
  });

  it("maps safe catalog merchandising without retaining ids, metadata, or variant internals", () => {
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
            storefront_category: "Home",
            storefront_badge: "NEW",
            storefront_compare_at_price_lyd: 120,
            variants: [{ calculated_price: { currency_code: "lyd", calculated_amount: 95 }, prices: [{ amount: 999_999 }] }],
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
          price_lyd: 95,
          compare_at_price_lyd: 120,
          badge: "NEW",
          category: "Home",
        },
      ],
      count: 1,
      offset: 0,
      limit: 12,
    });
    expect(JSON.stringify(mapped)).not.toMatch(
      /prod_internal|metadata|variant|private|999999/,
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
        payment_methods: ["cod", "bank_transfer"],
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
            available_for_sale: false,
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
        payment_methods: ["cod", "bank_transfer"],
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
          available_for_sale: false,
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
              variant_title: "M / Black",
              product_handle: "quiet-vase",
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
          payment: {
            method: "cod",
            status: "pending_fulfillment",
          },
          shipping_address: { address_1: "private" },
          payment_collections: [{ id: "private" }],
        },
      },
      "lyd",
    );

    expect(cart).toMatchObject({
      id: "cart_public_reference",
      items: [expect.objectContaining({ total: 120, variant_title: "M / Black", product_handle: "quiet-vase" })],
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
      payment: { method: "cod", status: "pending_fulfillment" },
    });
    expect(JSON.stringify({ cart, shipping, confirmation })).not.toMatch(
      /provider_private|collection_private|session_private|customer_private|order_private|address_1|metadata/,
    );
  });

  it("accepts only a reduced post-order bank transfer confirmation", () => {
    const confirmation = mapStorefrontOrderConfirmationResponse(
      {
        type: "order",
        order: {
          display_id: 43,
          currency_code: "lyd",
          items: [
            {
              title: "Test item",
              quantity: 1,
              unit_price: 100,
              total: 100,
            },
          ],
          item_subtotal: 100,
          shipping_total: 10,
          total: 110,
          payment: {
            method: "bank_transfer",
            status: "pending_verification",
            bank_transfer: {
              bank_name: "Test Bank",
              account_holder_name: "Test Store",
              account_reference: "ORDER-43",
              instructions: "Use the order number.",
              configuration_revision: "private",
            },
          },
        },
      },
      "lyd",
    );

    expect(confirmation.payment).toEqual({
      method: "bank_transfer",
      status: "pending_verification",
      bank_transfer: {
        bank_name: "Test Bank",
        account_holder_name: "Test Store",
        account_reference: "ORDER-43",
        instructions: "Use the order number.",
      },
    });
    expect(JSON.stringify(confirmation)).not.toContain("configuration_revision");
    expect(() =>
      mapStorefrontOrderConfirmationResponse(
        {
          type: "order",
          order: {
            display_id: 44,
            currency_code: "lyd",
            items: [
              { title: "Test item", quantity: 1, unit_price: 100, total: 100 },
            ],
            item_subtotal: 100,
            shipping_total: 10,
            total: 110,
            payment: {
              method: "bank_transfer",
              status: "pending_verification",
            },
          },
        },
        "lyd",
      ),
    ).toThrowError(StorefrontApiError);
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
                storefront_category: "Home",
                storefront_badge: "NEW",
                storefront_compare_at_price_lyd: 180,
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
      badge: "NEW",
      category: "Home",
      compare_at_price_lyd: 180,
    });
    expect(JSON.stringify(detail)).not.toMatch(
      /prod_internal|image_internal|metadata|secret|variant|1500/,
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
      "handle,title,subtitle,description,thumbnail,images.url,+metadata",
    );
    expect(fields).not.toMatch(/variant|price|inventory/);
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
