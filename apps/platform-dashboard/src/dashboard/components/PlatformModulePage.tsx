import {
  ArrowUpRightOnBox,
  BuildingStorefront,
  ChatBubbleLeftRight,
  CodeBranch,
  CogSixTooth,
  CreditCard,
  DocumentText,
  Globe,
  Key,
  Loader,
  Palette,
  Plus,
  RocketLaunch,
  ServerStack,
  ShieldCheck,
  ShoppingCart,
  Tag,
  User,
  Users,
} from "@medusajs/icons"
import { useCallback, useEffect, useMemo, useState } from "react"

import { listPlatformVendors } from "../api"
import { platformPortfolioDemo } from "../demo-data"
import type { DashboardRoute, PlatformVendor } from "../types"
import { ProvisionStoreDialog } from "./ProvisionStoreDialog"

type ModuleCopy = {
  title: string
  subtitle: string
  icon: typeof Globe
}

const moduleCopy: Partial<Record<DashboardRoute, ModuleCopy>> = {
  requests: {
    title: "طلبات المتاجر",
    subtitle: "استقبال الطلبات وبدء تهيئة العملاء والمتاجر من مسار واحد",
    icon: DocumentText,
  },
  storefronts: {
    title: "استوديو الواجهات",
    subtitle: "العلامات التجارية والواجهات العامة المرتبطة بمتاجر العملاء",
    icon: Palette,
  },
  domains: {
    title: "النطاقات والاستضافة",
    subtitle: "سجل النطاقات الحالية وحالة الربط لكل متجر",
    icon: Globe,
  },
  deployments: {
    title: "النشر والإصدارات",
    subtitle: "إدارة بيئات الواجهات وإصداراتها من منصة LabibTech",
    icon: CodeBranch,
  },
  "vendor-accounts": {
    title: "حسابات البائعين",
    subtitle: "الحسابات التي يمكنها الوصول إلى متاجر العملاء",
    icon: Users,
  },
  billing: {
    title: "الخطط والفوترة",
    subtitle: "خطط العملاء والاشتراكات والفواتير على مستوى المنصة",
    icon: CreditCard,
  },
  operations: {
    title: "الدعم والعمليات",
    subtitle: "صحة المنصة ومسارات الدعم والإجراءات التشغيلية",
    icon: ChatBubbleLeftRight,
  },
  security: {
    title: "الأمان والسجلات",
    subtitle: "المستخدمون والصلاحيات ومفاتيح API وسجل سير العمل",
    icon: ShieldCheck,
  },
  settings: {
    title: "إعدادات المنصة",
    subtitle: "الإعدادات المركزية للتجارة والمناطق والمخزون والقنوات",
    icon: CogSixTooth,
  },
  commerce: {
    title: "مساحة إدارة التجارة",
    subtitle: "كل وظائف التجارة الحالية محفوظة ومتاحة من المحرك التشغيلي",
    icon: BuildingStorefront,
  },
}

const commerceLinks = [
  { label: "الطلبات", description: "المعالجة والإيفاء والاسترجاع والتحويل", path: "/app/orders", icon: ShoppingCart },
  { label: "المنتجات", description: "المنتجات والمتغيرات والأسعار والوسائط", path: "/app/products", icon: Tag },
  { label: "التصنيفات", description: "الفئات والمجموعات وخيارات المنتجات", path: "/app/categories", icon: Tag },
  { label: "المخزون", description: "عناصر المخزون والحجوزات والمواقع", path: "/app/inventory", icon: ServerStack },
  { label: "العملاء", description: "العملاء والمجموعات والعناوين", path: "/app/customers", icon: Users },
  { label: "التسويق", description: "العروض والحملات وقوائم الأسعار", path: "/app/promotions", icon: RocketLaunch },
  { label: "المناطق والضرائب", description: "المناطق والعملات ومناطق الضرائب", path: "/app/settings/regions", icon: Globe },
  { label: "قنوات البيع", description: "القنوات ومواقع المخزون والشحن", path: "/app/settings/sales-channels", icon: BuildingStorefront },
  { label: "المستخدمون والصلاحيات", description: "المستخدمون والأدوار والسياسات", path: "/app/settings/users", icon: User },
  { label: "مفاتيح API", description: "المفاتيح القابلة للنشر والمفاتيح السرية", path: "/app/settings/publishable-api-keys", icon: Key },
  { label: "سير العمل", description: "عمليات التنفيذ وحالاتها", path: "/app/settings/workflows", icon: CodeBranch },
  { label: "إعدادات المتجر", description: "العملات واللغات والبيانات الوصفية", path: "/app/settings/store", icon: CogSixTooth },
]

const legacyCompatibilityRoutes = new Set<DashboardRoute>([
  "storefronts",
  "domains",
  "vendor-accounts",
])

const compatibilityNotice =
  "هذه البيانات مرجعية مؤقتاً؛ تغييرات دورة حياة المتجر والحذف متوقفة حتى اكتمال الربط الدائم."

export function PlatformModulePage({ route }: { route: DashboardRoute }) {
  const demoMode =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1"
  const copy = moduleCopy[route] ?? moduleCopy.commerce!
  const Icon = copy.icon
  const [vendors, setVendors] = useState<PlatformVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provisionOpen, setProvisionOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setVendors(demoMode ? platformPortfolioDemo : await listPlatformVendors())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل بيانات المنصة.")
    } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="platform-module-page">
      <header className="platform-module-heading">
        <div className="platform-module-heading__icon"><Icon /></div>
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
          {legacyCompatibilityRoutes.has(route) ? (
            <div className="compatibility-notice" role="note">
              <ShieldCheck aria-hidden="true" />
              <span>{compatibilityNotice}</span>
            </div>
          ) : null}
        </div>
        {route === "requests" ? (
          <button className="primary-action" type="button" onClick={() => setProvisionOpen(true)}>
            <Plus /> تهيئة عميل ومتجر جديد
          </button>
        ) : null}
      </header>

      {loading ? (
        <div className="module-loading"><Loader className="spin" /> جارٍ تحميل البيانات...</div>
      ) : null}
      {error ? <div className="module-error">{error}<button type="button" onClick={() => void load()}>إعادة المحاولة</button></div> : null}

      {!loading && !error ? <ModuleBody route={route} vendors={vendors} onProvision={() => setProvisionOpen(true)} /> : null}

      <ProvisionStoreDialog open={provisionOpen} onClose={() => setProvisionOpen(false)} onProvisioned={load} />
    </main>
  )
}

function ModuleBody({ route, vendors, onProvision }: { route: DashboardRoute; vendors: PlatformVendor[]; onProvision: () => void }) {
  if (route === "requests") {
    const draftCount = vendors.filter((vendor) => vendor.status === "draft").length
    return (
      <div className="requests-layout">
        <section className="requests-primary">
          <div><DocumentText /><h2>مسار التهيئة المعتمد</h2></div>
          <p>ينشئ سجل العميل والمتجر وملف المنصة والقناة والمفتاح والمنطقة والمخزون والنطاق والعلامة وحساب المالك عبر عملية واحدة قابلة لإعادة المحاولة.</p>
          <ol>
            <li><span>1</span> بيانات العميل والمتجر</li>
            <li><span>2</span> الهوية والنطاق</li>
            <li><span>3</span> موارد التجارة</li>
            <li><span>4</span> حساب البائع</li>
            <li><span>5</span> التحقق والتفعيل</li>
          </ol>
          <button className="primary-action" type="button" onClick={onProvision}><Plus /> تهيئة عميل ومتجر جديد</button>
        </section>
        <aside>
          <strong>{draftCount.toLocaleString("ar-LY")}</strong>
          <span>متاجر بحالة تجريبية</span>
          <small>لا تتوفر قائمة مستقلة لطلبات ما قبل التهيئة في Phase 2C.</small>
        </aside>
      </div>
    )
  }

  if (route === "storefronts") {
    return <StorefrontRegistry vendors={vendors} />
  }

  if (route === "domains") {
    return <DomainRegistry vendors={vendors} />
  }

  if (route === "vendor-accounts") {
    return <VendorAccounts vendors={vendors} />
  }

  if (route === "commerce") {
    return (
      <section className="commerce-workspace-links">
        <div className="phase-boundary-note">
          <ShieldCheck />
          <div><strong>محرك التجارة الحالي محفوظ بالكامل</strong><span>تفتح هذه الروابط الصفحات العاملة حالياً بنفس جلسة الإدارة. سننقل واجهاتها إلى نظام LabibTech تدريجياً دون خسارة الوظائف.</span></div>
        </div>
        <div className="commerce-links-grid">
          {commerceLinks.map((item) => {
            const ItemIcon = item.icon
            return (
              <a key={item.path} href={item.path}>
                <ItemIcon />
                <div><strong>{item.label}</strong><span>{item.description}</span></div>
                <ArrowUpRightOnBox />
              </a>
            )
          })}
        </div>
      </section>
    )
  }

  const deferred = deferredContent(route)
  return (
    <section className="deferred-module">
      <div className="deferred-module__status"><ShieldCheck /><span>حدود المرحلة الحالية</span></div>
      <h2>{deferred.heading}</h2>
      <p>{deferred.description}</p>
      <div className="deferred-module__actions">
        {deferred.links.map((link) => <a key={link.href} href={link.href}>{link.label}<ArrowUpRightOnBox /></a>)}
      </div>
    </section>
  )
}

function StorefrontRegistry({ vendors }: { vendors: PlatformVendor[] }) {
  return (
    <section className="module-registry">
      <header><span>العميل</span><span>اللون الرئيسي</span><span>النطاق العام</span><span>حالة الواجهة</span><span>الإجراء</span></header>
      {vendors.map((vendor) => {
        const domain = vendor.domains.find((item) => item.is_primary)?.domain ?? vendor.domains[0]?.domain
        return (
          <div key={vendor.id}>
            <strong>{vendor.name}<small>{vendor.handle}</small></strong>
            <span className="brand-color"><i style={{ backgroundColor: vendor.primary_color || "#008cff" }} />{vendor.primary_color || "#008cff"}</span>
            <span dir="ltr">{domain || "لم يُربط"}</span>
            <span className="status status--draft"><i />التصميم اليدوي</span>
            {domain ? <a href={`https://${domain}`} target="_blank" rel="noreferrer">معاينة <ArrowUpRightOnBox /></a> : <span>غير متاح</span>}
          </div>
        )
      })}
      {!vendors.length ? <p className="registry-empty">لا توجد متاجر لعرض هويتها بعد.</p> : null}
    </section>
  )
}

function DomainRegistry({ vendors }: { vendors: PlatformVendor[] }) {
  const domains = vendors.flatMap((vendor) => vendor.domains.map((domain) => ({ vendor, domain })))
  return (
    <section className="module-registry domains-registry">
      <header><span>النطاق</span><span>العميل</span><span>النوع</span><span>DNS</span><span>SSL</span></header>
      {domains.map(({ vendor, domain }) => (
        <div key={domain.id}>
          <strong dir="ltr">{domain.domain}</strong>
          <span>{vendor.name}</span>
          <span>{domain.is_primary ? "رئيسي" : "إضافي"}</span>
          <span className="status status--draft"><i />تحقق يدوي</span>
          <span>غير مؤتمت</span>
        </div>
      ))}
      {!domains.length ? <p className="registry-empty">لم تُسجل نطاقات بعد.</p> : null}
    </section>
  )
}

function VendorAccounts({ vendors }: { vendors: PlatformVendor[] }) {
  const members = vendors.flatMap((vendor) => vendor.members.map((member) => ({ vendor, member })))
  return (
    <section className="module-registry vendor-members-registry">
      <header><span>الحساب</span><span>العميل / المتجر</span><span>الدور</span><span>الحالة</span><span>الوصول</span></header>
      {members.map(({ vendor, member }) => (
        <div key={member.id}>
          <strong dir="ltr">{member.email}</strong>
          <span>{vendor.name}</span>
          <span>{member.role === "owner" ? "مالك" : member.role}</span>
          <span className="status status--active"><i />{member.status === "active" ? "نشط" : member.status}</span>
          <span>متجر واحد</span>
        </div>
      ))}
      {!members.length ? <p className="registry-empty">لا توجد حسابات بائعين بعد.</p> : null}
    </section>
  )
}

function deferredContent(route: DashboardRoute) {
  const defaults = {
    heading: "هذه الوحدة جاهزة في هيكل لوحة LabibTech وتنتظر خدمة الخلفية الخاصة بها.",
    description: "لن تعرض لوحة المالك بيانات افتراضية على أنها حقيقية. الوظائف المؤجلة ستُربط بعد اعتماد مرحلتها الخلفية.",
    links: [{ label: "فتح إعدادات التجارة الحالية", href: "/app/settings/store" }],
  }

  if (route === "deployments") return { ...defaults, heading: "النشر الآلي وإدارة الاستضافة غير منفذين في Phase 2C.", links: [{ label: "فتح إعدادات المتجر الحالية", href: "/app/settings/store" }] }
  if (route === "billing") return { ...defaults, heading: "الفوترة والاشتراكات لم تبدأ بعد.", links: [{ label: "مراجعة خطط المتاجر", href: "/dashboard/clients" }] }
  if (route === "operations") return { ...defaults, heading: "المراقبة المركزية والدعم التشغيلي ما زالا ضمن العمل المستقبلي.", links: [{ label: "فتح سجل سير العمل", href: "/app/settings/workflows" }] }
  if (route === "security") return { ...defaults, heading: "إدارة المستخدمين والصلاحيات متاحة الآن في محرك الإدارة.", links: [{ label: "المستخدمون", href: "/app/settings/users" }, { label: "الأدوار", href: "/app/settings/roles" }, { label: "مفاتيح API", href: "/app/settings/publishable-api-keys" }] }
  if (route === "settings") return { ...defaults, heading: "الإعدادات التجارية المركزية متاحة الآن.", links: [{ label: "إعدادات المتجر", href: "/app/settings/store" }, { label: "المناطق", href: "/app/settings/regions" }, { label: "مواقع المخزون", href: "/app/settings/locations" }] }
  return defaults
}
