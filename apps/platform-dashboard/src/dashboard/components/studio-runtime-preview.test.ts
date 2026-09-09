import { describe, expect, it } from "vitest"
import { mapStorefrontProfileResponse } from "../../../../storefront/src/api/storefront-api"
import { parseStorefrontEditorPreviewCatalog } from "../../../../storefront/src/editor-preview"
import { templateRuntimeCatalog, templateRuntimeProfile } from "./StorefrontPreviewPage"
import { templatesStudioVisibleKeys } from "../store-template-catalog"

describe("Studio mobile previews", () => {
  for (const key of templatesStudioVisibleKeys) it(`accepts the ${key} preview in the real renderer`, () => {
    expect(mapStorefrontProfileResponse({ vendor: templateRuntimeProfile(key) })).toBeTruthy()
    expect(parseStorefrontEditorPreviewCatalog(templateRuntimeCatalog(key))).not.toBeNull()
  })
})
