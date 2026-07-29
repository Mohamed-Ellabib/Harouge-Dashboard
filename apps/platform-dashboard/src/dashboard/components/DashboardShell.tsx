import {
  BellAlert,
  BuildingStorefront,
  Buildings,
  ChatBubbleLeftRight,
  CodeBranch,
  CogSixTooth,
  CreditCard,
  DocumentText,
  EllipsisHorizontal,
  Globe,
  House,
  MagnifyingGlass,
  OpenRectArrowOut,
  Palette,
  QuestionMarkCircle,
  RocketLaunch,
  ShieldCheck,
  Sun,
  User,
  Users,
  XMark,
  BarsThree,
} from "@medusajs/icons"
import type { ReactNode } from "react"
import { useState } from "react"

import type { PlatformAdmin } from "../../auth/platform-auth"
import type { DashboardRoute } from "../types"
import { navigateDashboard } from "../routing"

type DashboardShellProps = {
  admin: PlatformAdmin
  activeRoute: DashboardRoute
  onSignOut: () => Promise<void>
  children: ReactNode
}

const navigation = [
  { route: "overview", label: "الرئيسية", icon: House },
  { route: "requests", label: "طلبات المتاجر", icon: DocumentText },
  { route: "clients", label: "العملاء والمتاجر", icon: Users },
  { route: "storefronts", label: "استوديو الواجهات", icon: Palette },
  { route: "domains", label: "النطاقات والاستضافة", icon: Globe },
  { route: "deployments", label: "النشر والإصدارات", icon: CodeBranch },
  { route: "vendor-accounts", label: "حسابات البائعين", icon: User },
  { route: "billing", label: "الخطط والفوترة", icon: CreditCard },
  { route: "operations", label: "الدعم والعمليات", icon: ChatBubbleLeftRight },
  { route: "security", label: "الأمان والسجلات", icon: ShieldCheck },
  { route: "settings", label: "إعدادات المنصة", icon: CogSixTooth },
] satisfies Array<{
  route: DashboardRoute
  label: string
  icon: typeof House
}>

function adminName(admin: PlatformAdmin): string {
  const fullName = [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim()
  return fullName || "محمد اللبيب"
}

export function DashboardShell({
  admin,
  activeRoute,
  onSignOut,
  children,
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const chooseRoute = (route: DashboardRoute) => {
    setMobileNavOpen(false)
    navigateDashboard(route)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="owner-dashboard-shell" dir="ltr">
      <section className="owner-dashboard-stage" dir="rtl">
        <header className="owner-topbar">
          <div className="owner-account-wrap">
            <button
              className="owner-account"
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
            >
              <span className="owner-account__avatar" aria-hidden="true">
                <User />
              </span>
              <span className="owner-account__copy">
                <strong>{adminName(admin)}</strong>
                <small>مالك المنصة</small>
              </span>
              <EllipsisHorizontal aria-hidden="true" />
            </button>

            {accountOpen ? (
              <div className="owner-account-menu">
                <div>
                  <strong>{admin.email}</strong>
                  <span>حساب إدارة LabibTech</span>
                </div>
                <button type="button" onClick={handleSignOut} disabled={signingOut}>
                  <OpenRectArrowOut />
                  {signingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="owner-topbar__utilities" aria-label="أدوات الإدارة">
            <button type="button" aria-label="الإشعارات">
              <BellAlert />
            </button>
            <button type="button" aria-label="المساعدة">
              <QuestionMarkCircle />
            </button>
            <button type="button" aria-label="المظهر">
              <Sun />
            </button>
          </div>

          <label className="global-search">
            <MagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              placeholder="ابحث عن عميل أو متجر أو نطاق"
              aria-label="بحث عام في المنصة"
            />
            <kbd>⌘ K</kbd>
          </label>

          <button
            className="mobile-nav-toggle"
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <XMark /> : <BarsThree />}
          </button>
        </header>

        <div className="owner-dashboard-content">{children}</div>
      </section>

      <aside className={`owner-sidebar${mobileNavOpen ? " owner-sidebar--open" : ""}`} dir="rtl">
        <div className="owner-sidebar__brand">
          <img src="/assets/labibtech-logo.png" alt="LabibTech" draggable="false" />
        </div>

        <nav aria-label="التنقل الرئيسي للمنصة">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = activeRoute === item.route
            return (
              <button
                key={item.route}
                className={isActive ? "is-active" : ""}
                type="button"
                onClick={() => chooseRoute(item.route)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="owner-sidebar__footer">
          <button type="button" onClick={() => chooseRoute("commerce")}>
            <BuildingStorefront />
            <span>إدارة التجارة</span>
          </button>
          <div>
            <ShieldCheck aria-hidden="true" />
            <span>LabibTech</span>
          </div>
          <small>جميع الحقوق محفوظة © 2026</small>
        </div>
      </aside>

      {mobileNavOpen ? (
        <button
          className="owner-sidebar-backdrop"
          type="button"
          aria-label="إغلاق القائمة"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
    </div>
  )
}

