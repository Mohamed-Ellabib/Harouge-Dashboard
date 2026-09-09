import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AdminTemplatesStudioPage, templatesStudioVisibleKeys } from "./AdminTemplatesStudioPage"

describe("AdminTemplatesStudioPage", () => {
  it("shows only the owner-selected templates in the Studio catalog", () => {
    const markup = renderToStaticMarkup(
      <AdminTemplatesStudioPage
        error={null}
        isDemo
        loading={false}
        onOpenStore={() => undefined}
        onPreviewTemplate={() => undefined}
        onRetry={() => undefined}
        onToast={() => undefined}
        portfolio={null}
      />,
    )

    expect(templatesStudioVisibleKeys).toEqual(["drops", "luxe-commerce-full", "standard", "glow-beauty", "urbx", "template-6"])
    for (let number = 1; number <= 6; number += 1) {
      expect(markup).toContain(`<strong>Template ${number}</strong>`)
    }
    expect(markup).toContain("<h2>Mobile preview</h2>")
    expect(markup).toContain("Create store with URBX")
    expect(markup).toContain("6 available templates")
    for (const key of templatesStudioVisibleKeys) {
      expect(markup).toContain(key === "template-6" ? "/assets/admin/templates/template-6-welcome.jpg" : `/assets/admin/templates/${key === "urbx" ? "urbx-welcome" : `${key}-commercial`}.png`)
    }
    expect(markup).not.toContain(">Luxe Commerce<")
    expect(markup).not.toContain("Modern Market")
    expect(markup).not.toContain("Home &amp; Living")
  })
})
