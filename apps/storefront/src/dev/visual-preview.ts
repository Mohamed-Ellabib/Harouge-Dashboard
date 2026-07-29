import type {
  StorefrontCatalogOrder,
  StorefrontCatalogPageDto,
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontProfileDto,
} from "../types";

const previewProfile: StorefrontProfileDto = {
  name: "متجر نواة",
  handle: "nawa",
  domain: "nawa.ly",
  branding: {
    logo_url: null,
    primary_color: "#1455e6",
  },
};

const previewProducts: StorefrontProductDetailDto[] = [
  {
    handle: "quiet-candle",
    title: "شمعة هادئة",
    subtitle: "رائحة دافئة لأوقات أكثر هدوءاً",
    description:
      "شمعة بتفاصيل بسيطة ورائحة متوازنة تضيف دفئاً هادئاً إلى مساحتك. صُممت لتناسب لحظات القراءة والاسترخاء والاستخدام اليومي.",
    thumbnail_url: "/assets/preview/candle.png",
    image_urls: ["/assets/preview/candle.png"],
  },
  {
    handle: "ceramic-vase",
    title: "مزهرية سيراميك",
    subtitle: "قطعة ناعمة بملمس طبيعي",
    description:
      "مزهرية سيراميك ذات حضور هادئ وخطوط عضوية. تعمل كقطعة مستقلة أو مع تنسيق بسيط من الزهور الجافة.",
    thumbnail_url: "/assets/preview/vase.png",
    image_urls: ["/assets/preview/vase.png"],
  },
  {
    handle: "blue-mug",
    title: "كوب أزرق",
    subtitle: "تصميم يومي بلون غني",
    description:
      "كوب عملي بسطح لامع ومقبض مريح، مصنوع للاستخدام اليومي ويضيف لمسة لون واضحة إلى طاولة القهوة.",
    thumbnail_url: "/assets/preview/mug.png",
    image_urls: ["/assets/preview/mug.png"],
  },
  {
    handle: "linen-cushion",
    title: "وسادة كتان",
    subtitle: "نسيج مريح بدرجة محايدة",
    description:
      "وسادة كتان ناعمة بدرجة محايدة تناسب المساحات الهادئة. خامتها الملموسة تمنح الأريكة أو المقعد طبقة مريحة ومتوازنة.",
    thumbnail_url: "/assets/preview/cushion.png",
    image_urls: ["/assets/preview/cushion.png"],
  },
];

const toCard = (
  product: StorefrontProductDetailDto,
): StorefrontProductCardDto => ({
  handle: product.handle,
  title: product.title,
  subtitle: product.subtitle,
  thumbnail_url: product.thumbnail_url,
});

const comparePreviewProducts = (
  first: StorefrontProductDetailDto,
  second: StorefrontProductDetailDto,
  order: StorefrontCatalogOrder | undefined,
): number => {
  if (order === "title" || order === "-title") {
    const comparison = first.title.localeCompare(second.title, "ar");
    return order === "-title" ? -comparison : comparison;
  }

  return 0;
};

export const getVisualPreviewProfile = (): StorefrontProfileDto => ({
  ...previewProfile,
  branding: { ...previewProfile.branding },
});

export const getVisualPreviewCatalog = (input: {
  limit: number;
  offset: number;
  q?: string;
  order?: StorefrontCatalogOrder;
}): StorefrontCatalogPageDto => {
  const query = input.q?.toLocaleLowerCase("ar");
  const filtered = previewProducts
    .filter((product) => {
      if (!query) {
        return true;
      }

      return `${product.title} ${product.subtitle ?? ""}`
        .toLocaleLowerCase("ar")
        .includes(query);
    })
    .sort((first, second) =>
      comparePreviewProducts(first, second, input.order),
    );

  if (input.order === "-created_at") {
    filtered.reverse();
  }

  return {
    products: filtered
      .slice(input.offset, input.offset + input.limit)
      .map(toCard),
    count: filtered.length,
    offset: input.offset,
    limit: input.limit,
  };
};

export const getVisualPreviewProduct = (
  handle: string,
): StorefrontProductDetailDto | null => {
  const product = previewProducts.find((entry) => entry.handle === handle);

  return product
    ? {
        ...product,
        image_urls: [...product.image_urls],
      }
    : null;
};
