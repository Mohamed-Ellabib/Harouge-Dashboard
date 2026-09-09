import {
  PiArrowRight,
  PiCheckCircle,
  PiKey,
  PiLockKey,
  PiShieldCheck,
  PiSpinnerGap,
  PiStorefront,
  PiUserCircle,
  PiWarningCircle,
  PiX,
} from "react-icons/pi"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import type {
  CreatePlatformMerchantMembershipRequest,
  PlatformMerchantAccessStatus,
  PlatformMerchantMembership,
  PlatformMerchantMembershipRole,
  UpdatePlatformMerchantMembershipRequest,
} from "../types"

import "./admin-vendor-access.css"

export type VendorStoreOption = {
  id: string
  name: string
  handle: string
  status: string
}

let vendorDialogSequence = 0
const vendorDialogStack: string[] = []
const vendorDialogStackListeners = new Set<() => void>()
let bodyOverflowBeforeVendorDialogs: string | null = null
let rootAriaHiddenBeforeVendorDialogs: string | null = null
let rootWasInertBeforeVendorDialogs = false

function notifyVendorDialogStack(): void {
  vendorDialogStackListeners.forEach((listener) => listener())
}

function lockVendorDialogBackground(): void {
  if (vendorDialogStack.length !== 1) return
  bodyOverflowBeforeVendorDialogs = document.body.style.overflow
  document.body.style.overflow = "hidden"
  const root = document.getElementById("root")
  if (!root) return
  rootAriaHiddenBeforeVendorDialogs = root.getAttribute("aria-hidden")
  rootWasInertBeforeVendorDialogs = root.hasAttribute("inert")
  root.setAttribute("aria-hidden", "true")
  root.setAttribute("inert", "")
}

function unlockVendorDialogBackground(): void {
  if (vendorDialogStack.length) return
  document.body.style.overflow = bodyOverflowBeforeVendorDialogs ?? ""
  bodyOverflowBeforeVendorDialogs = null
  const root = document.getElementById("root")
  if (!root) return
  if (rootAriaHiddenBeforeVendorDialogs === null) root.removeAttribute("aria-hidden")
  else root.setAttribute("aria-hidden", rootAriaHiddenBeforeVendorDialogs)
  if (!rootWasInertBeforeVendorDialogs) root.removeAttribute("inert")
  rootAriaHiddenBeforeVendorDialogs = null
  rootWasInertBeforeVendorDialogs = false
}

function useVendorDialogStack(dialogId: string): boolean {
  const [, update] = useState(0)

  useEffect(() => {
    const listener = () => update((value) => value + 1)
    vendorDialogStackListeners.add(listener)
    vendorDialogStack.push(dialogId)
    lockVendorDialogBackground()
    notifyVendorDialogStack()

    return () => {
      vendorDialogStackListeners.delete(listener)
      const index = vendorDialogStack.lastIndexOf(dialogId)
      if (index >= 0) vendorDialogStack.splice(index, 1)
      unlockVendorDialogBackground()
      notifyVendorDialogStack()
    }
  }, [dialogId])

  return vendorDialogStack[vendorDialogStack.length - 1] === dialogId
}

type DialogFrameProps = {
  children: ReactNode
  className?: string
  labelledBy: string
  onClose: () => void
}

function DialogFrame({ children, className = "", labelledBy, onClose }: DialogFrameProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [dialogId] = useState(() => `vendor-dialog-${++vendorDialogSequence}`)
  const previousActive = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  const onCloseRef = useRef(onClose)
  const hasFocused = useRef(false)
  const isTopDialog = useVendorDialogStack(dialogId)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isTopDialog || hasFocused.current) return
    const dialog = dialogRef.current
    const focusTarget = dialog?.querySelector<HTMLElement>(
      "input:not(:disabled), select:not(:disabled), button:not(:disabled)",
    )
    hasFocused.current = true
    window.setTimeout(() => focusTarget?.focus(), 0)
  }, [isTopDialog])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isTopDialog) dialog.removeAttribute("inert")
    else dialog.setAttribute("inert", "")
  }, [isTopDialog])

  useEffect(() => {
    if (!isTopDialog) return
    const dialog = dialogRef.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab" || !dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])",
        ),
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isTopDialog])

  useEffect(() => () => {
    const previous = previousActive.current
    if (previous?.isConnected) window.requestAnimationFrame(() => previous.focus())
  }, [])

  return createPortal(
    <div className={`vendor-access-backdrop${isTopDialog ? " is-top" : " is-underlay"}`} aria-hidden={isTopDialog ? undefined : true} dir="ltr" onMouseDown={(event) => {
      if (isTopDialog && event.currentTarget === event.target) onCloseRef.current()
    }}>
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`vendor-access-dialog ${className}`}
        ref={dialogRef}
        role="dialog"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

type AddVendorDialogProps = {
  isDemo: boolean
  open: boolean
  stores: VendorStoreOption[]
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (
    storeId: string,
    request: CreatePlatformMerchantMembershipRequest,
  ) => Promise<boolean>
  onDemoAction: () => void
}

export function AddVendorDialog({
  isDemo,
  open,
  stores,
  submitting,
  error,
  onClose,
  onSubmit,
  onDemoAction,
}: AddVendorDialogProps) {
  const availableStores = useMemo(
    () => stores.filter((store) => store.status === "active"),
    [stores],
  )
  const [step, setStep] = useState(1)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [storeId, setStoreId] = useState("")
  const [reuse, setReuse] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<PlatformMerchantMembershipRole>("manager")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setStoreId(availableStores.length === 1 ? availableStores[0].id : "")
    setReuse(false)
    setDisplayName("")
    setEmail("")
    setPassword("")
    setRole("manager")
    setValidationError(null)
  }, [availableStores, open])

  useEffect(() => {
    if (open) {
      headingRef.current?.focus()
      headingRef.current?.closest("form")?.scrollTo(0, 0)
    }
  }, [step, open])

  if (!open) return null

  const close = () => {
    if (submitting) return
    setPassword("")
    setValidationError(null)
    onClose()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setValidationError(null)
    if (step === 2 && !storeId) {
      setValidationError("Choose a Store before granting access.")
      return
    }
    if (!displayName.trim()) {
      setValidationError("Enter the vendor's display name.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError("Enter a valid email address.")
      return
    }
    if (!reuse && password.length < 8) {
      setValidationError("Temporary passwords must contain at least 8 characters.")
      return
    }

    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (!storeId) { setStep(2); setValidationError("Choose a store."); return }
    if (isDemo) { onDemoAction(); return }

    const succeeded = await onSubmit(storeId, {
      email: email.trim(),
      display_name: displayName.trim(),
      role,
      reuse_existing_account: reuse,
      ...(!reuse ? { initial_password: password } : {}),
    })
    if (succeeded) setPassword("")
  }

  return (
    <DialogFrame className="vendor-add-dialog" labelledBy="vendor-add-title" onClose={close}>
      <header className="vendor-access-dialog__header">
        <div>
          <h2 id="vendor-add-title">Add vendor</h2>
          <p>Create or connect an account, then choose its store access.</p>
        </div>
        <button aria-label="Close add vendor dialog" onClick={close} type="button"><PiX /></button>
      </header>
      <form className="vendor-add-form" noValidate onSubmit={(event) => void submit(event)}>
        <ol className="vendor-add-progress" aria-label="Add vendor progress">
          {["Account", "Store access", "Review"].map((label, index) => <li key={label}><button type="button" disabled={submitting || index + 1 > step} aria-current={step === index + 1 ? "step" : undefined} onClick={() => { setStep(index + 1); setValidationError(null) }}><span>{index + 1}</span>{label}</button></li>)}
        </ol>
        <h3 className="vendor-add-step-title" tabIndex={-1} ref={headingRef}>{step === 1 ? "Who are you adding?" : step === 2 ? "Choose their workspace" : "Review vendor access"}</h3>
        {isDemo ? (
          <div className="vendor-access-notice"><PiShieldCheck /><span><strong>Preview is read-only</strong> No account or Store access will be changed.</span></div>
        ) : null}
        {!availableStores.length ? (
          <div className="vendor-access-empty"><PiStorefront /><strong>No available Stores</strong><span>Create or activate a Store before adding vendor access.</span></div>
        ) : (
          <>
            {step === 1 ? <>
            <fieldset className="vendor-account-choice">
              <legend>Merchant account</legend>
              <label className={!reuse ? "is-selected" : undefined}>
                <input checked={!reuse} name="account-mode" onChange={() => setReuse(false)} type="radio" />
                <PiUserCircle />
                <span><strong>Create new account</strong><small>Set a temporary password for first sign-in.</small></span>
              </label>
              <label className={reuse ? "is-selected" : undefined}>
                <input checked={reuse} name="account-mode" onChange={() => { setReuse(true); setPassword("") }} type="radio" />
                <PiCheckCircle />
                <span><strong>Use existing account</strong><small>Add another Store to an existing email.</small></span>
              </label>
            </fieldset>

            <div className="vendor-add-form__grid">
              <label className="vendor-access-field">
                <span>Display name</span>
                <input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Vendor name" />
                {reuse ? <small>Must match the existing account display name exactly.</small> : null}
              </label>
              <label className="vendor-access-field vendor-access-field--wide">
                <span>Email address</span>
                <input autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vendor@example.com" type="email" />
                {reuse ? <small>Must match the same existing merchant account exactly.</small> : null}
              </label>
              {!reuse ? (
                <label className="vendor-access-field vendor-access-field--wide">
                  <span>Temporary password</span>
                  <input autoComplete="new-password" maxLength={1024} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" />
                  <small>Deliver this password privately. It is never displayed again.</small>
                </label>
              ) : null}
            </div>
            </> : null}
            {step === 2 ? <div className="vendor-add-form__grid">
            <label className="vendor-access-field vendor-access-field--wide">
              <span>Store</span>
              <select aria-label="Store" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                <option value="">Choose a store</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name} · {store.handle}</option>
                ))}
              </select>
            </label>

              <label className="vendor-access-field">
                <span>Role</span>
                <select value={role} onChange={(event) => setRole(event.target.value as PlatformMerchantMembershipRole)}>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <p className="vendor-add-role-note">Access applies only to the selected store. The account can have separate roles in other stores.</p>
            </div> : null}
            {step === 3 ? <dl className="vendor-add-review">
              <div><dt>Vendor</dt><dd>{displayName}</dd></div>
              <div><dt>Email</dt><dd>{email}</dd></div>
              <div><dt>Account</dt><dd>{reuse ? "Existing account" : "New account"}</dd></div>
              <div><dt>Store</dt><dd>{availableStores.find(store => store.id === storeId)?.name}</dd></div>
              <div><dt>Role</dt><dd>{role === "owner" ? "Owner" : "Manager"}</dd></div>
              <div><dt>Password</dt><dd>{reuse ? "Unchanged" : "Set · share privately"}</dd></div>
            </dl> : null}
          </>
        )}

        {validationError || error ? (
          <div className="vendor-access-error" role="alert"><PiWarningCircle />{validationError || error}</div>
        ) : null}
        <footer className="vendor-access-dialog__footer">
          <button className="vendor-access-button vendor-access-button--ghost" onClick={() => { if (step === 1) close(); else { setStep(step - 1); setValidationError(null) } }} disabled={submitting} type="button">{step === 1 ? "Cancel" : "Back"}</button>
          <button className="vendor-access-button vendor-access-button--primary" disabled={submitting || !availableStores.length} type="submit">
            {submitting ? <PiSpinnerGap className="vendor-access-spin" /> : <PiArrowRight />}
            {submitting ? "Adding access…" : step === 3 ? "Add vendor" : "Continue"}
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

type VendorAccessDrawerProps = {
  isDemo: boolean
  membership: PlatformMerchantMembership | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (request: UpdatePlatformMerchantMembershipRequest) => Promise<void>
  onRevokeSessions: () => void
  onResetPassword: () => void
  onAccountStatus: (status: PlatformMerchantAccessStatus) => void
  onDemoAction: () => void
}

function planLabel(plan: PlatformMerchantMembership["store"]["plan_code"]): string {
  if (!plan) return "Unavailable"
  return plan === "professional_commerce" ? "Professional" : "Starter"
}

export function VendorAccessDrawer({
  isDemo,
  membership,
  saving,
  error,
  onClose,
  onSave,
  onRevokeSessions,
  onResetPassword,
  onAccountStatus,
  onDemoAction,
}: VendorAccessDrawerProps) {
  const [role, setRole] = useState<PlatformMerchantMembershipRole>("manager")
  const [status, setStatus] = useState<PlatformMerchantAccessStatus>("active")

  useEffect(() => {
    if (!membership) return
    setRole(membership.role)
    setStatus(membership.status)
  }, [membership])

  if (!membership) return null

  const displayName = membership.display_name?.trim() || membership.email?.split("@")[0] || "Unavailable merchant"
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "VA"
  const accountUnavailable = membership.account_status === "unavailable"
  const changed = role !== membership.role || status !== membership.status
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isDemo) {
      onDemoAction()
      return
    }
    if (!changed) return
    await onSave({ role, status })
  }

  return (
    <DialogFrame className="vendor-access-drawer" labelledBy="vendor-access-title" onClose={onClose}>
      <header className="vendor-access-dialog__header">
        <div>
          <h2 id="vendor-access-title">Store Access</h2>
          <p>Account identity and access are managed separately.</p>
        </div>
        <button aria-label="Close vendor access details" onClick={onClose} type="button"><PiX /></button>
      </header>

      <div className="vendor-access-drawer__body">
        {isDemo ? (
          <div className="vendor-access-notice"><PiShieldCheck /><span><strong>Preview is read-only</strong> Controls show the real workflow without changing data.</span></div>
        ) : null}

        <section className="vendor-access-identity" aria-label="Merchant account">
          <span className="vendor-access-initials">{initials}</span>
          <div><strong>{displayName}</strong><span>{membership.email ?? "Email unavailable"}</span></div>
          <i className={`vendor-access-status vendor-access-status--${membership.account_status}`}>{membership.account_status === "active" ? "Account active" : membership.account_status === "disabled" ? "Account disabled" : "Account unavailable"}</i>
        </section>

        <section className="vendor-access-facts" aria-labelledby="vendor-store-facts">
          <h3 id="vendor-store-facts">Access facts</h3>
          <dl>
            <div><dt>Store</dt><dd>{membership.store.name ?? "Unavailable Store"}</dd></div>
            <div><dt>Handle</dt><dd>{membership.store.handle ?? "Unavailable"}</dd></div>
            <div><dt>Store status</dt><dd>{membership.store.status ?? "Unavailable"}</dd></div>
            <div><dt>Plan</dt><dd>{planLabel(membership.store.plan_code)}</dd></div>
            <div><dt>Store assignments</dt><dd>{membership.account_store_count}</dd></div>
            <div><dt>Effective access</dt><dd>{membership.effective_access}</dd></div>
          </dl>
        </section>

        <form className="vendor-access-editor" onSubmit={(event) => void submit(event)}>
          <div className="vendor-access-editor__heading"><div><h3>This Store</h3><p>Change only this Store assignment.</p></div></div>
          <div className="vendor-access-editor__grid">
            <label className="vendor-access-field"><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as PlatformMerchantMembershipRole)}><option value="owner">Owner</option><option value="manager">Manager</option></select></label>
            <label className="vendor-access-field"><span>Store access</span><select value={status} onChange={(event) => setStatus(event.target.value as PlatformMerchantAccessStatus)}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
          </div>
          <button className="vendor-access-button vendor-access-button--primary vendor-access-button--full" disabled={saving || (!changed && !isDemo)} type="submit">
            {saving ? <PiSpinnerGap className="vendor-access-spin" /> : <PiShieldCheck />}
            {saving ? "Saving…" : "Save Store Access"}
          </button>
        </form>

        {error ? <div className="vendor-access-error" role="alert"><PiWarningCircle />{error}</div> : null}

        <section className="vendor-account-actions" aria-labelledby="vendor-account-controls">
          <div className="vendor-access-editor__heading"><div><h3 id="vendor-account-controls">Account controls</h3><p>These actions affect sign-in beyond this Store.</p></div></div>
          <button disabled={accountUnavailable} type="button" onClick={isDemo ? onDemoAction : onResetPassword}><PiKey /><span><strong>Set temporary password</strong><small>{accountUnavailable ? "Account data is unavailable." : "Require a new password at next sign-in."}</small></span><PiArrowRight /></button>
          <button disabled={accountUnavailable} type="button" onClick={isDemo ? onDemoAction : onRevokeSessions}><PiLockKey /><span><strong>Revoke all sessions</strong><small>{accountUnavailable ? "Account data is unavailable." : "Sign the merchant out of every active session."}</small></span><PiArrowRight /></button>
          <button disabled={accountUnavailable} className={membership.account_status === "active" ? "is-danger" : accountUnavailable ? undefined : "is-positive"} type="button" onClick={isDemo ? onDemoAction : () => onAccountStatus(membership.account_status === "active" ? "disabled" : "active")}><PiShieldCheck /><span><strong>{membership.account_status === "active" ? "Suspend account" : membership.account_status === "disabled" ? "Reactivate account" : "Account unavailable"}</strong><small>{membership.account_status === "active" ? "Disable sign-in across all Store assignments." : membership.account_status === "disabled" ? "Allow sign-in for active Store assignments." : "Repair the merchant account before changing access."}</small></span><PiArrowRight /></button>
        </section>
      </div>
    </DialogFrame>
  )
}

type ConfirmationDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function VendorConfirmationDialog({ open, title, message, confirmLabel, danger = false, submitting, error, onCancel, onConfirm }: ConfirmationDialogProps) {
  if (!open) return null
  return (
    <DialogFrame className="vendor-confirm-dialog" labelledBy="vendor-confirm-title" onClose={onCancel}>
      <div className={`vendor-confirm-dialog__icon${danger ? " is-danger" : ""}`}><PiWarningCircle /></div>
      <h2 id="vendor-confirm-title">{title}</h2>
      <p>{message}</p>
      {error ? <div className="vendor-access-error" role="alert"><PiWarningCircle />{error}</div> : null}
      <div className="vendor-confirm-dialog__actions">
        <button className="vendor-access-button vendor-access-button--ghost" onClick={onCancel} type="button">Cancel</button>
        <button className={`vendor-access-button ${danger ? "vendor-access-button--danger" : "vendor-access-button--primary"}`} disabled={submitting} onClick={() => void onConfirm()} type="button">{submitting ? <PiSpinnerGap className="vendor-access-spin" /> : null}{submitting ? "Working…" : confirmLabel}</button>
      </div>
    </DialogFrame>
  )
}

type PasswordDialogProps = {
  open: boolean
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (temporaryPassword: string) => Promise<boolean>
}

export function VendorPasswordDialog({ open, submitting, error, onCancel, onSubmit }: PasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setPassword("")
      setValidationError(null)
    }
  }, [open])
  if (!open) return null

  const close = () => {
    if (submitting) return
    setPassword("")
    setValidationError(null)
    onCancel()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) {
      setValidationError("Temporary passwords must contain at least 8 characters.")
      return
    }
    setValidationError(null)
    const succeeded = await onSubmit(password)
    if (succeeded) setPassword("")
  }

  return (
    <DialogFrame className="vendor-password-dialog" labelledBy="vendor-password-title" onClose={close}>
      <header className="vendor-access-dialog__header"><div><h2 id="vendor-password-title">Set Temporary Password</h2><p>All current sessions will be invalidated.</p></div><button aria-label="Close password dialog" onClick={close} type="button"><PiX /></button></header>
      <form onSubmit={(event) => void submit(event)}>
        <div className="vendor-password-dialog__content">
          <div className="vendor-access-notice"><PiLockKey /><span><strong>Private handoff required</strong> Share the password outside the platform and ask the merchant to change it immediately.</span></div>
          <label className="vendor-access-field"><span>Temporary password</span><input autoComplete="new-password" maxLength={1024} minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" value={password} /></label>
          {validationError || error ? <div className="vendor-access-error" role="alert"><PiWarningCircle />{validationError || error}</div> : null}
        </div>
        <footer className="vendor-access-dialog__footer"><button className="vendor-access-button vendor-access-button--ghost" onClick={close} type="button">Cancel</button><button className="vendor-access-button vendor-access-button--primary" disabled={submitting} type="submit">{submitting ? <PiSpinnerGap className="vendor-access-spin" /> : <PiKey />}{submitting ? "Saving…" : "Set Password"}</button></footer>
      </form>
    </DialogFrame>
  )
}
