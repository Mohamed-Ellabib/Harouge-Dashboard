import {
  PiArrowRight,
  PiCaretLeft,
  PiCaretRight,
  PiCopy,
  PiDotsThree,
  PiEye,
  PiKey,
  PiMagnifyingGlass,
  PiPlus,
  PiShieldCheck,
  PiSlidersHorizontal,
  PiSpinnerGap,
  PiStorefront,
  PiUploadSimple,
  PiUsersThree,
  PiWarningCircle,
} from "react-icons/pi"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"

import {
  createPlatformMerchantMembership,
  listPlatformMerchantMemberships,
  resetPlatformMerchantPassword,
  revokePlatformMerchantSessions,
  updatePlatformMerchantAccountStatus,
  updatePlatformMerchantMembership,
} from "../api"
import { adminDemoVendors, type AdminDemoVendor } from "../admin-control-plane-demo"
import { navigateDashboardDetail } from "../routing"
import type {
  CreatePlatformMerchantMembershipRequest,
  PlatformMerchantAccessStatus,
  PlatformMerchantAccountStatus,
  PlatformMerchantMembership,
  PlatformMerchantMembershipList,
  PlatformMerchantMembershipRole,
  PlatformPortfolio,
  UpdatePlatformMerchantMembershipRequest,
} from "../types"
import {
  AddVendorDialog,
  VendorAccessDrawer,
  VendorConfirmationDialog,
  VendorPasswordDialog,
  type VendorStoreOption,
} from "./AdminVendorDialogs"

import "./admin-stores-vendors.css"

type AdminVendorsPageProps = {
  isDemo: boolean
  portfolio: PlatformPortfolio | null
  loading: boolean
  onToast: (message: string) => void
  onRefresh?: () => Promise<void>
}

type LoadState = "loading" | "ready" | "failed"
type ConfirmAction =
  | { kind: "revoke" }
  | { kind: "account"; status: PlatformMerchantAccessStatus }

const PAGE_SIZE = 5
const EXPORT_BATCH_SIZE = 100

function cleanReferenceText(value: string): string {
  return value.replace(/Ã¢â‚¬â€œ/g, "–").replace(/Ã‚Â·/g, "·")
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function planLabel(plan: PlatformMerchantMembership["store"]["plan_code"]): string {
  if (!plan) return "Unavailable"
  return plan === "professional_commerce" ? "Professional" : "Starter"
}

function formatJoined(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function displayName(membership: PlatformMerchantMembership): string {
  return membership.display_name?.trim() || membership.email?.split("@")[0] || "Unavailable merchant"
}

function initialsFor(membership: PlatformMerchantMembership): string {
  return displayName(membership)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "VA"
}

function demoMembership(vendor: AdminDemoVendor, index: number): PlatformMerchantMembership {
  const disabled = vendor.status === "Suspended"
  return {
    id: vendor.id,
    email: vendor.email,
    display_name: vendor.name,
    role: vendor.role === "Manager" ? "manager" : "owner",
    status: disabled ? "disabled" : "active",
    account_status: disabled ? "disabled" : "active",
    effective_access: disabled ? "disabled" : "active",
    joined_at: new Date(`${vendor.joined} 12:00:00 UTC`).toISOString(),
    store: {
      id: `demo-store-${index + 1}`,
      name: cleanReferenceText(vendor.store),
      handle: vendor.store.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      status: "active",
      plan_code: vendor.plan === "Starter" ? "starter_whatsapp" : "professional_commerce",
    },
    account_store_count: 1,
  }
}

const demoMemberships = adminDemoVendors.map(demoMembership)

function csvCell(value: string): string {
  const safe = /^[=+@-]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

function downloadVendorCsv(rows: PlatformMerchantMembership[]): void {
  const header = ["Vendor", "Email", "Store", "Store Handle", "Role", "Plan", "Store Access", "Account Status", "Joined"]
  const content = [
    header.map(csvCell).join(","),
    ...rows.map((row) => [
      displayName(row),
      row.email ?? "Unavailable",
      row.store.name ?? "Unavailable Store",
      row.store.handle ?? "Unavailable",
      titleCase(row.role),
      planLabel(row.store.plan_code),
      titleCase(row.effective_access),
      titleCase(row.account_status),
      formatJoined(row.joined_at),
    ].map(csvCell).join(",")),
  ].join("\r\n")
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "labibtech-vendor-access.csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function donutStyle(active: number, disabled: number): CSSProperties {
  const total = Math.max(active + disabled, 1)
  const activeStop = (active / total) * 100
  return {
    background: `conic-gradient(#13ac79 0 ${Math.max(activeStop - 0.5, 0)}%, #fff ${Math.max(activeStop - 0.5, 0)}% ${Math.min(activeStop + 0.5, 100)}%, #ee353d ${Math.min(activeStop + 0.5, 100)}% 100%)`,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed."
}

async function requestFingerprint(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function paginationItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 2) return [1, 2, 3, "ellipsis", totalPages]
  if (page >= totalPages - 1) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages]
  return [1, "ellipsis", page, "ellipsis", totalPages]
}

export function AdminVendorsPage({
  isDemo,
  portfolio,
  loading: portfolioLoading,
  onToast,
  onRefresh,
}: AdminVendorsPageProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [role, setRole] = useState<"" | PlatformMerchantMembershipRole>("")
  const [status, setStatus] = useState<"" | PlatformMerchantAccessStatus>("")
  const [accountStatus, setAccountStatus] = useState<"" | PlatformMerchantAccountStatus>("")
  const [page, setPage] = useState(1)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [listState, setListState] = useState<LoadState>(isDemo ? "ready" : "loading")
  const [listError, setListError] = useState<string | null>(null)
  const [data, setData] = useState<PlatformMerchantMembershipList | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PlatformMerchantMembership | null>(null)
  const [mutationSubmitting, setMutationSubmitting] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const addAttempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const rowTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const focusReturnRow = useRef<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 260)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => setPage(1), [debouncedQuery, role, status, accountStatus])

  const demoFiltered = useMemo(() => {
    const normalized = debouncedQuery.toLowerCase()
    return demoMemberships.filter((membership) => {
      const matchesQuery = !normalized || [displayName(membership), membership.email, membership.store.name, membership.store.handle]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized))
      return matchesQuery && (!role || membership.role === role) && (!status || membership.effective_access === status) && (!accountStatus || membership.account_status === accountStatus)
    })
  }, [accountStatus, debouncedQuery, role, status])

  useEffect(() => {
    if (isDemo) return
    const controller = new AbortController()
    setListState("loading")
    setListError(null)
    void listPlatformMerchantMemberships({
      q: debouncedQuery,
      role: role || undefined,
      effective_access: status || undefined,
      account_status: accountStatus || undefined,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      signal: controller.signal,
    }).then((nextData) => {
      setData(nextData)
      setListState("ready")
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return
      setListError(errorMessage(error))
      setListState("failed")
    })
    return () => controller.abort()
  }, [accountStatus, debouncedQuery, isDemo, page, refreshVersion, role, status])

  const rows = isDemo
    ? demoFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : data?.memberships ?? []
  const count = isDemo ? demoFiltered.length : data?.count ?? 0
  const demoFiltersActive = Boolean(debouncedQuery || role || status || accountStatus)
  const filteredDemoSummary = {
    total_memberships: demoFiltered.length,
    distinct_accounts: new Set(demoFiltered.map((membership) => membership.email ?? membership.id)).size,
    active_access: demoFiltered.filter((membership) => membership.effective_access === "active").length,
    disabled_access: demoFiltered.filter((membership) => membership.effective_access === "disabled").length,
    owner_memberships: demoFiltered.filter((membership) => membership.role === "owner").length,
    manager_memberships: demoFiltered.filter((membership) => membership.role === "manager").length,
  }
  const summary = isDemo
    ? demoFiltersActive
      ? filteredDemoSummary
      : { total_memberships: 126, distinct_accounts: 126, active_access: 121, disabled_access: 5, owner_memberships: 96, manager_memberships: 30 }
    : data?.summary ?? { total_memberships: 0, distinct_accounts: 0, active_access: 0, disabled_access: 0, owner_memberships: 0, manager_memberships: 0 }
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const storeOptions = useMemo<VendorStoreOption[]>(() => {
    if (isDemo) {
      return demoMemberships.map((membership) => ({
        id: membership.store.id,
        name: membership.store.name ?? "Unavailable Store",
        handle: membership.store.handle ?? "unavailable",
        status: membership.store.status ?? "unavailable",
      }))
    }
    return (portfolio?.clients ?? []).flatMap((client) => client.stores.map((store) => ({
      id: store.id,
      name: store.name,
      handle: store.handle,
      status: store.status,
    })))
  }, [isDemo, portfolio])

  const roleCounts = {
    owners: summary.owner_memberships,
    managers: summary.manager_memberships,
  }

  const refresh = useCallback(async () => {
    setRefreshVersion((value) => value + 1)
    if (onRefresh) await onRefresh()
  }, [onRefresh])

  const demoAction = useCallback(() => {
    onToast("Preview mode is read-only. Sign in to manage real vendor access.")
  }, [onToast])

  const resetFilters = () => {
    setQuery("")
    setRole("")
    setStatus("")
    setAccountStatus("")
    setPage(1)
    onToast("Vendor filters cleared.")
  }

  const copyEmail = async (membership: PlatformMerchantMembership) => {
    if (!membership.email) {
      onToast("This merchant account has no available email address.")
      setOpenRow(null)
      window.requestAnimationFrame(() => rowTriggerRefs.current.get(membership.id)?.focus())
      return
    }
    try {
      await navigator.clipboard.writeText(membership.email)
      onToast(`${membership.email} copied to the clipboard.`)
    } catch {
      onToast(`Email: ${membership.email}`)
    }
    setOpenRow(null)
    window.requestAnimationFrame(() => rowTriggerRefs.current.get(membership.id)?.focus())
  }

  const exportRows = async () => {
    if (isDemo) {
      downloadVendorCsv(demoFiltered)
      onToast(`${demoFiltered.length} Store access ${demoFiltered.length === 1 ? "row" : "rows"} exported.`)
      return
    }
    setExporting(true)
    try {
      const exportedRows: PlatformMerchantMembership[] = []
      let offset = 0
      let expectedCount: number | null = null
      while (expectedCount === null || offset < expectedCount) {
        const batch = await listPlatformMerchantMemberships({
          q: debouncedQuery,
          role: role || undefined,
          effective_access: status || undefined,
          account_status: accountStatus || undefined,
          offset,
          limit: EXPORT_BATCH_SIZE,
        })
        expectedCount = batch.count
        exportedRows.push(...batch.memberships)
        if (!batch.memberships.length) break
        offset += batch.memberships.length
      }
      downloadVendorCsv(exportedRows)
      onToast(`${exportedRows.length} Store access ${exportedRows.length === 1 ? "row" : "rows"} exported.`)
    } catch (error) {
      onToast(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  const addMembership = async (storeId: string, request: CreatePlatformMerchantMembershipRequest): Promise<boolean> => {
    if (isDemo) {
      demoAction()
      return false
    }
    setAddSubmitting(true)
    setAddError(null)
    try {
      const fingerprint = await requestFingerprint({ storeId, request })
      if (addAttempt.current?.fingerprint !== fingerprint) {
        addAttempt.current = {
          fingerprint,
          key: `labibtech-membership-${crypto.randomUUID()}`,
        }
      }
      const result = await createPlatformMerchantMembership(
        storeId,
        request,
        addAttempt.current.key,
      )
      addAttempt.current = null
      setAddOpen(false)
      setPage(1)
      await refresh()
      onToast(result.replayed
        ? `${displayName(result.membership)} already has the requested Store access.`
        : `${displayName(result.membership)} now has access to ${result.membership.store.name ?? "the selected Store"}.`)
      return true
    } catch (error) {
      setAddError(errorMessage(error))
      return false
    } finally {
      setAddSubmitting(false)
    }
  }

  const saveMembership = async (request: UpdatePlatformMerchantMembershipRequest) => {
    if (!selected) return
    if (isDemo) {
      demoAction()
      return
    }
    setMutationSubmitting(true)
    setMutationError(null)
    try {
      const result = await updatePlatformMerchantMembership(selected.id, request)
      setSelected(result.membership)
      await refresh()
      onToast("Store access updated.")
    } catch (error) {
      setMutationError(errorMessage(error))
    } finally {
      setMutationSubmitting(false)
    }
  }

  const confirmMutation = async () => {
    if (!selected || !confirmAction) return
    if (isDemo) {
      demoAction()
      setConfirmAction(null)
      return
    }
    setMutationSubmitting(true)
    setMutationError(null)
    const closesAccessDrawer = confirmAction.kind === "account"
    try {
      if (confirmAction.kind === "revoke") {
        const result = await revokePlatformMerchantSessions(selected.id)
        onToast(`Sessions revoked across ${result.affected_store_count} Store ${result.affected_store_count === 1 ? "assignment" : "assignments"}.`)
      } else {
        const result = await updatePlatformMerchantAccountStatus(selected.id, confirmAction.status)
        setSelected(null)
        onToast(result.account.status === "disabled"
          ? `Merchant account suspended across ${result.affected_store_count} Store ${result.affected_store_count === 1 ? "assignment" : "assignments"}.`
          : `Merchant account reactivated for ${result.affected_store_count} Store ${result.affected_store_count === 1 ? "assignment" : "assignments"}.`)
      }
      setConfirmAction(null)
      if (closesAccessDrawer) restoreRowFocus()
      await refresh()
    } catch (error) {
      setMutationError(errorMessage(error))
    } finally {
      setMutationSubmitting(false)
    }
  }

  const resetPassword = async (temporaryPassword: string): Promise<boolean> => {
    if (!selected) return false
    if (isDemo) {
      demoAction()
      return false
    }
    setMutationSubmitting(true)
    setMutationError(null)
    try {
      const result = await resetPlatformMerchantPassword(selected.id, temporaryPassword)
      setPasswordOpen(false)
      await refresh()
      onToast(`Temporary password set and sessions revoked across ${result.affected_store_count} Store ${result.affected_store_count === 1 ? "assignment" : "assignments"}.`)
      return true
    } catch (error) {
      setMutationError(errorMessage(error))
      return false
    } finally {
      setMutationSubmitting(false)
    }
  }

  const activePercent = summary.total_memberships
    ? ((summary.active_access / summary.total_memberships) * 100).toFixed(1)
    : "0.0"
  const showingFrom = count ? (page - 1) * PAGE_SIZE + 1 : 0
  const showingTo = Math.min(page * PAGE_SIZE, count)
  const isLoading = !isDemo && listState === "loading"

  const restoreRowFocus = () => {
    const rowId = focusReturnRow.current
    focusReturnRow.current = null
    if (!rowId) return
    window.requestAnimationFrame(() => rowTriggerRefs.current.get(rowId)?.focus())
  }

  const closeAccessDrawer = () => {
    if (mutationSubmitting) return
    setSelected(null)
    setMutationError(null)
    restoreRowFocus()
  }

  return (
    <>
      <section className="admin-store-vendor-page admin-vendor-page" aria-labelledby="admin-vendors-title">
        <header className="admin-page-heading">
          <div className="admin-page-heading__copy"><h1 id="admin-vendors-title">Vendors</h1><p>Manage Store owners, teams and platform access</p></div>
          <div className="admin-page-actions">
            <button type="button" className="admin-page-button" disabled={exporting} onClick={() => void exportRows()}>{exporting ? <PiSpinnerGap className="vendor-access-spin" /> : <PiUploadSimple />}{exporting ? "Exporting" : "Export"}</button>
            <button type="button" className="admin-page-button admin-page-button--primary" onClick={() => { setAddError(null); setAddOpen(true) }}><PiPlus />Add New Vendor</button>
          </div>
        </header>

        <div className="admin-page-kpis" aria-label="Vendor access summary">
          <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon"><PiUsersThree /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Total Vendors</div><strong>{isLoading ? "—" : summary.distinct_accounts}</strong><p>Distinct merchant accounts</p></div></article>
          <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--green"><PiShieldCheck /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Active Access</div><strong>{isLoading ? "—" : summary.active_access}</strong><p><span className="admin-page-status-dot" /><span className="admin-page-percent">{activePercent}%</span></p></div></article>
          <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--blue"><PiStorefront /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Store Access</div><strong>{isLoading ? "—" : summary.total_memberships}</strong><p>Store-scoped memberships</p></div></article>
          <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--red"><PiShieldCheck /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Disabled <span className="admin-page-status-dot admin-page-status-dot--red" /></div><strong>{isLoading ? "—" : summary.disabled_access}</strong><p>Access currently blocked</p></div></article>
        </div>

        <div className="admin-directory-layout">
          <article className="admin-page-card admin-directory-table-card">
            <div className="admin-directory-toolbar">
              <div><h2>All Vendor Access</h2><p>{isLoading ? "Loading Store access…" : `${count} Store ${count === 1 ? "membership" : "memberships"} match these filters`}</p></div>
              <div className="admin-directory-filters admin-vendor-filters">
                <label className="admin-page-search"><PiMagnifyingGlass /><input maxLength={120} value={query} onChange={(event) => setQuery(event.target.value.slice(0, 120))} placeholder="Search vendors…" aria-label="Search vendors" /></label>
                <select className="admin-page-select" value={role} onChange={(event) => setRole(event.target.value as "" | PlatformMerchantMembershipRole)} aria-label="Filter vendors by role"><option value="">All Roles</option><option value="owner">Owner</option><option value="manager">Manager</option></select>
                <select className="admin-page-select" value={status} onChange={(event) => setStatus(event.target.value as "" | PlatformMerchantAccessStatus)} aria-label="Filter by Store access"><option value="">All Access</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
                <button type="button" className="admin-page-filter-button" aria-label="More vendor filters" aria-expanded={advancedFiltersOpen} onClick={() => setAdvancedFiltersOpen((value) => !value)}><PiSlidersHorizontal /></button>
                {advancedFiltersOpen ? <div className="admin-vendor-filter-popover"><label><span>Account status</span><select className="admin-page-select" value={accountStatus} onChange={(event) => setAccountStatus(event.target.value as "" | PlatformMerchantAccountStatus)}><option value="">All Accounts</option><option value="active">Account active</option><option value="disabled">Account disabled</option><option value="unavailable">Account unavailable</option></select></label><button type="button" onClick={() => { resetFilters(); setAdvancedFiltersOpen(false) }}>Clear all filters</button></div> : null}
              </div>
            </div>

            <div className="admin-directory-scroll" role="region" aria-label="Scrollable vendor Store access" tabIndex={0}>
            <div className="admin-directory-table" role="table" aria-label="Vendor Store access">
              <div className="admin-directory-row admin-directory-row--head admin-vendor-row" role="row"><span>Vendor</span><span>Store</span><span>Role</span><span>Plan</span><span>Access</span><span>Joined</span><span /></div>
              {listState === "failed" && !isDemo ? (
                <div className="admin-directory-load-error" role="alert"><PiWarningCircle /><strong>Vendor access could not be loaded</strong><span>{listError}</span><button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>Retry</button></div>
              ) : rows.length ? rows.map((membership) => {
                const name = displayName(membership)
                const active = membership.effective_access === "active"
                const demoVendor = isDemo ? adminDemoVendors.find((vendor) => vendor.id === membership.id) : null
                return (
                  <div className="admin-directory-row admin-vendor-row" role="row" key={membership.id}>
                    <div className="admin-directory-primary">
                      {demoVendor ? <img src={demoVendor.avatar} alt="" /> : <span className="admin-directory-avatar admin-vendor-initials" aria-hidden="true">{initialsFor(membership)}</span>}
                      <div><strong>{name}</strong><span>{membership.email ?? "Email unavailable"}</span></div>
                    </div>
                    <span className="admin-directory-cell" title={membership.store.name ?? "Unavailable Store"}>{membership.store.name ?? "Unavailable Store"}</span>
                    <span className="admin-page-pill">{titleCase(membership.role)}</span>
                    <span className={`admin-page-pill${membership.store.plan_code === "professional_commerce" ? " admin-page-pill--blue" : ""}`}>{planLabel(membership.store.plan_code)}</span>
                    <span className="admin-directory-status" title={membership.account_status === "disabled" ? "The merchant account is disabled globally" : membership.account_status === "unavailable" ? "The merchant account data is unavailable" : undefined}><i className={`admin-page-status-dot admin-page-status-dot--${active ? "green" : "red"}`} />{active ? "Active" : "Disabled"}</span>
                    <span>{formatJoined(membership.joined_at)}</span>
                    <div className="admin-directory-more-wrap">
                      <button ref={(element) => { if (element) rowTriggerRefs.current.set(membership.id, element); else rowTriggerRefs.current.delete(membership.id) }} type="button" className="admin-directory-more" aria-label={`Actions for ${name} at ${membership.store.name ?? "Unavailable Store"}`} aria-expanded={openRow === membership.id} onClick={(event) => { event.stopPropagation(); setOpenRow((current) => current === membership.id ? null : membership.id) }}><PiDotsThree /></button>
                      {openRow === membership.id ? <div className="admin-directory-row-menu"><button type="button" onClick={() => { navigateDashboardDetail("vendor-accounts", membership.id); setOpenRow(null) }}><PiEye />View details</button><button type="button" onClick={() => { focusReturnRow.current = membership.id; setMutationError(null); setSelected(membership); setOpenRow(null) }}><PiShieldCheck />Manage access</button><button type="button" onClick={() => void copyEmail(membership)}><PiCopy />Copy email</button><button disabled={membership.account_status === "unavailable"} type="button" onClick={() => { if (isDemo) { demoAction(); setOpenRow(null); window.requestAnimationFrame(() => rowTriggerRefs.current.get(membership.id)?.focus()); return } focusReturnRow.current = membership.id; setMutationError(null); setSelected(membership); setPasswordOpen(true); setOpenRow(null) }}><PiKey />{membership.account_status === "unavailable" ? "Account unavailable" : "Reset password"}</button></div> : null}
                    </div>
                  </div>
                )
              }) : <div className="admin-directory-empty">{isLoading ? "Loading vendor access…" : "No Store memberships match these filters."}</div>}
            </div>

            <footer className="admin-directory-footer">
              <span>{count ? `Showing ${showingFrom}–${showingTo} of ${count} Store memberships` : "Showing 0 Store memberships"}</span>
              <div className="admin-pagination" aria-label="Vendor pages">
                <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><PiCaretLeft /></button>
                {paginationItems(page, totalPages).map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`}>…</span> : <button type="button" key={item} className={page === item ? "is-active" : undefined} aria-current={page === item ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>)}
                <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><PiCaretRight /></button>
              </div>
            </footer>
            </div>
          </article>

          <aside className="admin-directory-side">
            <article className="admin-page-card admin-side-card">
              <h2>Access Status</h2>
              <div className="admin-donut-layout">
                <div className="admin-donut" style={donutStyle(summary.active_access, summary.disabled_access)}><div className="admin-donut__label"><strong>{summary.total_memberships}</strong><span>Store access</span></div></div>
                <div className="admin-donut-legend"><div><i className="admin-page-status-dot" /><span><strong>{summary.active_access}</strong>Active</span></div><div><i className="admin-page-status-dot admin-page-status-dot--red" /><span><strong>{summary.disabled_access}</strong>Disabled</span></div></div>
              </div>
            </article>
            <article className="admin-page-card admin-side-card">
              <div className="admin-side-card__heading"><h2>Access Roles</h2><span>All matches</span></div>
              <div className="admin-progress-list">
                {[{ label: "Owners", count: roleCounts.owners }, { label: "Managers", count: roleCounts.managers }].map((item) => <div className="admin-progress-item" key={item.label}><div className="admin-progress-item__label"><span>{item.label}</span><strong>{item.count}</strong></div><div className="admin-progress-track"><span style={{ width: `${summary.total_memberships ? Math.max((item.count / summary.total_memberships) * 100, item.count ? 8 : 0) : 0}%` }} /></div></div>)}
                <button type="button" className="admin-side-link" onClick={() => setAddOpen(true)}>Add vendor access <PiArrowRight /></button>
              </div>
            </article>
          </aside>
        </div>
      </section>

      <AddVendorDialog isDemo={isDemo} open={addOpen} stores={storeOptions} submitting={addSubmitting || portfolioLoading} error={addError} onClose={() => { if (!addSubmitting) { addAttempt.current = null; setAddOpen(false) } }} onSubmit={addMembership} onDemoAction={demoAction} />
      <VendorAccessDrawer isDemo={isDemo} membership={selected} saving={mutationSubmitting} error={mutationError} onClose={closeAccessDrawer} onSave={saveMembership} onRevokeSessions={() => { setMutationError(null); setConfirmAction({ kind: "revoke" }) }} onResetPassword={() => { setMutationError(null); setPasswordOpen(true) }} onAccountStatus={(nextStatus) => { setMutationError(null); setConfirmAction({ kind: "account", status: nextStatus }) }} onDemoAction={demoAction} />
      <VendorConfirmationDialog open={Boolean(confirmAction)} title={confirmAction?.kind === "revoke" ? "Revoke all sessions?" : confirmAction?.status === "disabled" ? "Suspend this account?" : "Reactivate this account?"} message={confirmAction?.kind === "revoke" ? "The merchant will be signed out of every Store session and must sign in again." : confirmAction?.status === "disabled" ? "This disables sign-in and effective access across every Store assigned to this account." : "Sign-in will be restored for Store assignments that are still active."} confirmLabel={confirmAction?.kind === "revoke" ? "Revoke Sessions" : confirmAction?.status === "disabled" ? "Suspend Account" : "Reactivate Account"} danger={confirmAction?.kind === "account" && confirmAction.status === "disabled"} submitting={mutationSubmitting} error={mutationError} onCancel={() => { if (!mutationSubmitting) { setConfirmAction(null); setMutationError(null) } }} onConfirm={confirmMutation} />
      <VendorPasswordDialog open={passwordOpen} submitting={mutationSubmitting} error={mutationError} onCancel={() => { if (!mutationSubmitting) { setPasswordOpen(false); setMutationError(null) } }} onSubmit={resetPassword} />
    </>
  )
}
