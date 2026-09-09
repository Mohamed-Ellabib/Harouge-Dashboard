import {
  PiArrowRight,
  PiCheckCircle,
  PiCrown,
  PiCurrencyCircleDollar,
  PiDotsThree,
  PiGear,
  PiMinusCircle,
  PiPaperPlaneTilt,
  PiPlus,
  PiReceipt,
  PiStack,
  PiStorefront,
  PiTrendUp,
} from "react-icons/pi"
import { useMemo, useState, type ComponentType, type CSSProperties } from "react"

import type { PlatformPlanCode, PlatformPortfolio } from "../types"

import "./admin-platform-operations.css"

type AdminPlansPageProps = {
  isDemo: boolean
  portfolio: PlatformPortfolio | null
  loading: boolean
  error?: string | null
  onToast: (message: string) => void
}

type PlansTab = "Plans" | "Feature Matrix" | "Coupons" | "Billing History"
type BillingCycle = "Monthly" | "Yearly"

type PlanCard = {
  id: string
  name: string
  price: number | null
  subscribed: number
  description: string
  features: string[]
  icon: ComponentType
  tone: "starter" | "growth" | "pro" | "draft"
  mostPopular?: boolean
  sessionDraft?: boolean
}

const demoPlans: PlanCard[] = [
  { id: "starter", name: "Starter", price: 29, subscribed: 14, description: "For new and small storefronts", features: ["Up to 500 products", "2 staff accounts", "Custom domain", "Basic analytics"], icon: PiPaperPlaneTilt, tone: "starter" },
  { id: "growth", name: "Growth", price: 79, subscribed: 21, description: "For growing commerce businesses", features: ["Up to 5,000 products", "10 staff accounts", "Advanced analytics", "Automations"], icon: PiTrendUp, tone: "growth", mostPopular: true },
  { id: "pro", name: "Pro", price: 149, subscribed: 13, description: "For high-volume storefronts", features: ["Unlimited products", "Unlimited staff", "API & webhooks", "Priority support"], icon: PiCrown, tone: "pro" },
]

function planLabel(code: PlatformPlanCode): "Starter" | "Pro" {
  return code === "starter_whatsapp" ? "Starter" : "Pro"
}

function realPlans(portfolio: PlatformPortfolio | null): PlanCard[] {
  if (!portfolio) return []
  const counts = new Map<PlatformPlanCode, number>()
  portfolio.clients.forEach((client) => client.stores.forEach((store) => counts.set(store.plan_code, (counts.get(store.plan_code) ?? 0) + 1)))
  return Array.from(counts.entries()).map(([code, count]): PlanCard => {
    const starter = code === "starter_whatsapp"
    return {
      id: code,
      name: planLabel(code),
      price: null,
      subscribed: count,
      description: "Pricing and limits are not available from the portfolio service",
      features: ["Product limits unavailable", "Staff limits unavailable", "Billing configuration unavailable"],
      icon: starter ? PiPaperPlaneTilt : PiCrown,
      tone: starter ? "starter" : "pro",
    }
  })
}

function donutStyle(plans: PlanCard[]): CSSProperties {
  const total = plans.reduce((sum, plan) => sum + plan.subscribed, 0)
  if (!total) return { background: "#e5e8ec" }
  const starter = plans.find((plan) => plan.name === "Starter")?.subscribed ?? 0
  const growth = plans.find((plan) => plan.name === "Growth")?.subscribed ?? 0
  const first = (starter / total) * 100
  const second = first + (growth / total) * 100
  return { background: `conic-gradient(#c8cdd4 0 ${Math.max(first - 0.45, 0)}%, #fff ${Math.max(first - 0.45, 0)}% ${first + 0.45}%, #08a8d4 ${first + 0.45}% ${Math.max(second - 0.45, first + 0.45)}%, #fff ${Math.max(second - 0.45, first + 0.45)}% ${second + 0.45}%, #0a315e ${second + 0.45}% 100%)` }
}

const featureRows = [
  { label: "Product catalog", matches: (feature: string) => /product/i.test(feature) },
  { label: "Staff access", matches: (feature: string) => /staff/i.test(feature) },
  { label: "Custom domains", matches: (feature: string) => /custom domain/i.test(feature) },
  { label: "Analytics", matches: (feature: string) => /analytics/i.test(feature) },
  { label: "API access", matches: (feature: string) => /api/i.test(feature) },
]

export function AdminPlansPage({ isDemo, portfolio, loading, error = null, onToast }: AdminPlansPageProps) {
  const [tab, setTab] = useState<PlansTab>("Plans")
  const [cycle, setCycle] = useState<BillingCycle>("Monthly")
  const [draftCreated, setDraftCreated] = useState(false)

  const configuredPlans = useMemo(() => isDemo ? demoPlans : realPlans(portfolio), [isDemo, portfolio])
  const draftPlan: PlanCard = { id: "session-draft", name: "New Plan", price: 49, subscribed: 0, description: "Session-only draft plan", features: ["Limits not configured", "Pricing not published"], icon: PiStack, tone: "draft", sessionDraft: true }
  const visiblePlans = draftCreated ? [...configuredPlans, draftPlan] : configuredPlans
  const subscribed = configuredPlans.reduce((sum, plan) => sum + plan.subscribed, 0)
  const activePlanCount = configuredPlans.length
  const unavailable = !isDemo && Boolean(error)
  const summaryUnavailable = !isDemo && (loading || unavailable)
  const demoAction = (message: string) => onToast(isDemo ? `Demo session only: ${message}` : "Billing operations are unavailable because no billing service is connected.")

  const createPlan = () => {
    if (!isDemo) return demoAction("plan creation is unavailable.")
    setDraftCreated(true)
    demoAction(draftCreated ? "plan draft reopened." : "new plan draft created.")
  }

  return (
    <section className="admin-platform-ops admin-plans-page" aria-labelledby="admin-plans-title">
      <header className="admin-page-heading">
        <div className="admin-page-heading__copy"><h1 id="admin-plans-title">Plans</h1><p>Manage subscription tiers, pricing and store limits</p></div>
        <div className="admin-page-actions"><button type="button" className="admin-page-button" disabled={!isDemo} title={!isDemo ? "Automated billing is outside the approved MVP" : undefined} onClick={() => demoAction("billing settings opened.")}><PiGear />Billing Settings</button><button type="button" className="admin-page-button admin-page-button--primary" disabled={!isDemo} title={!isDemo ? "Plan creation is not connected" : undefined} onClick={createPlan}><PiPlus />Create Plan</button></div>
      </header>

      <div className="admin-page-kpis" aria-label="Plan summary">
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--blue"><PiStack /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">{isDemo ? "Active Plans" : "Plans in Use"}</div><strong>{(loading && !isDemo) || unavailable ? "—" : activePlanCount}</strong><p>{unavailable ? "Plan data unavailable" : isDemo ? "Available to stores" : "Observed in the portfolio"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon"><PiStorefront /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">{isDemo ? "Subscribed Stores" : "Stores with Plans"}</div><strong>{(loading && !isDemo) || unavailable ? "—" : subscribed}</strong><p>{unavailable ? "Plan data unavailable" : isDemo ? "Across all plans" : "Portfolio assignments"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--green"><PiCurrencyCircleDollar /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Monthly Revenue</div><strong>{isDemo ? "$12,480" : "—"}</strong><p>{isDemo ? <span className="admin-page-percent">+9.8%</span> : "Billing metric unavailable"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--orange"><PiReceipt /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Past Due {isDemo ? <i className="admin-page-status-dot admin-page-status-dot--orange" /> : null}</div><strong>{isDemo ? 4 : "—"}</strong><p>{isDemo ? "Requires follow-up" : "Billing metric unavailable"}</p></div></article>
      </div>

      <div className="admin-plan-controls"><div className="admin-ops-tabs admin-plan-tabs" role="tablist" aria-label="Plan views">{(["Plans", "Feature Matrix", "Coupons", "Billing History"] as PlansTab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : undefined} disabled={!isDemo && (item === "Coupons" || item === "Billing History")} onClick={() => setTab(item)}>{item}</button>)}</div><div className="admin-cycle-toggle" aria-label="Billing cycle">{(["Monthly", "Yearly"] as BillingCycle[]).map((item) => <button type="button" key={item} className={cycle === item ? "is-active" : undefined} aria-pressed={cycle === item} disabled={!isDemo} onClick={() => setCycle(item)}>{item}{item === "Yearly" ? " −20%" : ""}</button>)}</div></div>

      {tab === "Plans" ? (
        <div className="admin-ops-workspace admin-plans-workspace">
          <article className="admin-page-card admin-plan-library"><header><div><h2>Subscription Plans</h2><p>{error && !isDemo ? error : isDemo ? "Pricing and limits available to your stores" : "Plan usage derived from the current portfolio"}</p></div><span>{loading && !isDemo ? "Loading…" : isDemo ? `${activePlanCount} active ${activePlanCount === 1 ? "plan" : "plans"}` : `${activePlanCount} ${activePlanCount === 1 ? "plan code" : "plan codes"} in use`}</span></header><div className={`admin-plan-grid${visiblePlans.length > 3 ? " has-draft" : ""}`}>{visiblePlans.map((plan) => { const Icon = plan.icon; const shownPrice = plan.price === null ? null : cycle === "Monthly" ? plan.price : Math.round(plan.price * 0.8); return <article className={`admin-plan-card admin-plan-card--${plan.tone}${plan.mostPopular ? " is-popular" : ""}`} key={plan.id}><div className="admin-plan-card__top"><span className="admin-plan-card__icon"><Icon /></span><div className="admin-plan-card__meta"><div className="admin-plan-card__name"><h3>{plan.name}</h3>{plan.mostPopular ? <span className="admin-plan-popular">Most Popular</span> : plan.sessionDraft ? <span className="admin-plan-draft">Session Draft</span> : <span className="admin-plan-active">{isDemo ? "Active" : "Assigned"}</span>}</div><div className="admin-plan-price"><strong>{shownPrice === null ? "—" : `$${shownPrice}`}</strong><span>{shownPrice === null ? "Pricing unavailable" : cycle === "Monthly" ? "/ month" : "/ month · billed yearly"}</span>{plan.mostPopular ? <span className="admin-plan-active">Active</span> : null}</div></div></div><p>{plan.description}</p><div className="admin-plan-subscribed">{plan.subscribed} {isDemo ? "subscribed" : "assigned"} {plan.subscribed === 1 ? "store" : "stores"}</div><ul>{plan.features.map((feature) => <li className={isDemo ? undefined : "is-unavailable"} key={feature}>{isDemo ? <PiCheckCircle /> : <PiMinusCircle />}{feature}</li>)}</ul><footer><button type="button" disabled={!isDemo} onClick={() => demoAction(`${plan.name} editor opened.`)}>{plan.sessionDraft ? "Continue Draft" : isDemo ? "Edit Plan" : "Unavailable"}</button><button type="button" aria-label={`More actions for ${plan.name}`} onClick={() => demoAction(`${plan.name} actions opened.`)}><PiDotsThree /></button></footer></article> })}</div></article>

          <aside className="admin-ops-side admin-plans-side"><article className="admin-page-card admin-ops-side-card admin-plan-distribution"><h2>{isDemo ? "Plan Distribution" : "Plan Assignment Distribution"}</h2><div className="admin-donut-layout"><div className="admin-donut admin-plan-donut" style={donutStyle(summaryUnavailable ? [] : configuredPlans)}><div className="admin-donut__label"><strong>{summaryUnavailable ? "—" : subscribed}</strong><span>Stores</span></div></div><div className="admin-donut-legend">{summaryUnavailable ? <div><i className="admin-plan-dot" /><span><strong>—</strong>Unavailable</span></div> : configuredPlans.map((plan) => <div key={plan.id}><i className={`admin-plan-dot admin-plan-dot--${plan.tone}`} /><span><strong>{plan.subscribed}</strong>{plan.name}</span></div>)}</div></div><button type="button" className="admin-side-link" onClick={() => onToast(`${subscribed} Store plan assignments are represented in this distribution.`)}>{isDemo ? "View subscriptions" : "View assignments"} <PiArrowRight /></button></article><article className="admin-page-card admin-ops-side-card admin-billing-health"><h2>Billing Health</h2><dl><div><dt>Paid subscriptions</dt><dd>{isDemo ? 44 : "—"}</dd></div><div><dt>Past due</dt><dd className="is-danger">{isDemo ? 4 : "—"}</dd></div><div><dt>Collection rate</dt><dd>{isDemo ? "97.2%" : "—"}</dd></div><div><dt>Next payout</dt><dd>{isDemo ? "08 Aug" : "—"}</dd></div></dl><div className="admin-ops-health-line"><i className={`admin-page-status-dot${isDemo ? "" : " admin-page-status-dot--muted"}`} />{isDemo ? "Billing systems operational" : "Billing data unavailable"}</div><button type="button" className="admin-side-link" disabled={!isDemo} title={!isDemo ? "No billing service is connected" : undefined} onClick={() => demoAction("billing center opened.")}>Open billing center <PiArrowRight /></button></article></aside>
        </div>
      ) : (
        <article className="admin-page-card admin-plan-secondary-panel">
          <header><h2>{tab}</h2><p>{isDemo ? `Interactive ${tab.toLowerCase()} preview` : `${tab} data is not available from the portfolio service.`}</p></header>
          {tab === "Feature Matrix" ? <div className="admin-feature-matrix"><div><strong>Feature</strong>{configuredPlans.map((plan) => <strong key={plan.id}>{plan.name}</strong>)}</div>{featureRows.map((feature) => <div key={feature.label}><span>{feature.label}</span>{configuredPlans.map((plan) => <span key={plan.id}>{isDemo ? plan.features.some(feature.matches) ? "Included" : "—" : "Unavailable"}</span>)}</div>)}</div> : tab === "Coupons" ? <div className="admin-ops-empty">{isDemo ? "No active demo coupons. Create and assign coupons from the billing center." : "Coupon operations are unavailable."}</div> : <div className="admin-ops-empty">{isDemo ? "Recent billing records are available in the demo billing center." : "Billing history is unavailable."}</div>}
        </article>
      )}
    </section>
  )
}
