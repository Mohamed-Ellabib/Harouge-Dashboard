import { useEffect, useRef, useState, type ReactNode } from "react"
import { PiSquaresFour, PiStorefront, PiUsersThree, PiPalette, PiGlobe, PiChartLineUp, PiCreditCard, PiPulse, PiListChecks, PiShieldCheck, PiGear, PiSignOut, PiSidebarSimple, PiList, PiX, PiCaretRight } from "react-icons/pi"
import type { PlatformAdmin } from "../../auth/platform-auth"
import type { DashboardRoute } from "../types"
import { navigateDashboard, pathForDashboardRoute } from "../routing"
import { visualPreviewQuery } from "../visual-preview"
import "./admin-navigation.css"

const groups = [
  { label: "Workspace", items: [
    { label: "Overview", route: "overview", icon: PiSquaresFour },
    { label: "Stores", route: "clients", icon: PiStorefront },
    { label: "Vendors", route: "vendor-accounts", icon: PiUsersThree },
    { label: "Templates Studio", route: "storefronts", icon: PiPalette },
    { label: "Domains", route: "domains", icon: PiGlobe },
  ] },
  { label: "Management", items: [
    { label: "Analytics", route: "analytics", icon: PiChartLineUp },
    { label: "Plans & billing", route: "billing", icon: PiCreditCard },
    { label: "Requests", route: "requests", icon: PiListChecks },
    { label: "Activity", route: "operations", icon: PiPulse },
  ] },
  { label: "Platform", items: [
    { label: "Security & audit", route: "security", icon: PiShieldCheck },
    { label: "Settings", route: "settings", icon: PiGear },
  ] },
] satisfies Array<{ label: string; items: Array<{label: string; route: DashboardRoute; icon: typeof PiGear}> }>

type Props = { admin: PlatformAdmin; activeRoute: DashboardRoute; children: ReactNode; onSignOut: () => Promise<void>; focused?: boolean }

export function AdminNavigationLayout({ admin, activeRoute, children, onSignOut, focused }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || admin.email
  const initials = name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase()
  const closeDrawer = () => { drawer.current?.close(); trigger.current?.focus() }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1025px)")
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close() }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  function links() {
    return <nav aria-label="Platform navigation">
      {groups.map(group => <div className="admin-navigation__group" key={group.label}>
        <p>{group.label}</p>
        {group.items.map(({label, route, icon: Icon}) => <a
          key={route}
          href={`${pathForDashboardRoute(route)}${visualPreviewQuery()}`}
          aria-label={label}
          aria-current={route === activeRoute ? "page" : undefined}
          title={label}
          onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            navigateDashboard(route)
            if (drawer.current?.open && window.location.pathname === pathForDashboardRoute(route)) closeDrawer()
          }}
        ><Icon aria-hidden="true" /><span>{label}</span><i aria-hidden="true" /></a>)}
      </div>)}
    </nav>
  }

  function account() {
    return <footer className="admin-navigation__footer">
      <button className="admin-navigation__account" type="button" aria-label={`Account settings for ${name}`} title={`Account settings: ${name}`} onClick={() => { navigateDashboard("settings"); if (drawer.current?.open && window.location.pathname === pathForDashboardRoute("settings")) closeDrawer() }}>
        <span className="admin-navigation__avatar">{admin.avatar_url ? <img src={admin.avatar_url} alt="" /> : initials}</span>
        <span className="admin-navigation__identity"><strong>{name}</strong><small>Platform administrator</small></span>
        <PiCaretRight aria-hidden="true" />
      </button>
      <button className="admin-navigation__signout" type="button" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={async () => { setSigningOut(true); try { await onSignOut() } finally { setSigningOut(false) } }}><PiSignOut aria-hidden="true" /><span>{signingOut ? "Signing out…" : "Sign out"}</span></button>
    </footer>
  }

  if (focused) return <>{children}</>

  return <div className="admin-navigation-layout" data-collapsed={collapsed} dir="ltr">
    <aside className="admin-navigation" aria-label="Admin sidebar">
      <div className="admin-navigation__brand">
        <img src="/assets/labibtech-horizontal-lockup.png" alt="LabibTech" />
        <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><PiSidebarSimple /></button>
      </div>
      {links()}
      {account()}
    </aside>
    <button ref={trigger} type="button" className="admin-navigation__mobile-trigger" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}><PiList /> <span>Menu</span></button>
    <dialog ref={drawer} className="admin-navigation admin-navigation__drawer" aria-label="Platform navigation drawer" onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX > rect.right || event.clientX < rect.left) closeDrawer() } }}>
      <div className="admin-navigation__brand"><img src="/assets/labibtech-horizontal-lockup.png" alt="LabibTech" /><button type="button" aria-label="Close navigation" onClick={closeDrawer}><PiX /></button></div>
      {links()}
      {account()}
    </dialog>
    <div className="admin-navigation__content">{children}</div>
  </div>
}
