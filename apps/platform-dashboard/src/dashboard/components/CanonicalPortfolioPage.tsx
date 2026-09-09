import {
  ArrowDownTray,
  ArrowLeft,
  ArrowRight,
  BuildingStorefront,
  CheckCircleSolid,
  ChevronDownMini,
  CircleWarningSolid,
  Clock,
  CogSixTooth,
  Eye,
  Globe,
  GridLayout,
  Loader,
  LockClosedSolid,
  MagnifyingGlass,
  OpenRectArrowOut,
  Plus,
  ServerStack,
  ShieldCheck,
  User,
  Users,
  XMark,
} from "@medusajs/icons"
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"

import { listPlatformPortfolio, retryPlatformCommerceSetup } from "../api"
import type {
  CommerceReadinessStatus,
  PlatformClient,
  PlatformPlanCode,
  PlatformPortfolio,
  PlatformStore,
  PlatformStoreDomain,
  PlatformStoreStatus,
  PlatformTenantStatus,
  ProvisionStoreResult,
} from "../types"
import { StoreOnboardingDialog } from "./StoreOnboardingDialog"

const dateFormatter = new Intl.DateTimeFormat("ar-LY", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

const shortDateFormatter = new Intl.DateTimeFormat("ar-LY", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

const tenantStatusLabels: Record<PlatformTenantStatus, string> = {
  active: "نشط",
  suspended: "متوقف",
  archived: "مؤرشف",
}

const storeStatusLabels: Record<PlatformStoreStatus, string> = {
  active: "نشط",
  draft: "قيد التهيئة",
  suspended: "متوقف",
  archived: "مؤرشف",
}

const planLabels: Record<PlatformPlanCode, string> = {
  professional_commerce: "التجارة الاحترافية",
  starter_whatsapp: "واتساب المبدئية",
}

const readinessLabels: Record<CommerceReadinessStatus, string> = {
  ready: "جاهزة",
  pending: "بانتظار الإعداد",
  configuring: "جارٍ الإعداد",
  not_required: "غير مطلوبة",
  failed: "فشل الإعداد",
  requires_attention: "تحتاج تدخلاً",
  disabled: "معطلة",
}

const canonicalNotice =
  "هذه المحفظة تقرأ العميل والمتاجر من سجلات Tenant وStore الدائمة. سجل البائع القديم محفوظ للتوافق فقط ويُنشأ تلقائياً مع كل متجر."

const emptySummary: PlatformPortfolio["summary"] = {
  active_clients: 0,
  total_stores: 0,
  active_stores: 0,
  commerce_ready: 0,
  needs_attention: 0,
}

function formatDate(value?: string | null, short = false): string {
  if (!value) return "غير متاح"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "غير متاح"
  return (short ? shortDateFormatter : dateFormatter).format(date)
}

function primaryDomain(store: PlatformStore | null): PlatformStoreDomain | null {
  if (!store) return null
  return store.domains.find((domain) => domain.is_primary) ?? store.domains[0] ?? null
}

function openStorefrontPreview(store: PlatformStore): void {
  window.open(
    `/dashboard/storefront-preview/${encodeURIComponent(store.id)}`,
    "_blank",
    "noopener,noreferrer",
  )
}

function clientDomain(client: PlatformClient): PlatformStoreDomain | null {
  for (const store of client.stores) {
    const domain = primaryDomain(store)
    if (domain) return domain
  }
  return null
}

function clientPlanLabel(client: PlatformClient): string {
  const plans = [...new Set(client.stores.map((store) => store.plan_code))]
  if (!plans.length) return "لا توجد متاجر"
  if (plans.length === 1) return planLabels[plans[0]]
  return `${plans.length.toLocaleString("ar-LY")} خطط`
}

function uniqueMemberCount(client: PlatformClient): number {
  return new Set(
    client.stores
      .flatMap((store) => store.memberships)
      .map((membership) => membership.email || membership.id),
  ).size
}

function clientUpdatedAt(client: PlatformClient): string | null {
  const values = [client.updated_at, ...client.stores.map((store) => store.updated_at)]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter((value) => !Number.isNaN(value))
  return values.length ? new Date(Math.max(...values)).toISOString() : null
}

function readinessTone(status?: CommerceReadinessStatus): string {
  if (status === "ready" || status === "not_required") return "success"
  if (status === "failed" || status === "requires_attention" || status === "disabled") return "danger"
  return "warning"
}

function clientReadiness(client: PlatformClient): { label: string; tone: string } {
  if (!client.stores.length) return { label: "لا توجد متاجر", tone: "neutral" }
  const attention = client.stores.some((store) =>
    ["failed", "requires_attention", "disabled"].includes(
      store.commerce_readiness?.status ?? "",
    ),
  )
  if (attention) return { label: "تحتاج متابعة", tone: "danger" }
  const ready = client.stores.filter((store) => store.commerce_readiness?.status === "ready").length
  const pending = client.stores.filter((store) =>
    ["pending", "configuring"].includes(store.commerce_readiness?.status ?? ""),
  ).length
  if (pending) return { label: `${pending.toLocaleString("ar-LY")} قيد الإعداد`, tone: "warning" }
  if (ready) return { label: `${ready.toLocaleString("ar-LY")} جاهزة`, tone: "success" }
  return { label: "تصفح فقط", tone: "neutral" }
}

function makeCsv(clients: PlatformClient[]): string {
  const rows = [
    ["العميل", "مفتاح العميل", "المتجر", "المعرّف", "الخطة", "الحالة", "النطاق", "جاهزية التجارة", "بريد المالك"],
    ...clients.flatMap((client) =>
      client.stores.length
        ? client.stores.map((store) => [
            client.name,
            client.key ?? "",
            store.name,
            store.handle,
            planLabels[store.plan_code],
            storeStatusLabels[store.status],
            primaryDomain(store)?.hostname ?? "",
            readinessLabels[store.commerce_readiness?.status ?? "pending"],
            store.memberships.find((membership) => membership.role === "owner")?.email ?? "",
          ])
        : [[client.name, client.key ?? "", "", "", "", tenantStatusLabels[client.status], "", "", ""]],
    ),
  ]

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n")
}

export function CanonicalPortfolioPage() {
  const [portfolio, setPortfolio] = useState<PlatformPortfolio>({
    clients: [],
    count: 0,
    summary: emptySummary,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | PlatformTenantStatus>("all")
  const [planFilter, setPlanFilter] = useState<"all" | PlatformPlanCode>("all")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(() =>
    window.matchMedia("(min-width: 901px)").matches,
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [showMembers, setShowMembers] = useState(true)
  const [onboardingClient, setOnboardingClient] = useState<PlatformClient | null | undefined>(undefined)
  const [retryingSetupId, setRetryingSetupId] = useState<string | null>(null)

  const loadPortfolio = useCallback(async (): Promise<PlatformPortfolio> => {
    setLoading(true)
    setError(null)
    try {
      const next = await listPlatformPortfolio()
      setPortfolio(next)
      setSelectedClientId((current) =>
        current && next.clients.some((client) => client.id === current)
          ? current
          : next.clients[0]?.id ?? null,
      )
      setExpandedClientId((current) =>
        current && next.clients.some((client) => client.id === current)
          ? current
          : next.clients[0]?.id ?? null,
      )
      setSelectedStoreId((current) =>
        current && next.clients.some((client) => client.stores.some((store) => store.id === current))
          ? current
          : next.clients[0]?.stores[0]?.id ?? null,
      )
      return next
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل محفظة العملاء.")
      throw caught
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPortfolio().catch(() => undefined)
  }, [loadPortfolio])

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return portfolio.clients.filter((client) => {
      if (statusFilter !== "all" && client.status !== statusFilter) return false
      if (planFilter !== "all" && !client.stores.some((store) => store.plan_code === planFilter)) return false
      if (!normalizedQuery) return true

      return [
        client.name,
        client.key,
        ...client.stores.flatMap((store) => [
          store.name,
          store.handle,
          store.contact.public_email,
          store.contact.public_phone,
          store.contact.whatsapp_number,
          ...store.domains.map((domain) => domain.hostname),
          ...store.memberships.map((membership) => membership.email),
        ]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [planFilter, portfolio.clients, query, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize))
  const visiblePage = Math.min(page, totalPages)
  const paginatedClients = filteredClients.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  const selectedClient = portfolio.clients.find((client) => client.id === selectedClientId) ?? null
  const selectedStore =
    selectedClient?.stores.find((store) => store.id === selectedStoreId) ?? selectedClient?.stores[0] ?? null

  useEffect(() => setPage(1), [planFilter, query, statusFilter])

  const selectClient = (client: PlatformClient) => {
    setSelectedClientId(client.id)
    setSelectedStoreId(client.stores[0]?.id ?? null)
    setExpandedClientId((current) => (current === client.id ? null : client.id))
    setInspectorOpen(true)
  }

  const selectStore = (client: PlatformClient, store: PlatformStore) => {
    setSelectedClientId(client.id)
    setSelectedStoreId(store.id)
    setExpandedClientId(client.id)
    setInspectorOpen(true)
  }

  const exportPortfolio = () => {
    const blob = new Blob(["\ufeff", makeCsv(filteredClients)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `labibtech-stores-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const openCommerceWorkspace = (store: PlatformStore) => {
    window.history.pushState({}, "", `/dashboard/commerce?store=${encodeURIComponent(store.id)}`)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  const retryCommerce = async (store: PlatformStore) => {
    if (!store.commerce_setup?.id || store.commerce_setup.status !== "failed") return
    setRetryingSetupId(store.commerce_setup.id)
    setFeedback(null)
    setError(null)
    try {
      await retryPlatformCommerceSetup(store.commerce_setup.id)
      setFeedback(`اكتمل إعداد التجارة لمتجر ${store.name}.`)
      await loadPortfolio()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذرت إعادة محاولة إعداد التجارة.")
    } finally {
      setRetryingSetupId(null)
    }
  }

  const handleProvisioned = async (result: ProvisionStoreResult) => {
    const next = await loadPortfolio()
    setSelectedClientId(result.tenant_id)
    setSelectedStoreId(result.store_profile_id)
    setExpandedClientId(result.tenant_id)
    setInspectorOpen(true)
    const client = next.clients.find((candidate) => candidate.id === result.tenant_id)
    setFeedback(client ? `تمت إضافة ${result.handle} إلى ${client.name}.` : `تم إنشاء ${result.handle}.`)
  }

  const openNewClient = () => setOnboardingClient(null)
  const openNewStore = (client: PlatformClient) => setOnboardingClient(client)
  const onboardingOpen = onboardingClient !== undefined

  return (
    <div className={`portfolio-page${inspectorOpen && selectedClient ? " has-inspector" : ""}`}>
      {inspectorOpen && selectedClient ? (
        <ClientInspector
          client={selectedClient}
          store={selectedStore}
          retryingSetupId={retryingSetupId}
          onClose={() => setInspectorOpen(false)}
          onSelectStore={(store) => selectStore(selectedClient, store)}
          onAddStore={() => openNewStore(selectedClient)}
          onOpenWorkspace={(store) => openCommerceWorkspace(store)}
          onRetryCommerce={(store) => void retryCommerce(store)}
          onPreviewStore={openStorefrontPreview}
        />
      ) : null}

      <main className="portfolio-main">
        <header className="portfolio-heading">
          <div>
            <h1>محفظة العملاء والمتاجر</h1>
            <p>إنشاء العملاء وإدارة متاجرهم وهوياتهم وجاهزية تجارتهم من سجل موحّد</p>
            <div className="compatibility-notice" role="note">
              <ShieldCheck aria-hidden="true" /><span>{canonicalNotice}</span>
            </div>
          </div>
          <div className="portfolio-heading__actions">
            <button className="secondary-action" type="button" disabled={!selectedClient} onClick={() => selectedClient && openNewStore(selectedClient)}>
              <BuildingStorefront /> إضافة متجر للعميل
            </button>
            <button className="primary-action" type="button" onClick={openNewClient}>
              <Plus /> عميل ومتجر جديد
            </button>
          </div>
        </header>

        <section className="portfolio-summary" aria-label="ملخص المحفظة">
          <SummaryItem icon={<Users />} label="العملاء النشطون" value={portfolio.summary.active_clients} tone="blue" />
          <SummaryItem icon={<BuildingStorefront />} label="إجمالي المتاجر" value={portfolio.summary.total_stores} detail={`${portfolio.summary.active_stores.toLocaleString("ar-LY")} نشطة`} tone="cyan" />
          <SummaryItem icon={<CheckCircleSolid />} label="التجارة الجاهزة" value={portfolio.summary.commerce_ready} tone="success" />
          <SummaryItem icon={<CircleWarningSolid />} label="تحتاج متابعة" value={portfolio.summary.needs_attention} tone="danger" />
        </section>

        <section className="portfolio-table-panel" aria-label="سجل العملاء والمتاجر">
          <div className="portfolio-toolbar">
            <label className="portfolio-search">
              <MagnifyingGlass />
              <input aria-label="بحث في العملاء والمتاجر" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في العملاء أو المتاجر أو النطاقات" />
            </label>
            <select aria-label="تصفية حالة العميل" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">كل حالات العملاء</option>
              <option value="active">نشط</option>
              <option value="suspended">متوقف</option>
              <option value="archived">مؤرشف</option>
            </select>
            <select aria-label="تصفية الخطة" value={planFilter} onChange={(event) => setPlanFilter(event.target.value as typeof planFilter)}>
              <option value="all">كل الخطط</option>
              <option value="professional_commerce">التجارة الاحترافية</option>
              <option value="starter_whatsapp">واتساب المبدئية</option>
            </select>
            <div className="portfolio-toolbar__spacer" />
            <button type="button" onClick={() => setColumnsOpen((open) => !open)} aria-expanded={columnsOpen}><GridLayout /> أعمدة</button>
            <button type="button" onClick={exportPortfolio} disabled={!filteredClients.length}><ArrowDownTray /> تصدير</button>
            {columnsOpen ? (
              <div className="columns-popover">
                <label><input type="checkbox" checked={showMembers} onChange={(event) => setShowMembers(event.target.checked)} /> حسابات البائعين</label>
              </div>
            ) : null}
          </div>

          {error ? <div className="portfolio-error" role="alert"><CircleWarningSolid /><span>{error}</span><button type="button" onClick={() => void loadPortfolio().catch(() => undefined)}>إعادة المحاولة</button></div> : null}
          {feedback ? <div className="portfolio-feedback" role="status"><CheckCircleSolid /><span>{feedback}</span><button type="button" onClick={() => setFeedback(null)} aria-label="إغلاق الرسالة"><XMark /></button></div> : null}

          <div className="portfolio-table-scroll">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th className="selection-cell">التفاصيل</th>
                  <th>العميل</th>
                  <th>المتاجر</th>
                  <th>الخطط</th>
                  <th>النطاق الرئيسي</th>
                  <th>جاهزية التجارة</th>
                  {showMembers ? <th>حسابات البائعين</th> : null}
                  <th>آخر تحديث</th>
                  <th>الحالة</th>
                  <th className="actions-cell">إضافة</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={10} className="portfolio-table-state"><Loader className="spin" /> جارٍ تحميل المحفظة...</td></tr> : null}
                {!loading && !paginatedClients.length ? (
                  <tr><td colSpan={10} className="portfolio-table-state"><BuildingStorefront /><strong>{portfolio.clients.length ? "لا توجد نتائج مطابقة" : "لم تتم إضافة أي عميل بعد"}</strong><span>{portfolio.clients.length ? "غيّر البحث أو عوامل التصفية." : "ابدأ بإنشاء أول عميل ومتجر حقيقي."}</span>{!portfolio.clients.length ? <button className="primary-action" type="button" onClick={openNewClient}><Plus /> عميل ومتجر جديد</button> : null}</td></tr>
                ) : null}
                {!loading ? paginatedClients.map((client) => (
                  <ClientRows
                    key={client.id}
                    client={client}
                    selectedClientId={selectedClientId}
                    selectedStoreId={selectedStoreId}
                    expanded={client.id === expandedClientId}
                    showMembers={showMembers}
                    retryingSetupId={retryingSetupId}
                    onSelect={() => selectClient(client)}
                    onSelectStore={(store) => selectStore(client, store)}
                    onAddStore={() => openNewStore(client)}
                    onOpenWorkspace={openCommerceWorkspace}
                    onRetryCommerce={(store) => void retryCommerce(store)}
                    onPreviewStore={openStorefrontPreview}
                  />
                )) : null}
              </tbody>
            </table>
          </div>

          <footer className="portfolio-pagination">
            <span>عرض {filteredClients.length ? (visiblePage - 1) * pageSize + 1 : 0} – {Math.min(visiblePage * pageSize, filteredClients.length)} من {filteredClients.length} عميل</span>
            <div className="pagination-buttons">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1} aria-label="الصفحة السابقة"><ArrowRight /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === visiblePage ? "is-active" : ""} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={visiblePage === totalPages} aria-label="الصفحة التالية"><ArrowLeft /></button>
            </div>
            <label><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select> لكل صفحة</label>
          </footer>
        </section>
      </main>

      <StoreOnboardingDialog
        open={onboardingOpen}
        existingClient={onboardingClient ?? null}
        onClose={() => setOnboardingClient(undefined)}
        onProvisioned={handleProvisioned}
      />
    </div>
  )
}

function SummaryItem({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: number; detail?: string; tone: string }) {
  return <div className={`summary-item summary-item--${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value.toLocaleString("ar-LY")}</strong>{detail ? <em>{detail}</em> : null}</div></div>
}

type ClientRowsProps = {
  client: PlatformClient
  selectedClientId: string | null
  selectedStoreId: string | null
  expanded: boolean
  showMembers: boolean
  retryingSetupId: string | null
  onSelect: () => void
  onSelectStore: (store: PlatformStore) => void
  onAddStore: () => void
  onOpenWorkspace: (store: PlatformStore) => void
  onRetryCommerce: (store: PlatformStore) => void
  onPreviewStore: (store: PlatformStore) => void
}

function ClientRows({ client, selectedClientId, selectedStoreId, expanded, showMembers, retryingSetupId, onSelect, onSelectStore, onAddStore, onOpenWorkspace, onRetryCommerce, onPreviewStore }: ClientRowsProps) {
  const domain = clientDomain(client)
  const readiness = clientReadiness(client)
  const colSpan = 9 + Number(showMembers)
  const firstStore = client.stores[0] ?? null

  return <>
    <tr className={`client-row${selectedClientId === client.id ? " is-selected" : ""}`} onClick={onSelect}>
      <td className="selection-cell"><button className={`row-disclosure${expanded ? " is-open" : ""}`} type="button" aria-label={`${expanded ? "إخفاء" : "عرض"} متاجر ${client.name}`} aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); onSelect() }}><ChevronDownMini /></button></td>
      <td><div className="client-identity"><span className="client-mark" style={{ "--client-color": firstStore?.brand?.primary_color || "#008cff" } as CSSProperties}>{firstStore?.brand?.logo_url ? <img src={firstStore.brand.logo_url} alt="" /> : <Users />}</span><div><strong>{client.name}</strong><small dir="ltr">{client.key || client.id}</small></div></div></td>
      <td><strong className="store-count-value">{client.stores.length.toLocaleString("ar-LY")}</strong></td>
      <td>{clientPlanLabel(client)}</td>
      <td>{domain ? <span className="domain-cell"><LockClosedSolid /><span dir="ltr">{domain.hostname}</span></span> : <span className="muted-value">لم يُربط</span>}</td>
      <td><span className={`readiness-badge readiness-badge--${readiness.tone}`}>{readiness.label}</span></td>
      {showMembers ? <td><span className="member-count"><Users /> {uniqueMemberCount(client).toLocaleString("ar-LY")}</span></td> : null}
      <td>{formatDate(clientUpdatedAt(client), true)}</td>
      <td><span className={`status status--${client.status}`}><i />{tenantStatusLabels[client.status]}</span></td>
      <td className="actions-cell"><button type="button" onClick={(event) => { event.stopPropagation(); onAddStore() }} aria-label={`إضافة متجر إلى ${client.name}`}><Plus /></button></td>
    </tr>
    {expanded ? <tr className="expanded-store-row"><td colSpan={colSpan}>
      {client.stores.length ? <table><thead><tr><th>المتجر</th><th>الخطة</th><th>النطاق</th><th>النطاق وSSL</th><th>جاهزية التجارة</th><th>المنتجات</th><th>المالك</th><th>آخر تحديث</th><th>الإجراءات</th></tr></thead><tbody>
        {client.stores.map((store) => <StoreRow key={store.id} store={store} selected={store.id === selectedStoreId} retrying={store.commerce_setup?.id === retryingSetupId} onSelect={() => onSelectStore(store)} onOpenWorkspace={() => onOpenWorkspace(store)} onRetryCommerce={() => onRetryCommerce(store)} onPreview={() => onPreviewStore(store)} />)}
      </tbody></table> : <div className="client-no-stores"><BuildingStorefront /><span>لا توجد متاجر مرتبطة بهذا العميل.</span><button type="button" onClick={onAddStore}><Plus /> إضافة متجر</button></div>}
    </td></tr> : null}
  </>
}

function StoreRow({ store, selected, retrying, onSelect, onOpenWorkspace, onRetryCommerce, onPreview }: { store: PlatformStore; selected: boolean; retrying: boolean; onSelect: () => void; onOpenWorkspace: () => void; onRetryCommerce: () => void; onPreview: () => void }) {
  const domain = primaryDomain(store)
  const owner = store.memberships.find((membership) => membership.role === "owner")
  const readiness = store.commerce_readiness?.status ?? "pending"
  const canRetry = store.commerce_setup?.status === "failed"

  return <tr className={selected ? "is-selected-store" : ""} onClick={onSelect}>
    <td><div className="store-identity"><span className="client-mark" style={{ "--client-color": store.brand?.primary_color || "#008cff" } as CSSProperties}>{store.brand?.logo_url ? <img src={store.brand.logo_url} alt="" /> : <BuildingStorefront />}</span><div><strong>{store.name}</strong><small dir="ltr">{store.handle}</small></div></div></td>
    <td>{planLabels[store.plan_code]}</td>
    <td>{domain ? <span className="domain-cell"><Globe /><span dir="ltr">{domain.hostname}</span></span> : <span className="muted-value">غير مربوط</span>}</td>
    <td><DomainState domain={domain} /></td>
    <td><span className={`readiness-badge readiness-badge--${readinessTone(readiness)}`}>{readinessLabels[readiness]}</span></td>
    <td>{store.product_count.toLocaleString("ar-LY")}</td>
    <td><span className="owner-email" dir="ltr">{owner?.email || "غير متاح"}</span></td>
    <td>{formatDate(store.updated_at, true)}</td>
    <td><div className="store-row-actions">
      {canRetry ? <button type="button" disabled={retrying} onClick={(event) => { event.stopPropagation(); onRetryCommerce() }} aria-label={`إعادة إعداد تجارة ${store.name}`}>{retrying ? <Loader className="spin" /> : <CogSixTooth />}</button> : null}
      <button type="button" onClick={(event) => { event.stopPropagation(); onOpenWorkspace() }} aria-label={`فتح مساحة ${store.name}`}><OpenRectArrowOut /></button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onPreview() }} aria-label={`معاينة ${store.name}`}><Eye /></button>
    </div></td>
  </tr>
}

function DomainState({ domain }: { domain: PlatformStoreDomain | null }) {
  if (!domain) return <span className="readiness-badge readiness-badge--neutral">غير مربوط</span>
  if (domain.verification_status === "failed" || domain.ssl_status === "failed") return <span className="readiness-badge readiness-badge--danger">فشل التحقق</span>
  if (domain.verification_status === "verified" && domain.ssl_status === "active") return <span className="readiness-badge readiness-badge--success">موثّق وآمن</span>
  return <span className="readiness-badge readiness-badge--warning">بانتظار التحقق</span>
}

type ClientInspectorProps = {
  client: PlatformClient
  store: PlatformStore | null
  retryingSetupId: string | null
  onClose: () => void
  onSelectStore: (store: PlatformStore) => void
  onAddStore: () => void
  onOpenWorkspace: (store: PlatformStore) => void
  onRetryCommerce: (store: PlatformStore) => void
  onPreviewStore: (store: PlatformStore) => void
}

function ClientInspector({ client, store, retryingSetupId, onClose, onSelectStore, onAddStore, onOpenWorkspace, onRetryCommerce, onPreviewStore }: ClientInspectorProps) {
  const domain = primaryDomain(store)
  const owner = store?.memberships.find((membership) => membership.role === "owner") ?? null

  return <aside className="client-inspector" aria-label="تفاصيل العميل والمتجر">
    <header><h2>تفاصيل العميل</h2><button type="button" onClick={onClose} aria-label="إغلاق تفاصيل العميل"><XMark /></button></header>
    <div className="inspector-client-heading"><span className="client-mark" style={{ "--client-color": store?.brand?.primary_color || "#008cff" } as CSSProperties}>{store?.brand?.logo_url ? <img src={store.brand.logo_url} alt="" /> : <Users />}</span><div><h3>{client.name}</h3><span dir="ltr">{client.key || client.id}</span></div></div>
    <span className={`inspector-status status--${client.status}`}><i />{tenantStatusLabels[client.status]}</span>

    <InspectorSection title={`المتاجر (${client.stores.length.toLocaleString("ar-LY")})`} icon={<BuildingStorefront />}>
      <div className="inspector-store-list">
        {client.stores.map((item) => <button key={item.id} type="button" className={item.id === store?.id ? "is-active" : ""} onClick={() => onSelectStore(item)}><span><strong>{item.name}</strong><small dir="ltr">{item.handle}</small></span><i className={`status-dot status-dot--${item.status}`} /></button>)}
        <button className="inspector-add-store" type="button" onClick={onAddStore}><Plus /> إضافة متجر</button>
      </div>
    </InspectorSection>

    {store ? <>
      <InspectorSection title="هوية المتجر" icon={<ShieldCheck />}>
        <InspectorPair label="الحالة" value={storeStatusLabels[store.status]} tone={store.status === "active" ? "success" : "warning"} />
        <InspectorPair label="الخطة" value={planLabels[store.plan_code]} />
        <InspectorPair label="المنتجات" value={store.product_count.toLocaleString("ar-LY")} />
        <InspectorPair label="تهيئة الهوية" value={store.provisioning?.status === "completed" ? "مكتملة" : store.provisioning?.status || "غير متاحة"} tone={store.provisioning?.status === "completed" ? "success" : "warning"} />
      </InspectorSection>
      <InspectorSection title="المالك والتواصل" icon={<User />}>
        <strong className="inspector-contact" dir="ltr">{owner?.email || store.contact.public_email || "لا يوجد بريد مسجل"}</strong>
        <span className="inspector-subtle" dir="ltr">{store.contact.whatsapp_number || store.contact.public_phone || "لا يوجد رقم عام"}</span>
      </InspectorSection>
      <InspectorSection title="النطاق" icon={<Globe />}>
        <InspectorPair label="النطاق" value={domain?.hostname || "لم يُربط بعد"} ltr={Boolean(domain)} />
        <InspectorPair label="التحقق" value={domain ? domain.verification_status : "غير متاح"} tone={domain?.verification_status === "verified" ? "success" : "warning"} />
        <InspectorPair label="SSL" value={domain ? domain.ssl_status : "غير متاح"} tone={domain?.ssl_status === "active" ? "success" : "warning"} />
      </InspectorSection>
      <InspectorSection title="جاهزية التجارة" icon={<ServerStack />}>
        <InspectorPair label="الحالة" value={readinessLabels[store.commerce_readiness?.status ?? "pending"]} tone={store.commerce_readiness?.status === "ready" ? "success" : "warning"} />
        <InspectorPair label="آخر تحقق" value={formatDate(store.commerce_readiness?.validated_at)} />
        {store.commerce_readiness?.failure_message ? <div className="inspector-warning"><CircleWarningSolid />{store.commerce_readiness.failure_message}</div> : null}
      </InspectorSection>
      <div className="inspector-actions">
        <button className="primary-action" type="button" onClick={() => onOpenWorkspace(store)}><OpenRectArrowOut /> فتح مساحة المتجر</button>
        {store.commerce_setup?.status === "failed" ? <button type="button" disabled={retryingSetupId === store.commerce_setup.id} onClick={() => onRetryCommerce(store)}>{retryingSetupId === store.commerce_setup.id ? <Loader className="spin" /> : <CogSixTooth />} إعادة إعداد التجارة</button> : null}
        <button type="button" onClick={onAddStore}><Plus /> إضافة متجر لنفس العميل</button>
        <button type="button" onClick={() => { window.history.pushState({}, "", `/dashboard/vendor-accounts?client=${encodeURIComponent(client.id)}&store=${encodeURIComponent(store.id)}`); window.dispatchEvent(new PopStateEvent("popstate")) }}><Users /> حسابات البائعين</button>
        <button type="button" onClick={() => onPreviewStore(store)}><Eye /> معاينة الواجهة</button>
      </div>
    </> : <div className="inspector-empty-store"><BuildingStorefront /><span>لا توجد متاجر لهذا العميل بعد.</span><button type="button" onClick={onAddStore}><Plus /> إضافة أول متجر</button></div>}
  </aside>
}

function InspectorSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="inspector-section"><h4>{icon}{title}</h4><div>{children}</div></section>
}

function InspectorPair({ label, value, tone, ltr }: { label: string; value: string; tone?: "success" | "warning"; ltr?: boolean }) {
  return <div className="inspector-pair"><span>{label}</span><strong className={tone ? `is-${tone}` : undefined} dir={ltr ? "ltr" : undefined}>{value}</strong></div>
}
