import { useEffect, useMemo, useState, type ReactNode } from "react"
import { PiArrowClockwise, PiArrowRight, PiArrowsOutSimple, PiCheckBold, PiDotsThree, PiGear, PiMagnifyingGlass, PiStorefront, PiWarningCircle } from "react-icons/pi"
import { listPlatformStorefrontTemplates } from "../api"
import { CREATION_DRAFTS_CHANGED_EVENT, listCreationDrafts, draftCatalog, type CreationDraftSummary, type CreationValues } from "../creation-drafts"
import { navigateDashboardDetail } from "../routing"
import { templateDefinitions, templatesStudioVisibleKeys } from "../store-template-catalog"
import type { PlatformPortfolio, PlatformStorefrontTemplate, PlatformStorefrontTemplateKey } from "../types"
import { LiveDraftPreview } from "./AdminStorefrontEditorPage"
import { templateRuntimeCatalog, templateRuntimeProfile } from "./StorefrontPreviewPage"
import "./admin-templates-studio.css"

export { templatesStudioVisibleKeys } from "../store-template-catalog"

type AdminTemplatesStudioPageProps = {
  renderDrafts?: (query: string) => ReactNode
  error: string | null
  isDemo: boolean
  loading: boolean
  onOpenStore: (storeId: string) => void
  onCreateStore?: (templateKey: PlatformStorefrontTemplateKey, locale: "en-LY" | "ar-LY") => void
  onPreviewTemplate: (templateKey: PlatformStorefrontTemplateKey, locale: "en-LY" | "ar-LY") => void
  onRetry: () => void
  onToast: (message: string) => void
  portfolio: PlatformPortfolio | null
}

const categories = ["All templates", "Fashion", "Luxury", "Beauty", "Sports"] as const
type Category = typeof categories[number]
const categoryKeys: Record<Category, readonly PlatformStorefrontTemplateKey[]> = {
  "All templates": templatesStudioVisibleKeys,
  Fashion: ["standard", "urbx", "template-6"],
  Luxury: ["luxe-commerce-full"],
  Beauty: ["glow-beauty"],
  Sports: ["drops"],
}
const studioLabel = (key: PlatformStorefrontTemplateKey) => {
  const index = (templatesStudioVisibleKeys as readonly string[]).indexOf(key)
  return index >= 0 ? `Template ${index + 1}` : templateDefinitions[key].label
}
const previewStore = { id: "demo-store-reference", handle: "template-preview", domains: [], commerce_readiness: null }
const phonePreset = { id: "studio-phone", label: "Mobile", device: "mobile" as const, width: 430, height: 932 }

function StudioPhone({ templateKey, locale, values }: { templateKey: PlatformStorefrontTemplateKey; locale: "en-LY" | "ar-LY"; values?: CreationValues }) {
  const profile = useMemo(() => templateRuntimeProfile(templateKey), [templateKey])
  const catalog = useMemo(() => values ? draftCatalog(values, "template-preview") : templateRuntimeCatalog(templateKey), [templateKey, values])
  const configuration = useMemo(() => ({
    ...(values?.configuration ?? { name: profile.name, contact: profile.contact, brand: { ...profile.branding, favicon_url: null } }), locale,
  }), [profile, locale, values])
  const document = useMemo(() => ({
    ...(values?.document ?? { schema_version: 1 as const, template_key: templateKey, ...profile.storefront.content }),
  }), [profile, templateKey, values])
  return <LiveDraftPreview configuration={configuration} document={document} expanded originalDesignPreview={false}
    catalogOverride={catalog} preset={phonePreset} scaleMode="fit" store={previewStore} />
}

export function AdminTemplatesStudioPage({
  renderDrafts, error, isDemo, loading, onOpenStore, onCreateStore, onPreviewTemplate, onRetry, portfolio,
}: AdminTemplatesStudioPageProps) {
  const stores = useMemo(() => portfolio?.clients.flatMap(client => client.stores) ?? [], [portfolio])
  const [templates, setTemplates] = useState<PlatformStorefrontTemplate[]>(() => isDemo ? templatesStudioVisibleKeys.map(key => ({
    key, label: templateDefinitions[key].label, description: templateDefinitions[key].description, status: "active",
    assignments: { total: 0, published: 0, draft_only: 0, unpublished_changes: 0 },
  })) : [])
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "failed">(isDemo ? "ready" : "loading")
  const [catalogRetry, setCatalogRetry] = useState(0)
  const [creationPreviews, setCreationPreviews] = useState<Partial<Record<PlatformStorefrontTemplateKey, CreationValues>>>({})
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"templates" | "drafts">("templates")
  const [category, setCategory] = useState<Category>("All templates")
  const [selectedTemplate, setSelectedTemplate] = useState<PlatformStorefrontTemplateKey>("urbx")
  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [locale, setLocale] = useState<"en-LY" | "ar-LY">("en-LY")
  const [drafts, setDrafts] = useState<CreationDraftSummary[]>([])
  const [draftsLoaded, setDraftsLoaded] = useState(false)

  useEffect(() => {
    if (isDemo) return
    const controller = new AbortController()
    setCatalogState("loading")
    listPlatformStorefrontTemplates(controller.signal).then(catalog => {
      if (controller.signal.aborted) return
      const byKey = new Map(catalog.templates.map(template => [template.key, template]))
      if (templatesStudioVisibleKeys.some(key => !byKey.has(key) || !catalog.creation_previews?.[key])) throw new Error("Template catalogue is incomplete.")
      setCreationPreviews(catalog.creation_previews)
      setTemplates(templatesStudioVisibleKeys.map(key => byKey.get(key)!))
      setCatalogState("ready")
    }).catch(() => { if (!controller.signal.aborted) setCatalogState("failed") })
    return () => controller.abort()
  }, [catalogRetry, isDemo])

  useEffect(() => {
    if (isDemo) return
    let active = true
    const deleted = new Set<string>()
    const onDeleted = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id
      if (!id) return
      deleted.add(id)
      setDrafts(current => current.filter(draft => draft.id !== id))
    }
    window.addEventListener(CREATION_DRAFTS_CHANGED_EVENT, onDeleted)
    void listCreationDrafts().then(result => {
      if (active) {
        setDrafts(result.drafts.filter(draft => draft.status !== "confirmed" && !deleted.has(draft.id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
        setDraftsLoaded(true)
      }
    }).catch(() => { /* The Drafts panel shows its own loading error. */ })
    return () => { active = false; window.removeEventListener(CREATION_DRAFTS_CHANGED_EVENT, onDeleted) }
  }, [isDemo])

  const storeId = stores.some(store => store.id === selectedStoreId) ? selectedStoreId : stores[0]?.id ?? ""
  const visibleTemplates = templates.filter(template => categoryKeys[category].includes(template.key) &&
    `${studioLabel(template.key)} ${template.label} ${templateDefinitions[template.key].category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const definition = templateDefinitions[selectedTemplate]
  const latestDraft = drafts[0]

  if (error && !isDemo && !portfolio) return <section className="studio-state" role="alert"><PiWarningCircle /><h1>Templates Studio is unavailable</h1><p>{error}</p><button onClick={onRetry}>Try again</button></section>

  return <section className="admin-template-studio studio-reference" aria-labelledby="templates-studio-title">
    <header className="studio-heading">
      <p className="studio-breadcrumb">Workspace <span>/</span> Storefront experience</p>
      <h1 id="templates-studio-title">Templates Studio</h1>
      <p>Select a template to preview it on mobile.</p>
    </header>

    <div className="studio-store-controls">
      <label>Store<select aria-label="Store" value={isDemo ? "reference" : storeId} disabled={isDemo || loading || !stores.length} onChange={event => setSelectedStoreId(event.target.value)}>
        {isDemo ? <option value="reference">Reference store</option> : !stores.length ? <option value="">{loading ? "Loading stores…" : "Select a store"}</option> : stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
      </select></label>
      <button className="studio-manage" disabled={isDemo || !storeId} onClick={() => onOpenStore(storeId)}><PiGear />Manage store</button>
    </div>

    <div className="studio-library">
      <div className="studio-tabs" role="tablist" aria-label="Studio library">
        {(["templates", "drafts"] as const).map(tab => <button key={tab} type="button" role="tab" id={`studio-tab-${tab}`} aria-controls={`studio-panel-${tab}`} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1}
          onClick={() => { setActiveTab(tab); setQuery("") }}
          onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            const next = event.key === "Home" ? "templates" : event.key === "End" ? "drafts" : tab === "templates" ? "drafts" : "templates"
            setActiveTab(next); setQuery("")
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#studio-tab-${next}`)?.focus()
          }}>
          {tab === "templates" ? "Template library" : "Saved drafts"}
          {tab === "drafts" && draftsLoaded ? <span className="studio-count">{drafts.length}</span> : null}
        </button>)}
      </div>

      <div className="studio-filters">
        <label className="studio-search"><PiMagnifyingGlass /><input aria-label={`Search ${activeTab}`} placeholder={`Search ${activeTab}…`} value={query} onChange={event => setQuery(event.target.value)} /></label>
        {activeTab === "templates" ? <div className="studio-categories" aria-label="Template categories">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div> : null}
        {activeTab === "templates" ? <details className="studio-more"><summary aria-label="More library options"><PiDotsThree /></summary><div><button onClick={event => { setQuery(""); setCategory("All templates"); event.currentTarget.closest("details")?.removeAttribute("open") }}>Reset filters</button><button onClick={event => { setActiveTab("drafts"); setQuery(""); event.currentTarget.closest("details")?.removeAttribute("open") }}>View saved drafts</button></div></details> : null}
      </div>

      <div role="tabpanel" id="studio-panel-templates" aria-labelledby="studio-tab-templates" hidden={activeTab !== "templates"}>
        <span className="admin-template-studio__visually-hidden">{templates.length} available templates</span>
        {catalogState === "loading" ? <div className="studio-state" role="status"><PiArrowClockwise />Loading templates…</div> :
          catalogState === "failed" ? <div className="studio-state" role="alert"><PiWarningCircle />Templates could not be loaded.<button onClick={() => setCatalogRetry(value => value + 1)}>Try again</button></div> :
          <div className="studio-gallery">{visibleTemplates.map(template => <button type="button" key={template.key} className="studio-card" aria-pressed={selectedTemplate === template.key} onClick={() => setSelectedTemplate(template.key)}>
            <div className="studio-card-image"><img src={templateDefinitions[template.key].image} alt="" loading="lazy" decoding="async" />{selectedTemplate === template.key ? <span className="studio-selected"><PiCheckBold /></span> : null}</div>
            <div className="studio-card-copy"><strong>{studioLabel(template.key)}</strong><span>{templateDefinitions[template.key].category}</span></div>
          </button>)}
          {!visibleTemplates.length ? <p className="studio-state">No templates match your search or category.</p> : null}</div>}
      </div>
      <div role="tabpanel" id="studio-panel-drafts" aria-labelledby="studio-tab-drafts" hidden={activeTab !== "drafts"}>
        {activeTab === "drafts" ? renderDrafts?.(query) ?? <p className="studio-state">No saved drafts in reference mode.</p> : null}
      </div>
      {activeTab === "templates" && latestDraft ? <div className="studio-resume"><PiStorefront /><div><strong>Continue where you left off</strong><p>{latestDraft.name}<span> · {latestDraft.owner_name || "Owner needed"}</span></p></div><button onClick={() => navigateDashboardDetail("storefronts", latestDraft.id)}>Resume setup <PiArrowRight /></button></div> : null}
    </div>

    <aside className="studio-preview" aria-label="Mobile template preview">
      <header><h2>Mobile preview</h2><div className="studio-languages" aria-label="Preview language"><button aria-pressed={locale === "en-LY"} onClick={() => setLocale("en-LY")}>EN</button><span>/</span><button aria-pressed={locale === "ar-LY"} onClick={() => setLocale("ar-LY")}>AR</button></div><button className="studio-expand" aria-label="Expand template preview" onClick={() => onPreviewTemplate(selectedTemplate, locale)}><PiArrowsOutSimple /></button></header>
      <div className="studio-phone">{isDemo || creationPreviews[selectedTemplate] ? <StudioPhone key={selectedTemplate} templateKey={selectedTemplate} locale={locale} values={creationPreviews[selectedTemplate]} /> : <p className="studio-state" role="status">{catalogState === "failed" ? "The template preview is unavailable. Retry the template library." : "Loading the exact store design…"}</p>}</div>
      <div className="studio-preview-caption"><p><strong>{definition.label}</strong><span> · {definition.category}</span></p><p>Click a template to update the preview.</p></div>
      <button className="studio-create" disabled={isDemo || !onCreateStore || catalogState !== "ready"} onClick={() => onCreateStore?.(selectedTemplate, locale)}>Create store with {selectedTemplate === "urbx" ? "URBX" : studioLabel(selectedTemplate)} <PiArrowRight /></button>
    </aside>
  </section>
}
