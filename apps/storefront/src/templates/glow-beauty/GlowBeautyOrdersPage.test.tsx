import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyOrdersPage } from "./GlowBeautyOrdersPage";

describe("Glow Beauty orders preview", () => {
  it("renders the supplied order history composition", () => {
    const html = renderToStaticMarkup(<GlowBeautyOrdersPage />);

    expect(html).toContain("My Orders");
    expect(html).toContain("Order #GLW-28451");
    expect(html).toContain("IN TRANSIT");
    expect(html).toContain("Order #GLW-28398");
    expect(html).toContain("Recent Orders");
    expect(html).toContain("Order #GLW-27812");
    expect(html).toContain("Delivered Aug 21");
  });
});
