import { afterEach, describe, expect, it, vi } from "vitest"
import { CREATION_DRAFTS_CHANGED_EVENT, deleteCreationDraft } from "./creation-drafts"

afterEach(() => vi.unstubAllGlobals())
describe("permanent creation-draft deletion", () => {
  it("sends the reviewed revision and updates Studio only after success", async () => {
    const dispatchEvent = vi.fn()
    vi.stubGlobal("window", { dispatchEvent })
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "stdraft-check", deleted: true })))
    vi.stubGlobal("fetch", fetch)
    await deleteCreationDraft("stdraft-check", 4)
    expect(fetch).toHaveBeenCalledWith("/admin/saas/creation-drafts/stdraft-check", expect.objectContaining({ method: "DELETE", credentials: "include", body: JSON.stringify({ revision: 4 }) }))
    expect(dispatchEvent).toHaveBeenCalledOnce()
    expect(dispatchEvent.mock.calls[0][0]).toMatchObject({ type: CREATION_DRAFTS_CHANGED_EVENT, detail: { id: "stdraft-check" } })
  })
  it("keeps the draft in Studio when deletion is rejected", async () => {
    const dispatchEvent = vi.fn()
    vi.stubGlobal("window", { dispatchEvent })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Draft changed. Reload before deleting." }), { status: 409 })))
    await expect(deleteCreationDraft("stdraft-check", 4)).rejects.toThrow("Draft changed")
    expect(dispatchEvent).not.toHaveBeenCalled()
  })
})
