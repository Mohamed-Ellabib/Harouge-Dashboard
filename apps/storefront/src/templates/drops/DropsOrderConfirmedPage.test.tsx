import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DropsOrderConfirmedPage } from "./DropsOrderConfirmedPage";

describe("DropsOrderConfirmedPage", () => {
  it("renders the complete mock DROPS order-confirmation experience", () => {
    const markup = renderToStaticMarkup(<DropsOrderConfirmedPage />);

    expect(markup).toContain("Order Confirmed");
    expect(markup).toContain("Your order is confirmed!");
    expect(markup).toContain("#DRP-28491");
    expect(markup).toContain("Sep 4–6");
    expect(markup).toContain("3 pairs of sneakers");
    expect(markup).toContain("$1,785.00");
    expect(markup).toContain("Track Order");
    expect(markup).toContain("order-confirmation-hero.png");
  });
});
