import {
  PiArrowClockwise,
  PiCheckCircle,
  PiImage,
  PiPalette,
  PiSpinnerGap,
  PiStorefront,
  PiUploadSimple,
  PiWarningCircle,
  PiX,
} from "react-icons/pi"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { createPortal } from "react-dom"

import {
  getPlatformStoreConfiguration,
  savePlatformStoreConfiguration,
  uploadPlatformImage,
} from "../api"
import type {
  PlatformStore,
  PlatformStoreConfiguration,
  PlatformStoreConfigurationRecord,
  PlatformStoreConfigurationUpdate,
} from "../types"

import "./admin-store-configuration.css"

type AdminStoreConfigurationDialogProps = {
  isDemo: boolean
  onClose: () => void
  onSaved: (record: PlatformStoreConfigurationRecord) => Promise<void> | void
  onToast: (message: string) => void
  store: PlatformStore
}

const FALLBACK_PRIMARY = "#1455e6"
const FALLBACK_SECONDARY = "#55b8ff"

const cloneConfiguration = (
  configuration: PlatformStoreConfiguration,
): PlatformStoreConfiguration => ({
  ...configuration,
  contact: { ...configuration.contact },
  brand: { ...configuration.brand },
})

const configurationFromStore = (store: PlatformStore): PlatformStoreConfiguration => ({
  name: store.name,
  locale: store.locale === "en-LY" ? "en-LY" : "ar-LY",
  contact: { ...store.contact },
  brand: {
    logo_url: store.brand?.logo_url ?? null,
    primary_color: store.brand?.primary_color ?? null,
    secondary_color: store.brand?.secondary_color ?? null,
    typography_key: store.brand?.typography_key === "cairo" ? "cairo" : null,
  },
})

const sameConfiguration = (
  left: PlatformStoreConfiguration,
  right: PlatformStoreConfiguration,
) => JSON.stringify(left) === JSON.stringify(right)

const nullableText = (value: string): string | null => value.trim() || null

const isSupportedLocale = (
  value: string,
): value is PlatformStoreConfigurationUpdate["locale"] =>
  value === "ar-LY" || value === "en-LY"

const isSupportedTypography = (
  value: string | null,
): value is PlatformStoreConfigurationUpdate["brand"]["typography_key"] =>
  value === null || value === "cairo"

const errorStatus = (error: unknown): number | null =>
  error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status) || null
    : null

const formatSavedAt = (value: string | null | undefined): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function AdminStoreConfigurationDialog({
  isDemo,
  onClose,
  onSaved,
  onToast,
  store,
}: AdminStoreConfigurationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const previousActive = useRef<HTMLElement | null>(
    document.activeElement as HTMLElement | null,
  )
  const [record, setRecord] = useState<PlatformStoreConfigurationRecord | null>(
    null,
  )
  const [draft, setDraft] = useState<PlatformStoreConfiguration>(() =>
    configurationFromStore(store),
  )
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    isDemo ? "ready" : "loading",
  )
  const [retryToken, setRetryToken] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const savedConfiguration = record?.configuration ?? configurationFromStore(store)
  const dirty = useMemo(
    () => !sameConfiguration(draft, savedConfiguration),
    [draft, savedConfiguration],
  )

  const requestClose = useCallback(() => {
    if (saving || uploading) return
    if (
      dirty &&
      !window.confirm("Discard the unsaved Store configuration changes?")
    ) {
      return
    }
    onClose()
  }, [dirty, onClose, saving, uploading])

  useEffect(() => {
    if (isDemo) {
      const configuration = configurationFromStore(store)
      setRecord({
        configuration,
        revision: 0,
        updated_at: store.updated_at ?? null,
        updated_by: null,
      })
      setDraft(cloneConfiguration(configuration))
      setStatus("ready")
      return
    }

    const controller = new AbortController()
    setStatus("loading")
    setError(null)
    setConflict(false)

    getPlatformStoreConfiguration(store.id, controller.signal)
      .then((nextRecord) => {
        if (controller.signal.aborted) return
        setRecord(nextRecord)
        setDraft(cloneConfiguration(nextRecord.configuration))
        setStatus("ready")
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Store configuration could not be loaded.",
        )
        setStatus("failed")
      })

    return () => controller.abort()
  }, [isDemo, retryToken, store])

  useEffect(() => {
    const root = document.getElementById("root")
    const bodyOverflow = document.body.style.overflow
    const rootAriaHidden = root?.getAttribute("aria-hidden") ?? null
    const rootWasInert = Boolean(root?.hasAttribute("inert"))
    document.body.style.overflow = "hidden"
    root?.setAttribute("aria-hidden", "true")
    root?.setAttribute("inert", "")

    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      "[autofocus], input:not(:disabled), select:not(:disabled), button:not(:disabled)",
    )
    window.setTimeout(() => focusTarget?.focus(), 0)

    return () => {
      document.body.style.overflow = bodyOverflow
      if (root) {
        if (rootAriaHidden === null) root.removeAttribute("aria-hidden")
        else root.setAttribute("aria-hidden", rootAriaHidden)
        if (!rootWasInert) root.removeAttribute("inert")
      }
      const previous = previousActive.current
      if (previous?.isConnected) {
        window.requestAnimationFrame(() => previous.focus())
      }
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        requestClose()
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
  }, [requestClose])

  const updateContact = (
    key: keyof PlatformStoreConfiguration["contact"],
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value || null },
    }))
    if (!conflict) setError(null)
  }

  const updateBrand = <Key extends keyof PlatformStoreConfiguration["brand"]>(
    key: Key,
    value: PlatformStoreConfiguration["brand"][Key],
  ) => {
    setDraft((current) => ({
      ...current,
      brand: { ...current.brand, [key]: value },
    }))
    if (!conflict) setError(null)
  }

  const uploadLogo = async (file: File) => {
    if (isDemo) {
      onToast("Preview mode is read-only. No Store data was changed.")
      return
    }
    if (
      !new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG, or WebP logo no larger than 2 MB.")
      return
    }
    setUploading(true)
    if (!conflict) setError(null)
    try {
      const url = await uploadPlatformImage(file)
      updateBrand("logo_url", url)
      onToast("Logo uploaded. Save changes to apply it to this Store.")
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "The logo could not be uploaded.",
      )
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isDemo) {
      onToast("Preview mode is read-only. No Store data was changed.")
      return
    }
    if (!record || !formRef.current?.reportValidity()) return

    const locale = draft.locale
    if (!isSupportedLocale(locale)) {
      setError("Choose Arabic (Libya) or English (Libya) before saving this Store.")
      return
    }
    const typographyKey = draft.brand.typography_key
    if (!isSupportedTypography(typographyKey)) {
      setError("Choose Platform default or Cairo before saving this Store.")
      return
    }

    const configuration: PlatformStoreConfigurationUpdate = {
      ...draft,
      name: draft.name.trim(),
      locale,
      contact: {
        public_email: draft.contact.public_email?.trim().toLowerCase() || null,
        public_phone: nullableText(draft.contact.public_phone ?? ""),
        whatsapp_number: nullableText(draft.contact.whatsapp_number ?? ""),
      },
      brand: {
        ...draft.brand,
        logo_url: nullableText(draft.brand.logo_url ?? ""),
        primary_color: draft.brand.primary_color?.toLowerCase() ?? null,
        secondary_color: draft.brand.secondary_color?.toLowerCase() ?? null,
        typography_key: typographyKey,
      },
    }

    setSaving(true)
    setError(null)
    setConflict(false)
    try {
      const nextRecord = await savePlatformStoreConfiguration(
        store.id,
        configuration,
        record.revision,
      )
      setRecord(nextRecord)
      setDraft(cloneConfiguration(nextRecord.configuration))
      await onSaved(nextRecord)
      onToast("Store configuration saved to the database.")
    } catch (saveError) {
      const isConflict = errorStatus(saveError) === 409
      setConflict(isConflict)
      setError(
        isConflict
          ? "This Store changed in another session. Your draft is preserved; reload the saved version before trying again."
          : saveError instanceof Error
            ? saveError.message
            : "Store configuration could not be saved.",
      )
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    setDraft(cloneConfiguration(savedConfiguration))
    setError(null)
    setConflict(false)
  }

  const savedAt = formatSavedAt(record?.updated_at)

  return createPortal(
    <div
      className="admin-store-config-backdrop"
      dir="ltr"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) requestClose()
      }}
    >
      <div
        aria-describedby="admin-store-config-description"
        aria-labelledby="admin-store-config-title"
        aria-modal="true"
        className="admin-store-config-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <header className="admin-store-config-header">
          <div className="admin-store-config-heading-icon"><PiStorefront /></div>
          <div>
            <h2 id="admin-store-config-title">Store Configuration</h2>
            <p id="admin-store-config-description">
              Update the customer-facing identity and contact details for {store.name}.
            </p>
          </div>
          <button
            aria-label="Close Store configuration"
            disabled={saving || uploading}
            onClick={requestClose}
            type="button"
          >
            <PiX />
          </button>
        </header>

        {isDemo ? (
          <div className="admin-store-config-mode-note" role="status">
            <PiWarningCircle />
            <span><strong>Visual preview only</strong> These controls are read-only and never write to the database.</span>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className="admin-store-config-state" role="status">
            <PiSpinnerGap className="admin-store-config-spin" />
            <strong>Loading saved Store configuration…</strong>
          </div>
        ) : status === "failed" ? (
          <div className="admin-store-config-state" role="alert">
            <PiWarningCircle />
            <strong>Store configuration could not be loaded</strong>
            <p>{error}</p>
            <button type="button" onClick={() => setRetryToken((value) => value + 1)}>
              <PiArrowClockwise /> Try again
            </button>
          </div>
        ) : (
          <form className="admin-store-config-form" ref={formRef} onSubmit={submit}>
            <div className="admin-store-config-scroll">
              {error ? (
                <div className="admin-store-config-error" role="alert">
                  <PiWarningCircle />
                  <span>{error}</span>
                  {conflict ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !dirty ||
                          window.confirm("Replace your draft with the latest saved configuration?")
                        ) {
                          setRetryToken((value) => value + 1)
                        }
                      }}
                    >
                      Reload saved version
                    </button>
                  ) : null}
                </div>
              ) : null}

              <section className="admin-store-config-section" aria-labelledby="store-config-identity-title">
                <div className="admin-store-config-section__title">
                  <span><PiStorefront /></span>
                  <div><h3 id="store-config-identity-title">Store identity</h3><p>Name and language shown to customers</p></div>
                </div>
                <div className="admin-store-config-grid">
                  <label>
                    <span>Store name</span>
                    <input
                      autoFocus
                      disabled={isDemo}
                      maxLength={120}
                      minLength={2}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, name: event.target.value }))
                        if (!conflict) setError(null)
                      }}
                      required
                      value={draft.name}
                    />
                  </label>
                  <label>
                    <span>Storefront language</span>
                    <select
                      disabled={isDemo}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, locale: event.target.value }))
                        if (!conflict) setError(null)
                      }}
                      value={draft.locale}
                    >
                      {!isSupportedLocale(draft.locale) ? (
                        <option disabled value={draft.locale}>Unsupported current value: {draft.locale}</option>
                      ) : null}
                      <option value="ar-LY">Arabic (Libya)</option>
                      <option value="en-LY">English (Libya)</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="admin-store-config-section" aria-labelledby="store-config-contact-title">
                <div className="admin-store-config-section__title">
                  <span><PiCheckCircle /></span>
                  <div><h3 id="store-config-contact-title">Public contact</h3><p>Details customers may use to reach this Store</p></div>
                </div>
                <div className="admin-store-config-grid">
                  <label className="is-wide">
                    <span>Public email</span>
                    <input
                      autoComplete="email"
                      disabled={isDemo}
                      maxLength={254}
                      onChange={(event) => updateContact("public_email", event.target.value)}
                      placeholder="store@example.ly"
                      type="email"
                      value={draft.contact.public_email ?? ""}
                    />
                  </label>
                  <label>
                    <span>Public phone</span>
                    <input
                      autoComplete="tel"
                      disabled={isDemo}
                      inputMode="tel"
                      maxLength={40}
                      minLength={5}
                      onChange={(event) => updateContact("public_phone", event.target.value)}
                      placeholder="+218 …"
                      value={draft.contact.public_phone ?? ""}
                    />
                  </label>
                  <label>
                    <span>WhatsApp number</span>
                    <input
                      autoComplete="tel"
                      disabled={isDemo}
                      inputMode="tel"
                      maxLength={40}
                      minLength={5}
                      onChange={(event) => updateContact("whatsapp_number", event.target.value)}
                      placeholder="+218 …"
                      value={draft.contact.whatsapp_number ?? ""}
                    />
                  </label>
                </div>
              </section>

              <section className="admin-store-config-section" aria-labelledby="store-config-brand-title">
                <div className="admin-store-config-section__title">
                  <span><PiPalette /></span>
                  <div><h3 id="store-config-brand-title">Brand</h3><p>Logo, safe colors and the bundled Store typeface</p></div>
                </div>

                <div className="admin-store-config-logo-row">
                  <div className="admin-store-config-logo">
                    {draft.brand.logo_url ? (
                      <img alt="Current Store logo" src={draft.brand.logo_url} />
                    ) : (
                      <PiImage aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <strong>Store logo</strong>
                    <small>JPG, PNG or WebP · up to 2 MB</small>
                    <div>
                      <button
                        className="admin-store-config-upload"
                        disabled={isDemo || uploading}
                        onClick={() => logoInputRef.current?.click()}
                        type="button"
                      >
                        {uploading ? <PiSpinnerGap className="admin-store-config-spin" /> : <PiUploadSimple />}
                        {uploading ? "Uploading…" : "Upload logo"}
                      </button>
                      {draft.brand.logo_url ? (
                        <button
                          className="admin-store-config-remove"
                          disabled={isDemo || uploading}
                          onClick={() => updateBrand("logo_url", null)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void uploadLogo(file)
                        event.target.value = ""
                      }}
                      ref={logoInputRef}
                      type="file"
                    />
                  </div>
                </div>

                <div className="admin-store-config-grid">
                  <ColorField
                    disabled={isDemo}
                    fallback={FALLBACK_PRIMARY}
                    label="Primary color"
                    onChange={(value) => updateBrand("primary_color", value)}
                    value={draft.brand.primary_color}
                  />
                  <ColorField
                    disabled={isDemo}
                    fallback={FALLBACK_SECONDARY}
                    label="Secondary color"
                    onChange={(value) => updateBrand("secondary_color", value)}
                    value={draft.brand.secondary_color}
                  />
                  <label className="is-wide">
                    <span>Typography</span>
                    <select
                      disabled={isDemo}
                      onChange={(event) => updateBrand("typography_key", event.target.value === "cairo" ? "cairo" : null)}
                      value={draft.brand.typography_key ?? ""}
                    >
                      {!isSupportedTypography(draft.brand.typography_key) ? (
                        <option disabled value={draft.brand.typography_key ?? ""}>Unsupported current value: {draft.brand.typography_key}</option>
                      ) : null}
                      <option value="">Platform default (Cairo)</option>
                      <option value="cairo">Cairo</option>
                    </select>
                    <small>Only fonts bundled and tested by LabibTech can be selected.</small>
                  </label>
                </div>
              </section>

            </div>

            <footer className="admin-store-config-footer">
              <div>
                <strong>{dirty ? "Unsaved changes" : "Configuration is up to date"}</strong>
                <small>{savedAt ? `Revision ${record?.revision ?? 0} · saved ${savedAt}` : `Revision ${record?.revision ?? 0}`}</small>
              </div>
              <button disabled={!dirty || saving || uploading} onClick={discard} type="button">Discard</button>
              <button
                className="is-primary"
                disabled={isDemo || !dirty || saving || uploading}
                type="submit"
              >
                {saving ? <PiSpinnerGap className="admin-store-config-spin" /> : <PiCheckCircle />}
                {saving ? "Saving…" : "Save configuration"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

function ColorField({
  disabled,
  fallback,
  label,
  onChange,
  value,
}: {
  disabled: boolean
  fallback: string
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  const safePickerValue = value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
  return (
    <label className="admin-store-config-color-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={`${label} picker`}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={safePickerValue}
        />
        <input
          disabled={disabled}
          maxLength={7}
          onChange={(event) => onChange(nullableText(event.target.value))}
          pattern="#[0-9A-Fa-f]{6}"
          placeholder={fallback}
          spellCheck={false}
          value={value ?? ""}
        />
        {value ? (
          <button disabled={disabled} onClick={() => onChange(null)} type="button">Reset</button>
        ) : null}
      </div>
    </label>
  )
}
