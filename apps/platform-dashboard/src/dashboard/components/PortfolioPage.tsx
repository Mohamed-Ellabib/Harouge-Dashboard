import {
  Adjustments,
  ArrowDownTray,
  ArrowLeft,
  ArrowRight,
  ArrowUpRightOnBox,
  BuildingStorefront,
  CheckCircleSolid,
  ChevronDownMini,
  CircleWarningSolid,
  Clock,
  CogSixTooth,
  CreditCard,
  EllipsisHorizontal,
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
import { useCallback, useEffect, useMemo, useState } from "react"

import { listPlatformVendors } from "../api"
import { platformPortfolioDemo } from "../demo-data"
import type { PlatformVendor, PlatformVendorStatus } from "../types"
import { ProvisionStoreDialog } from "./ProvisionStoreDialog"

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

const statusLabels: Record<PlatformVendorStatus, string> = {
  active: "نشط",
  draft: "تجريبي",
  suspended: "متوقف",
}

const compatibilityNotice =
  "بيانات المتاجر المعروضة مرجعية مؤقتاً؛ التهيئة الجديدة تعمل، بينما تغيير الحالة والحذف متوقفان حتى اكتمال ربط دورة الحياة الدائمة."

function planCode(vendor: PlatformVendor) {
  const metadataPlan = vendor.metadata?.plan_code
  if (vendor.provisioning?.requested_plan_code) {
    return vendor.provisioning.requested_plan_code
  }

  return metadataPlan === "starter_whatsapp" || metadataPlan === "professional_commerce"
    ? metadataPlan
    : null
}

function planLabel(vendor: PlatformVendor): string {
  const code = planCode(vendor)
  if (code === "professional_commerce") return "احترافية سنوية"
  if (code === "starter_whatsapp") return "واتساب مبدئية"
  return "غير محددة"
}

function primaryDomain(vendor: PlatformVendor): string | null {
  return vendor.domains.find((domain) => domain.is_primary)?.domain ?? vendor.domains[0]?.domain ?? null
}

function formatDate(value?: string | null, short = false): string {
  if (!value) return "غير متاح"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "غير متاح"
  return (short ? shortDateFormatter : dateFormatter).format(date)
}

function storeCount(vendor: PlatformVendor): number {
  const explicit = vendor.metadata?.store_count
  return typeof explicit === "number" && explicit > 0 ? explicit : 1
}

function lastVersion(vendor: PlatformVendor): string {
  const version = vendor.metadata?.deployment_version
  return typeof version === "string" && version ? version : "غير مربوط"
}

function makeCsv(vendors: PlatformVendor[]): string {
  const rows = [
    ["العميل", "المعرّف", "الحالة", "الخطة", "النطاق", "حسابات البائعين", "البريد"],
    ...vendors.map((vendor) => [
      vendor.name,
      vendor.handle,
      statusLabels[vendor.status],
      planLabel(vendor),
      primaryDomain(vendor) ?? "",
      String(vendor.members.length),
      vendor.contact_email ?? "",
    ]),
  ]

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n")
}

export function PortfolioPage() {
  const demoMode =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1"
  const [vendors, setVendors] = useState<PlatformVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | PlatformVendorStatus>("all")
  const [planFilter, setPlanFilter] = useState<"all" | "starter_whatsapp" | "professional_commerce">(
    "all",
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(() =>
    window.matchMedia("(min-width: 901px)").matches,
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [showBilling, setShowBilling] = useState(true)
  const [showMembers, setShowMembers] = useState(true)
  const [provisionOpen, setProvisionOpen] = useState(false)

  const loadVendors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = demoMode ? platformPortfolioDemo : await listPlatformVendors()
      setVendors(next)
      setSelectedId((current) => current && next.some((vendor) => vendor.id === current) ? current : next[0]?.id ?? null)
      setExpandedId((current) => current && next.some((vendor) => vendor.id === current) ? current : next[0]?.id ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل محفظة العملاء.")
    } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    void loadVendors()
  }, [loadVendors])

  const filteredVendors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return vendors.filter((vendor) => {
      if (statusFilter !== "all" && vendor.status !== statusFilter) return false
      if (planFilter !== "all" && planCode(vendor) !== planFilter) return false
      if (!normalizedQuery) return true

      return [
        vendor.name,
        vendor.handle,
        vendor.contact_email,
        ...vendor.domains.map((domain) => domain.domain),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [planFilter, query, statusFilter, vendors])

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / pageSize))
  const visiblePage = Math.min(page, totalPages)
  const paginatedVendors = filteredVendors.slice((visiblePage - 1) * pageSize, visiblePage * pageSize)
  const selectedVendor = vendors.find((vendor) => vendor.id === selectedId) ?? null

  useEffect(() => {
    setPage(1)
  }, [planFilter, query, statusFilter])

  const summary = useMemo(
    () => ({
      clients: vendors.filter((vendor) => vendor.status === "active").length,
      liveStores: vendors.filter((vendor) => vendor.status === "active").reduce((sum, vendor) => sum + storeCount(vendor), 0),
      trials: vendors.filter((vendor) => vendor.status === "draft").length,
      overdue: 0,
    }),
    [vendors],
  )

  const selectVendor = (vendor: PlatformVendor) => {
    setSelectedId(vendor.id)
    setExpandedId((current) => current === vendor.id ? null : vendor.id)
    setInspectorOpen(true)
  }

  const exportPortfolio = () => {
    const blob = new Blob(["\ufeff", makeCsv(filteredVendors)], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `labibtech-clients-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const openCommerceWorkspace = (vendor: PlatformVendor) => {
    window.history.pushState({}, "", `/dashboard/commerce?store=${encodeURIComponent(vendor.id)}`)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  return (
    <div className={`portfolio-page${inspectorOpen && selectedVendor ? " has-inspector" : ""}`}>
      {inspectorOpen && selectedVendor ? (
        <ClientInspector
          vendor={selectedVendor}
          onClose={() => setInspectorOpen(false)}
          onOpenWorkspace={() => openCommerceWorkspace(selectedVendor)}
        />
      ) : null}

      <main className="portfolio-main">
        <header className="portfolio-heading">
          <div>
            <h1>محفظة العملاء والمتاجر</h1>
            <p>إدارة كل عميل ومتاجره وخدماته من سجل موحّد</p>
            <div className="compatibility-notice" role="note">
              <ShieldCheck aria-hidden="true" />
              <span>{compatibilityNotice}</span>
            </div>
          </div>
          <div className="portfolio-heading__actions">
            <button className="primary-action" type="button" onClick={() => setProvisionOpen(true)}>
              <Plus />
              تهيئة عميل ومتجر جديد
            </button>
            <button className="icon-action" type="button" aria-label="المزيد">
              <EllipsisHorizontal />
            </button>
          </div>
        </header>

        <section className="portfolio-summary" aria-label="ملخص المحفظة">
          <SummaryItem icon={<Users />} label="العملاء النشطون" value={summary.clients} tone="blue" />
          <SummaryItem icon={<BuildingStorefront />} label="المتاجر المباشرة" value={summary.liveStores} tone="cyan" />
          <SummaryItem icon={<Clock />} label="التجارب" value={summary.trials} tone="neutral" />
          <SummaryItem icon={<CreditCard />} label="الاشتراكات المتأخرة" value={summary.overdue} tone="danger" />
        </section>

        <section className="portfolio-table-panel" aria-label="سجل العملاء والمتاجر">
          <div className="portfolio-toolbar">
            <label className="portfolio-search">
              <MagnifyingGlass />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="بحث في العملاء أو النطاقات"
              />
            </label>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">كل حالات دورة الحياة</option>
              <option value="active">نشط</option>
              <option value="draft">تجريبي</option>
              <option value="suspended">متوقف</option>
            </select>

            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value as typeof planFilter)}>
              <option value="all">كل الخطط</option>
              <option value="professional_commerce">التجارة الاحترافية</option>
              <option value="starter_whatsapp">واتساب المبدئية</option>
            </select>

            <div className="portfolio-toolbar__spacer" />

            <button type="button" onClick={() => setColumnsOpen((open) => !open)}>
              <GridLayout />
              أعمدة
            </button>
            <button type="button" onClick={exportPortfolio} disabled={!filteredVendors.length}>
              <ArrowDownTray />
              تصدير
            </button>

            {columnsOpen ? (
              <div className="columns-popover">
                <label>
                  <input type="checkbox" checked={showMembers} onChange={(event) => setShowMembers(event.target.checked)} />
                  حسابات البائعين
                </label>
                <label>
                  <input type="checkbox" checked={showBilling} onChange={(event) => setShowBilling(event.target.checked)} />
                  الفوترة
                </label>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="portfolio-error" role="alert">
              <CircleWarningSolid />
              <span>{error}</span>
              <button type="button" onClick={() => void loadVendors()}>إعادة المحاولة</button>
            </div>
          ) : null}

          <div className="portfolio-table-scroll">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th className="selection-cell"><input type="checkbox" aria-label="تحديد الجميع" /></th>
                  <th>العميل</th>
                  <th>المتاجر</th>
                  <th>الخطة</th>
                  <th>النطاق</th>
                  <th>آخر نشر</th>
                  {showMembers ? <th>حسابات البائعين</th> : null}
                  {showBilling ? <th>الفوترة</th> : null}
                  <th>الحالة</th>
                  <th className="actions-cell">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="portfolio-table-state">
                      <Loader className="spin" />
                      جارٍ تحميل محفظة العملاء...
                    </td>
                  </tr>
                ) : null}

                {!loading && !paginatedVendors.length ? (
                  <tr>
                    <td colSpan={10} className="portfolio-table-state">
                      <BuildingStorefront />
                      <strong>{vendors.length ? "لا توجد نتائج مطابقة" : "لم تتم إضافة أي عميل بعد"}</strong>
                      <span>{vendors.length ? "غيّر البحث أو عوامل التصفية." : "ابدأ بتهيئة أول متجر في منصة LabibTech."}</span>
                      {!vendors.length ? (
                        <button className="primary-action" type="button" onClick={() => setProvisionOpen(true)}>
                          <Plus /> تهيئة عميل ومتجر جديد
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? paginatedVendors.map((vendor) => {
                      const selected = vendor.id === selectedId
                      const expanded = vendor.id === expandedId
                      const domain = primaryDomain(vendor)
                      return (
                        <VendorRows
                          key={vendor.id}
                          vendor={vendor}
                          domain={domain}
                          selected={selected}
                          expanded={expanded}
                          showMembers={showMembers}
                          showBilling={showBilling}
                          onSelect={() => selectVendor(vendor)}
                        />
                      )
                    })
                  : null}
              </tbody>
            </table>
          </div>

          <footer className="portfolio-pagination">
            <span>
              عرض {filteredVendors.length ? (visiblePage - 1) * pageSize + 1 : 0} – {Math.min(visiblePage * pageSize, filteredVendors.length)} من {filteredVendors.length} عميل
            </span>
            <div className="pagination-buttons">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1} aria-label="الصفحة السابقة">
                <ArrowRight />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={pageNumber === visiblePage ? "is-active" : ""}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={visiblePage === totalPages} aria-label="الصفحة التالية">
                <ArrowLeft />
              </button>
            </div>
            <label>
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              لكل صفحة
            </label>
          </footer>
        </section>
      </main>

      <ProvisionStoreDialog
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        onProvisioned={loadVendors}
      />
    </div>
  )
}

function SummaryItem({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className={`summary-item summary-item--${tone}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value.toLocaleString("ar-LY")}</strong>
      </div>
    </div>
  )
}

type VendorRowsProps = {
  vendor: PlatformVendor
  domain: string | null
  selected: boolean
  expanded: boolean
  showMembers: boolean
  showBilling: boolean
  onSelect: () => void
}

function VendorRows({ vendor, domain, selected, expanded, showMembers, showBilling, onSelect }: VendorRowsProps) {
  const colSpan = 8 + Number(showMembers) + Number(showBilling)
  const domains = vendor.domains.length ? vendor.domains : [null]

  return (
    <>
      <tr className={`client-row${selected ? " is-selected" : ""}`} onClick={onSelect}>
        <td className="selection-cell" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`تحديد ${vendor.name}`} />
        </td>
        <td>
          <div className="client-identity">
            <span className="client-mark" style={{ "--client-color": vendor.primary_color || "#008cff" } as React.CSSProperties}>
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" /> : <BuildingStorefront />}
            </span>
            <div>
              <strong>{vendor.name}</strong>
              <small dir="ltr">{vendor.handle}</small>
            </div>
          </div>
        </td>
        <td>{storeCount(vendor).toLocaleString("ar-LY")}</td>
        <td>{planLabel(vendor)}</td>
        <td>
          {domain ? (
            <span className="domain-cell"><LockClosedSolid /> <span dir="ltr">{domain}</span></span>
          ) : (
            <span className="muted-value">لم يُربط</span>
          )}
        </td>
        <td>
          <div className="deployment-cell">
            <span>{formatDate(vendor.updated_at, true)}</span>
            <small>{lastVersion(vendor)}</small>
          </div>
        </td>
        {showMembers ? <td><span className="member-count"><Users /> {vendor.members.length.toLocaleString("ar-LY")}</span></td> : null}
        {showBilling ? <td><span className="billing-unlinked">غير مربوط</span></td> : null}
        <td><span className={`status status--${vendor.status}`}><i />{statusLabels[vendor.status]}</span></td>
        <td className="actions-cell">
          <button type="button" onClick={(event) => { event.stopPropagation(); onSelect() }} aria-label={`إجراءات ${vendor.name}`}>
            <EllipsisHorizontal />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="expanded-store-row">
          <td colSpan={colSpan}>
            <table>
              <thead>
                <tr>
                  <th>المتجر / العلامة التجارية</th>
                  <th>البيئة</th>
                  <th>النطاق الفرعي</th>
                  <th>SSL</th>
                  <th>آخر نشر</th>
                  <th>الإصدار</th>
                  <th>حسابات البائعين</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {domains.slice(0, 3).map((item, index) => (
                  <tr key={item?.id ?? `${vendor.id}-empty-domain`}>
                    <td><strong>{index === 0 ? vendor.name : `${vendor.name} — ${index === 1 ? "واجهة إضافية" : "قناة خاصة"}`}</strong><small dir="ltr">{item?.domain || vendor.handle}</small></td>
                    <td><span className={item?.is_primary || index === 0 ? "environment-live" : "environment-stage"}>{item?.is_primary || index === 0 ? "مباشر" : "تجريبي"}</span></td>
                    <td dir="ltr">{item?.domain || "لم يُربط نطاق"}</td>
                    <td><span className="ssl-manual"><ShieldCheck /> يدوي</span></td>
                    <td>{formatDate(vendor.updated_at, true)}</td>
                    <td>{lastVersion(vendor)}</td>
                    <td><span className="member-avatars"><User /><User /><b>+{Math.max(0, vendor.members.length - 2)}</b></span></td>
                    <td><button type="button" aria-label="إجراءات المتجر"><EllipsisHorizontal /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </>
  )
}

type ClientInspectorProps = {
  vendor: PlatformVendor
  onClose: () => void
  onOpenWorkspace: () => void
}

function ClientInspector({ vendor, onClose, onOpenWorkspace }: ClientInspectorProps) {
  const domain = primaryDomain(vendor)
  const maxProducts = planCode(vendor) === "professional_commerce" ? 500 : 100
  const productUsage = Math.min(100, Math.round(((vendor.product_count ?? 0) / maxProducts) * 100))

  return (
    <aside className="client-inspector" aria-label="تفاصيل العميل">
      <header>
        <h2>تفاصيل العميل</h2>
        <button type="button" onClick={onClose} aria-label="إغلاق تفاصيل العميل"><XMark /></button>
      </header>

      <div className="inspector-client-heading">
        <span className="client-mark" style={{ "--client-color": vendor.primary_color || "#008cff" } as React.CSSProperties}>
          {vendor.logo_url ? <img src={vendor.logo_url} alt="" /> : <BuildingStorefront />}
        </span>
        <div>
          <h3>{vendor.name}</h3>
          <span dir="ltr">{domain || vendor.handle}</span>
        </div>
      </div>

      <span className={`inspector-status status--${vendor.status}`}><i />{statusLabels[vendor.status]}</span>

      <InspectorSection title="دورة الحياة">
        <InspectorPair label="الحالة" value={statusLabels[vendor.status]} tone={vendor.status === "active" ? "success" : undefined} />
        <InspectorPair label="تاريخ الانضمام" value={formatDate(vendor.created_at)} />
        <InspectorPair label="الباقة" value={planLabel(vendor)} />
        <InspectorPair label="الفوترة" value="غير مربوطة" tone="warning" />
      </InspectorSection>

      <InspectorSection title="جهة الاتصال" icon={<User />}>
        <strong className="inspector-contact">{vendor.contact_email || "لا يوجد بريد مسجل"}</strong>
        <span className="inspector-subtle">{vendor.members.length.toLocaleString("ar-LY")} حساب بائع مرتبط</span>
      </InspectorSection>

      <InspectorSection title="النطاق والاستضافة" icon={<Globe />}>
        <InspectorPair label="النطاق" value={domain || "لم يُربط بعد"} ltr={Boolean(domain)} />
        <InspectorPair label="SSL" value="تحقق يدوي" tone="warning" />
        <InspectorPair label="الاستضافة" value="غير مربوطة بمزوّد" />
        <InspectorPair label="حالة الخدمة" value={vendor.status === "active" ? "سليم" : "تحتاج متابعة"} tone={vendor.status === "active" ? "success" : "warning"} />
      </InspectorSection>

      <InspectorSection title="آخر نشر" icon={<ServerStack />}>
        <InspectorPair label="البيئة" value="مباشر" tone="success" />
        <InspectorPair label="الإصدار" value={lastVersion(vendor)} />
        <InspectorPair label="آخر تحديث" value={formatDate(vendor.updated_at)} />
      </InspectorSection>

      <InspectorSection title="الاستخدام" icon={<Adjustments />}>
        <UsageBar label="المنتجات" value={`${vendor.product_count ?? 0} / ${maxProducts}`} progress={productUsage} />
        <UsageBar label="حسابات البائعين" value={vendor.members.length.toLocaleString("ar-LY")} progress={Math.min(100, vendor.members.length * 10)} />
        <UsageBar label="النطاقات" value={vendor.domains.length.toLocaleString("ar-LY")} progress={Math.min(100, vendor.domains.length * 20)} />
      </InspectorSection>

      <div className="inspector-actions">
        <button className="primary-action" type="button" onClick={onOpenWorkspace}>
          <OpenRectArrowOut /> فتح مساحة العميل
        </button>
        <button type="button" onClick={() => {
          window.history.pushState({}, "", `/dashboard/vendor-accounts?client=${encodeURIComponent(vendor.id)}`)
          window.dispatchEvent(new PopStateEvent("popstate"))
        }}><Users /> إدارة الحسابات</button>
        <button type="button" disabled={!domain} onClick={() => domain && window.open(`https://${domain}`, "_blank", "noopener,noreferrer")}><Eye /> معاينة الواجهة</button>
        <button
          className="danger-action"
          type="button"
          disabled
          title="تغيير حالة الخدمة متوقف حتى اكتمال ربط دورة الحياة الدائمة"
        >
          <ShieldCheck />
          تغيير حالة الخدمة غير متاح مؤقتاً
        </button>
      </div>
    </aside>
  )
}

function InspectorSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="inspector-section">
      <h4>{icon}{title}</h4>
      <div>{children}</div>
    </section>
  )
}

function InspectorPair({ label, value, tone, ltr }: { label: string; value: string; tone?: "success" | "warning"; ltr?: boolean }) {
  return (
    <div className="inspector-pair">
      <span>{label}</span>
      <strong className={tone ? `is-${tone}` : undefined} dir={ltr ? "ltr" : undefined}>{value}</strong>
    </div>
  )
}

function UsageBar({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="usage-bar">
      <div><span>{label}</span><strong>{value}</strong></div>
      <span><i style={{ width: `${progress}%` }} /></span>
    </div>
  )
}
