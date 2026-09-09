import { describe, expect, it } from "vitest";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import { parseStorefrontEditorPreviewProfile } from "../../editor-preview";
import { urbxHomeContent } from "./urbx-home-content";

describe("URBX independent home content", () => {
  it("round-trips editable home copy and assets without changing the welcome", () => {
    const profile = getVisualPreviewProfile("?preview=1&template=urbx");
    const welcome = structuredClone(profile.storefront!.content.hero);
    profile.storefront!.content.home!.heading.en = "YOUR NEXT DROP";
    profile.storefront!.content.home!.image_url = "/assets/custom-home.webp";
    const mapped = parseStorefrontEditorPreviewProfile(profile)!;
    expect(mapped.storefront!.content.home!.heading.en).toBe("YOUR NEXT DROP");
    expect(mapped.storefront!.content.home!.image_url).toBe("/assets/custom-home.webp");
    expect(mapped.storefront!.content.hero).toEqual(welcome);
    expect(mapped.storefront!.content.brands.items).toHaveLength(4);
    expect(urbxHomeContent.heading.en).toBe("URBAN VIBES.");
  });
  it("accepts older drafts and rejects malformed home content", () => {
    const profile = getVisualPreviewProfile("?preview=1&template=urbx");
    delete profile.storefront!.content.home;
    expect(parseStorefrontEditorPreviewProfile(profile)).not.toBeNull();
    profile.storefront!.content.home = structuredClone(urbxHomeContent);
    profile.storefront!.content.home.image_url = "javascript:alert(1)";
    expect(parseStorefrontEditorPreviewProfile(profile)).toBeNull();
    profile.storefront!.content.home = structuredClone(urbxHomeContent);
    profile.storefront!.content.home.heading.en = "<script>bad</script>";
    expect(parseStorefrontEditorPreviewProfile(profile)).toBeNull();
  });
});
