import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyWelcomePage } from "./GlowBeautyWelcomePage";

describe("Glow Beauty welcome preview", () => {
  it("renders the supplied natural glow campaign composition", () => {
    const html = renderToStaticMarkup(<GlowBeautyWelcomePage />);

    expect(html).toContain("GLOW BEAUTY");
    expect(html).toContain("DISCOVER YOUR");
    expect(html).toContain("NATURAL GLOW");
    expect(html).toContain("Premium beauty essentials curated for");
    expect(html).toContain("EXPLORE BEAUTY");
    expect(html).toContain("welcome-campaign-v2.png");
  });
});
