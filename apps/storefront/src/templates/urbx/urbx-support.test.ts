import { describe, expect, it } from "vitest";
import { urbxConfirmationDesignFixture } from "../../dev/urbx-confirmation-preview";
import { urbxSupportContacts, urbxSupportOrders, urbxSupportStatus } from "./urbx-support";

describe("URBX support", () => {
  it("keeps saved merchant progress and sorts newest orders without mutating input", () => {
    const receipt = urbxConfirmationDesignFixture().order;
    const newer = { ...receipt, progress: "shipped" as const, created_at: "2026-09-06T12:00:00Z", updated_at: "2026-09-06T13:00:00Z" };
    const older = { ...newer, display_id: "old", created_at: "2026-09-05T12:00:00Z" };
    const input = [older, newer];
    const result = urbxSupportOrders(input, receipt);
    expect(result).toEqual([newer, older]);
    expect(input).toEqual([older, newer]);
    expect(urbxSupportStatus(result[0])).toBe("Shipped");
    expect(urbxSupportOrders([], null)).toEqual([]);
    expect(urbxSupportOrders([], receipt)).toEqual([receipt]);
  });

  it("creates contact drafts with the public order number only", () => {
    const links = urbxSupportContacts({ public_email: "support@example.test", public_phone: "+218 91 000 0000", whatsapp_number: "+218 91 000 0000" }, "URBX-10482");
    expect(links.whatsapp).toBe("https://wa.me/218910000000?text=Help%20with%20order%20%23URBX-10482");
    expect(links.email).toBe("mailto:support@example.test?subject=Help%20with%20order%20%23URBX-10482");
    expect(links.phone).toBe("tel:+218910000000");
  });

  it("does not invent missing contacts or allow mail header injection", () => {
    expect(urbxSupportContacts({ public_email: null, public_phone: null, whatsapp_number: null })).toEqual({ email: null, phone: null, whatsapp: null });
    expect(urbxSupportContacts({ public_email: "hello@example.test\r\nbcc:other@example.test", public_phone: "---", whatsapp_number: "123" }).email).toBeNull();
    expect(urbxSupportContacts({ public_email: "hello%0A@example.test", public_phone: null, whatsapp_number: null }).email).toBe("mailto:hello%250A@example.test?subject=Store%20support");
  });
});
