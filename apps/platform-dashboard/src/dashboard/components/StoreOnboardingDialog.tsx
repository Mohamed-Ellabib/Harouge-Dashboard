import {
  PiArrowLeft,
  PiArrowRight,
  PiCheck,
  PiCheckCircle,
  PiCheckCircleFill,
  PiGlobe,
  PiInfo,
  PiShieldCheck,
  PiSpinnerGap,
  PiStorefront,
  PiWarningCircle,
  PiX,
} from "react-icons/pi"
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { navigateDashboardDetail } from "../routing"
import { newStoreTemplateLabels } from "../new-store-template"
import { createCreationDraft, saveCreationDraft, confirmCreationDraft, storeCategories, type StoreCategoryKey, type CreationDraft } from "../creation-drafts"
import type {
  PlatformClient,
  PlatformStorefrontTemplateKey,
  ProvisionStoreResult,
} from "../types"
import { templateDefinitions, templatesStudioVisibleKeys, creationTemplatePalettes } from "../store-template-catalog"
import "./store-onboarding-dialog.css"

type StoreOnboardingDialogProps = {
  open: boolean
  existingClient?: PlatformClient | null
  isDemo?: boolean
  onClose: () => void
  onProvisioned: (result: ProvisionStoreResult) => Promise<void>
  initialTemplate?: PlatformStorefrontTemplateKey
  openEditorOnSuccess?: boolean
}

type ProvisionOutcome = {
  provisioning: ProvisionStoreResult
  commerceReady: boolean
  commerceError: string | null
  refreshError: string | null
  templateError: string | null
}

type WizardStep = 1 | 2 | 3 | 4
type DefaultLanguage = "ar-LY" | "en"
type PlanCode = "starter_whatsapp" | "professional_commerce"

type SafeSessionDraft = {
  version: 1
  category: StoreCategoryKey
  includeProducts: boolean
  clientName: string
  storeName: string
  handle: string
  defaultLanguage: DefaultLanguage
  plan: PlanCode
  template: string
  primaryColor: string
  secondaryColor: string
  shippingAmount: string
  customDomain: string
}

const steps = [
  "Store Details",
  "Design & Setup",
  "Owner & Access",
  "Review",
] as const

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const isHostname = (value: string) =>
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
    value,
  )

const isDefaultLanguage = (value: unknown): value is DefaultLanguage =>
  value === "ar-LY" || value === "en"

const isPlanCode = (value: unknown): value is PlanCode =>
  value === "starter_whatsapp" || value === "professional_commerce"

const templateKeyForLabel = (label: string) =>
  Object.entries(newStoreTemplateLabels).find(([, name]) => name === label)?.[0] as PlatformStorefrontTemplateKey | undefined

function readSafeDraft(key: string): SafeSessionDraft | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? "null") as
      | Record<string, unknown>
      | null
    if (!parsed || parsed.version !== 1) return null

    return {
      version: 1,
      category: storeCategories.some(c => c.key === parsed.category) ? parsed.category as StoreCategoryKey : "fashion",
      includeProducts: typeof parsed.includeProducts === "boolean" ? parsed.includeProducts : true,
      clientName: typeof parsed.clientName === "string" ? parsed.clientName : "",
      storeName: typeof parsed.storeName === "string" ? parsed.storeName : "",
      handle: typeof parsed.handle === "string" ? parsed.handle : "",
      defaultLanguage: isDefaultLanguage(parsed.defaultLanguage)
        ? parsed.defaultLanguage
        : "ar-LY",
      plan: isPlanCode(parsed.plan) ? parsed.plan : "professional_commerce",
      template: typeof parsed.template === "string" ? parsed.template : "Luxe Commerce",
      primaryColor:
        typeof parsed.primaryColor === "string" ? parsed.primaryColor : "#008cff",
      secondaryColor:
        typeof parsed.secondaryColor === "string" ? parsed.secondaryColor : "#00c8ff",
      shippingAmount:
        typeof parsed.shippingAmount === "string" ? parsed.shippingAmount : "15",
      customDomain:
        typeof parsed.customDomain === "string" ? parsed.customDomain : "",
    }
  } catch {
    return null
  }
}

export function StoreOnboardingDialog({
  open,
  existingClient = null,
  isDemo = false,
  onClose,
  onProvisioned,
  initialTemplate,
  openEditorOnSuccess = false,
}: StoreOnboardingDialogProps) {
  const existingOwner = useMemo(
    () =>
      existingClient?.stores
        .flatMap((store) => store.memberships)
        .find(
          (membership) =>
            membership.role === "owner" &&
            membership.status === "active" &&
            membership.email,
        ) ?? null,
    [existingClient],
  )

  const draftStorageKey = useMemo(
    () =>
      `labibtech.store-onboarding-draft.v1.${existingClient?.id ?? "new-client"}${initialTemplate ? `.${initialTemplate}` : ""}`,
    [existingClient?.id, initialTemplate],
  )

  const [category, setCategory] = useState<StoreCategoryKey>("fashion")
  const [includeProducts, setIncludeProducts] = useState(true)
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null)
  const [step, setStep] = useState<WizardStep>(1)
  const [clientName, setClientName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [handle, setHandle] = useState("")
  const [handleTouched, setHandleTouched] = useState(false)
  const [defaultLanguage, setDefaultLanguage] =
    useState<DefaultLanguage>("ar-LY")
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [password, setPassword] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [publicPhone, setPublicPhone] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#008cff")
  const [secondaryColor, setSecondaryColor] = useState("#00c8ff")
  const [shippingAmount, setShippingAmount] = useState("15")
  const [plan, setPlan] = useState<PlanCode>("professional_commerce")
  const [template, setTemplate] = useState<string>(newStoreTemplateLabels["luxe-commerce-full"])
  const [reuseOwner, setReuseOwner] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState<"identity" | "commerce">("identity")
  const [error, setError] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [result, setResult] = useState<ProvisionOutcome | null>(null)

  const creationDraftRef = useRef<CreationDraft | null>(null)
  const creationRequestKey = useRef<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const submittingRef = useRef(false)
  const storeNameRef = useRef<HTMLInputElement>(null)
  const handleRef = useRef<HTMLInputElement>(null)
  const clientNameRef = useRef<HTMLInputElement>(null)
  const ownerNameRef = useRef<HTMLInputElement>(null)
  const ownerEmailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const shippingAmountRef = useRef<HTMLInputElement>(null)
  const customDomainRef = useRef<HTMLInputElement>(null)

  const normalizedHandle = useMemo(
    () => normalizeKey(handle || storeName || clientName),
    [clientName, handle, storeName],
  )

  const temporaryDomainBase = isDemo ? "labibtech.ly" : "local.test"
  const previewDomain = `${normalizedHandle || "store-handle"}.${temporaryDomainBase}`
  const isExistingClient = Boolean(existingClient)

  useEffect(() => {
    submittingRef.current = submitting
  }, [submitting])

  useEffect(() => {
    if (!open) return

    const savedDraft = isDemo ? null : readSafeDraft(draftStorageKey)
    const demoStoreName = isDemo ? "Al-Nour Market" : ""
    const initialStoreName = savedDraft?.storeName ?? demoStoreName

    setStep(1)
    setCategory(savedDraft?.category ?? (initialTemplate === "glow-beauty" ? "beauty" : initialTemplate === "luxe-commerce-full" ? "watches-accessories" : "fashion"))
    setIncludeProducts(savedDraft?.plan === "starter_whatsapp" ? false : savedDraft?.includeProducts ?? true)
    setResumeDraftId(null)
    setClientName(
      existingClient?.name ?? savedDraft?.clientName ?? initialStoreName,
    )
    setStoreName(initialStoreName)
    setHandle(savedDraft?.handle ?? (isDemo ? "al-nour-market" : ""))
    setHandleTouched(Boolean(savedDraft?.handle || isDemo))
    setDefaultLanguage(savedDraft?.defaultLanguage ?? (initialTemplate === "glow-beauty" ? "en" : "ar-LY"))
    setOwnerName(existingOwner?.display_name ?? "")
    setOwnerEmail(existingOwner?.email ?? "")
    setPassword("")
    setCustomDomain(savedDraft?.customDomain ?? "")
    setPublicPhone("")
    setWhatsappNumber("")
    const paletteKey = (initialTemplate ?? (savedDraft?.template ? templateKeyForLabel(savedDraft.template) : null) ?? "luxe-commerce-full") as keyof typeof creationTemplatePalettes
    const palette = creationTemplatePalettes[paletteKey] ?? creationTemplatePalettes["luxe-commerce-full"]
    setPrimaryColor(savedDraft?.primaryColor ?? palette.primary)
    setSecondaryColor(savedDraft?.secondaryColor ?? palette.background)
    setShippingAmount(savedDraft?.shippingAmount ?? "15")
    setPlan(savedDraft?.plan ?? "professional_commerce")
    setTemplate(initialTemplate && initialTemplate in newStoreTemplateLabels
      ? newStoreTemplateLabels[initialTemplate as keyof typeof newStoreTemplateLabels]
      : savedDraft?.template && templateKeyForLabel(savedDraft.template)
        ? savedDraft.template : newStoreTemplateLabels["luxe-commerce-full"])
    setReuseOwner(Boolean(existingOwner?.email))
    setSubmitting(false)
    setStage("identity")
    setError(null)
    setDraftNotice(
      savedDraft
        ? "A secure session draft was restored. Owner and contact details are never stored."
        : null,
    )
    setResult(null)
    creationDraftRef.current = null
    creationRequestKey.current = null
    try {
      const pending = JSON.parse(sessionStorage.getItem(`${draftStorageKey}.pending`) ?? "null")
      if (typeof pending?.id === "string" && /^stdraft_[a-f0-9-]{36}$/.test(pending.id)) setResumeDraftId(pending.id)
      if (typeof pending?.key === "string") creationRequestKey.current = pending.key
    } catch { /* Session storage is optional; server drafts remain resumable. */ }
  }, [
    draftStorageKey,
    existingClient,
    existingOwner,
    isDemo,
    initialTemplate,
    open,
  ])

  const requestClose = useCallback(() => {
    if (submittingRef.current) return
    setError(null)
    setResult(null)
    setPassword("")
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return

    previousActiveElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusTimer = window.requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        requestClose()
        return
      }

      if (event.key !== "Tab" || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0)

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

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActiveElement.current?.focus()
    }
  }, [open, requestClose])

  useEffect(() => {
    if (!open) return
    const focusTimer = window.requestAnimationFrame(() => {
      if (result) {
        dialogRef.current?.focus()
        return
      }
      if (step === 1) dialogRef.current?.focus()
      if (step === 3) {
        if (isExistingClient) ownerNameRef.current?.focus()
        else clientNameRef.current?.focus()
      }
      if (step === 2) dialogRef.current?.focus()
      if (step === 4) customDomainRef.current?.focus()
      dialogRef.current?.querySelector(".store-onboarding__main")?.scrollTo(0, 0)
    })
    return () => window.cancelAnimationFrame(focusTimer)
  }, [isExistingClient, open, result, step])

  if (!open) return null

  const focusAfterRender = (target: "store" | "handle" | "client" | "owner" | "email" | "password" | "shipping" | "domain") => {
    window.requestAnimationFrame(() => {
      const refs = {
        store: storeNameRef,
        handle: handleRef,
        client: clientNameRef,
        owner: ownerNameRef,
        email: ownerEmailRef,
        password: passwordRef,
        shipping: shippingAmountRef,
        domain: customDomainRef,
      }
      refs[target].current?.focus()
    })
  }

  const failValidation = (
    targetStep: WizardStep,
    message: string,
    target: Parameters<typeof focusAfterRender>[0],
  ) => {
    setStep(targetStep)
    setError(message)
    setDraftNotice(null)
    focusAfterRender(target)
    return false
  }

  const validateStep = (targetStep: WizardStep): boolean => {
    setError(null)

    if (targetStep === 1) {
      if (storeName.trim().length < 2) {
        return failValidation(1, "Enter a store name with at least 2 characters.", "store")
      }
      if (normalizedHandle.length < 2) {
        return failValidation(1, "Enter a valid store handle.", "handle")
      }
      return true
    }

    if (targetStep === 3) {
      const resolvedClientName = existingClient?.name ?? clientName.trim()
      if (!resolvedClientName || resolvedClientName.length < 2) {
        return failValidation(3, "Enter the client or company name.", "client")
      }
      if (existingClient && !existingClient.key) {
        return failValidation(
          3,
          "This existing client does not have a canonical key yet and cannot receive another store.",
          "client",
        )
      }
      if (ownerName.trim().length < 2) {
        return failValidation(3, "Enter the owner's full name.", "owner")
      }
      if (!isEmail(ownerEmail.trim())) {
        return failValidation(3, "Enter a valid owner email address.", "email")
      }
      if (!reuseOwner && password.length < 8) {
        return failValidation(
          3,
          "The temporary password must contain at least 8 characters.",
          "password",
        )
      }
      if (publicPhone.trim() && publicPhone.trim().length < 5) {
        return failValidation(3, "Enter a valid public phone number.", "owner")
      }
      if (whatsappNumber.trim() && whatsappNumber.trim().length < 5) {
        return failValidation(3, "Enter a valid WhatsApp number.", "owner")
      }
      return true
    }

    if (targetStep === 2) {
      if (!templateKeyForLabel(template)) {
        setStep(2)
        setError("Choose an available storefront template.")
        return false
      }
      const deliveryAmount = Number(shippingAmount)
      if (
        plan === "professional_commerce" &&
        (!Number.isInteger(deliveryAmount) || deliveryAmount < 0)
      ) {
        return failValidation(
          2,
          "Enter a non-negative whole-number delivery amount in LYD.",
          "shipping",
        )
      }
      return true
    }

    if (customDomain.trim() && !isHostname(customDomain.trim().toLowerCase())) {
      return failValidation(
        4,
        "Enter a hostname without https://, a path, or spaces.",
        "domain",
      )
    }
    return true
  }

  const validateAll = () =>
    ([1, 2, 3, 4] as WizardStep[]).every((candidate) => validateStep(candidate))

  const handleStoreNameChange = (value: string) => {
    setStoreName(value)
    if (!handleTouched) setHandle(normalizeKey(value))
    if (!existingClient && (!clientName.trim() || clientName === storeName)) {
      setClientName(value)
    }
  }

  const handleSaveDraft = () => {
    const draft: SafeSessionDraft = {
      version: 1,
      category,
      includeProducts,
      clientName: existingClient?.name ?? clientName,
      storeName,
      handle,
      defaultLanguage,
      plan,
      template,
      primaryColor,
      secondaryColor,
      shippingAmount,
      customDomain,
    }

    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(draft))
      setError(null)
      setDraftNotice(
        "Saved for this browser session. Owner, password and contact details are excluded.",
      )
    } catch {
      setDraftNotice(null)
      setError("This browser could not save the session draft.")
    }
  }

  const handleProvision = async () => {
    if (!validateAll() || submittingRef.current) return
    if (isDemo) { setError("Preview mode is read-only. Sign in to create this store."); return }
    const chosenTemplate = templateKeyForLabel(template)
    if (!chosenTemplate) return
    submittingRef.current = true
    setSubmitting(true); setError(null); setDraftNotice(null)
    try {
      creationRequestKey.current ??= crypto.randomUUID()
      // Persist only the retry key, never owner details or credentials.
      sessionStorage.setItem(`${draftStorageKey}.pending`, JSON.stringify({ key: creationRequestKey.current }))
      const { draft } = await createCreationDraft(creationRequestKey.current, chosenTemplate, {
        starter_catalog: category, include_starter_products: includeProducts && plan === "professional_commerce",
      })
      creationDraftRef.current = draft
      sessionStorage.setItem(`${draftStorageKey}.pending`, JSON.stringify({ key: creationRequestKey.current, id: draft.id }))
      const reviewed = draft.status === "draft" ? (await saveCreationDraft(draft.id, draft.revision, {
        ...draft.values,
        configuration: {
          name: storeName.trim(), locale: defaultLanguage === "en" ? "en-LY" : "ar-LY",
          contact: { public_email: ownerEmail.trim().toLowerCase(), public_phone: publicPhone.trim() || null, whatsapp_number: whatsappNumber.trim() || null },
          brand: { ...draft.values.configuration.brand, primary_color: primaryColor, secondary_color: secondaryColor },
        },
        setup: { client_name: (existingClient?.name ?? clientName).trim(), client_key: (existingClient?.key ?? normalizeKey(clientName)) || normalizedHandle,
          reuse_client: Boolean(existingClient), plan_code: plan, ...(customDomain.trim() ? { custom_hostname: customDomain.trim().toLowerCase() } : {}) },
        owner: { name: ownerName.trim() || (existingClient?.name ?? clientName).trim(), email: ownerEmail.trim().toLowerCase(), reuse_existing: reuseOwner },
        handle: normalizedHandle, delivery_amount: plan === "professional_commerce" ? Number(shippingAmount) : 0,
      })).draft : draft
      creationDraftRef.current = reviewed
      setStage("commerce")
      const { draft: confirmed } = await confirmCreationDraft(reviewed.id, reviewed.revision, password || undefined)
      creationDraftRef.current = confirmed
      if (!confirmed.provisioning) throw new Error("The saved setup can be resumed from its draft.")
      setPassword("")
      let refreshError: string | null = null
      try { await onProvisioned(confirmed.provisioning) } catch { refreshError = "Store created. Refresh the portfolio to see it." }
      try { sessionStorage.removeItem(draftStorageKey); sessionStorage.removeItem(`${draftStorageKey}.pending`) } catch { /* Creation has already completed. */ }
      setResult({ provisioning: confirmed.provisioning, commerceReady: plan === "professional_commerce", commerceError: null, templateError: null, refreshError })
      if (openEditorOnSuccess && !refreshError) { onClose(); navigateDashboardDetail("storefronts", confirmed.provisioning.store_profile_id) }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup could not finish. Your saved draft can be resumed.")
      if (creationDraftRef.current) setResumeDraftId(creationDraftRef.current.id)
    } finally { submittingRef.current = false; setSubmitting(false); setStage("identity") }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (step < 4) {
      if (!validateStep(step)) return
      setError(null)
      setDraftNotice(null)
      setStep((step + 1) as WizardStep)
      return
    }

    void handleProvision()
  }

  const openCreatedStoreEditor = async () => {
    if (!result) return
    onClose()
    navigateDashboardDetail("storefronts", result.provisioning.store_profile_id)
  }

  const goBack = () => {
    if (step === 1) {
      requestClose()
      return
    }
    setError(null)
    setDraftNotice(null)
    setStep((step - 1) as WizardStep)
  }

  const selectReachedStep = (targetStep: WizardStep) => {
    if (targetStep > step || submitting) return
    setError(null)
    setDraftNotice(null)
    setStep(targetStep)
  }

  const planLabel =
    plan === "professional_commerce"
      ? "Professional Commerce"
      : "Starter WhatsApp"

  const summaryOwner =
    step < 3
      ? "Added in next step"
      : ownerEmail.trim() || (reuseOwner ? "Existing account" : "Not added")

  return (
    <div
      className="store-onboarding-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section
        ref={dialogRef}
        className={`store-onboarding-dialog${result ? " is-result" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-onboarding-title"
        aria-describedby="store-onboarding-description"
        tabIndex={-1}
        dir="ltr"
      >
        <header className="store-onboarding__header">
          <div>
            <h2 id="store-onboarding-title">
              {isExistingClient ? `Add Store to ${existingClient?.name}` : "Add New Store"}
            </h2>
            <p id="store-onboarding-description">
              Set up a store, choose its design and give its owner access.
            </p>
          </div>
          <button
            type="button"
            className="store-onboarding__close"
            onClick={requestClose}
            aria-label="Close add store window"
            disabled={submitting}
          >
            <PiX />
          </button>
        </header>

        {result ? (
          <div className="store-onboarding-result">
            <div
              className={`store-onboarding-result__icon${
                result.commerceError || result.refreshError || result.templateError ? " has-warning" : ""
              }`}
            >
              {result.commerceError || result.refreshError || result.templateError ? (
                <PiWarningCircle />
              ) : (
                <PiCheckCircle />
              )}
            </div>
            <h3>Store created successfully</h3>
            {includeProducts ? <p>{storeCategories.find(item => item.key === category)?.count} starter products were added to this store. Review or replace the sample content before publishing.</p> : null}
            <p>
              <strong>{result.provisioning.handle}</strong> is now part of the
              platform portfolio.
            </p>
            <dl>
              <div>
                <dt>Platform domain</dt>
                <dd>{result.provisioning.public_domain}</dd>
              </div>
              <div>
                <dt>Owner account</dt>
                <dd>{result.provisioning.owner_email}</dd>
              </div>
              <div>
                <dt>Store identity</dt>
                <dd>Complete</dd>
              </div>
              <div>
                <dt>Commerce</dt>
                <dd>
                  {result.provisioning.plan_code === "starter_whatsapp"
                    ? "Not required for this plan"
                    : result.commerceReady
                      ? "Ready"
                      : "Needs another setup attempt"}
                </dd>
              </div>
            </dl>
            {result.commerceError ? (
              <div className="store-onboarding-result__warning" role="alert">
                <PiWarningCircle />
                <span>{result.commerceError}</span>
              </div>
            ) : null}
            {result.refreshError ? (
              <div className="store-onboarding-result__warning" role="status">
                <PiInfo />
                <span>{result.refreshError}</span>
              </div>
            ) : null}
            {result.templateError ? <div className="store-onboarding-result__warning" role="alert"><PiWarningCircle /><span>Store created. Template setup needs attention: {result.templateError}</span></div> : null}
            <div className="store-onboarding-result__actions">
              <button
                type="button"
                className="store-onboarding-button store-onboarding-button--outline"
                onClick={() => void openCreatedStoreEditor()}
                disabled={submitting}
              >
                <PiGlobe /> {result.templateError ? "Retry template setup & open editor" : "Configure Storefront"}
              </button>
              <button
                type="button"
                className="store-onboarding-button store-onboarding-button--primary"
                onClick={requestClose}
                disabled={submitting}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <nav className="store-onboarding__progress" aria-label="Store setup progress">
              <ol>
                {steps.map((label, index) => {
                  const number = (index + 1) as WizardStep
                  const completed = number < step
                  const current = number === step
                  return (
                    <li
                      className={`${current ? "is-current" : ""}${
                        completed ? " is-complete" : ""
                      }`}
                      key={label}
                    >
                      <button
                        type="button"
                        onClick={() => selectReachedStep(number)}
                        aria-current={current ? "step" : undefined}
                        aria-label={`Step ${number}: ${label}`}
                        disabled={number > step || submitting}
                      >
                        <span>{completed ? <PiCheck /> : number}</span>
                        {label}
                      </button>
                    </li>
                  )
                })}
              </ol>
              <span className="store-onboarding__step-count">Step {step} of 4</span>
            </nav>

            <form className="store-onboarding__form" onSubmit={handleSubmit} noValidate>
              <div className="store-onboarding__main">
                <div className="store-onboarding__content">
                  {resumeDraftId ? <div className="store-onboarding-alert" role="status"><PiInfo /><span>This setup has a saved draft. Resume it to keep your design, products and creation progress.</span><button type="button" onClick={() => { onClose(); navigateDashboardDetail("storefronts", resumeDraftId) }}>Resume saved draft</button></div> : null}
                  {step === 1 ? (
                    <div className="store-onboarding-step store-onboarding-step--details">
                      <div className="store-onboarding-step__heading">
                        <h3>Store Details</h3>
                        <p>Enter the basic information for the new storefront</p>
                      </div>

                      {error ? (
                        <div className="store-onboarding-alert" role="alert">
                          <PiWarningCircle /> {error}
                        </div>
                      ) : null}

                      <div className="store-onboarding-fields">
                        <label>
                          <span>Store Name</span>
                          <input
                            ref={storeNameRef}
                            value={storeName}
                            onChange={(event) => handleStoreNameChange(event.target.value)}
                            placeholder="Al-Nour Market"
                            maxLength={120}
                          />
                        </label>
                        <label>
                          <span>Store Handle</span>
                          <div className="store-onboarding-input-status">
                            <input
                              ref={handleRef}
                              value={handle}
                              onChange={(event) => {
                                setHandle(event.target.value.toLowerCase())
                                setHandleTouched(true)
                              }}
                              placeholder="al-nour-market"
                              maxLength={60}
                            />
                            <PiCheckCircle />
                          </div>
                          <small className="is-positive">
                            {isDemo
                              ? "Handle is available"
                              : "Availability is verified at creation"}
                          </small>
                        </label>
                        <label>
                          <span>Default Language</span>
                          <select
                            value={defaultLanguage}
                            onChange={(event) =>
                              setDefaultLanguage(event.target.value as DefaultLanguage)
                            }
                          >
                            <option value="ar-LY">Arabic</option>
                            <option value="en">English</option>
                          </select>
                        </label>
                        <label className="store-onboarding-fields__wide">
                          <span>Platform Subdomain</span>
                          <div className="store-onboarding-domain-input">
                            <input value={normalizedHandle} readOnly aria-label="Platform subdomain" />
                            <span>.{temporaryDomainBase}</span>
                            <em>
                              <PiCheckCircle /> {isDemo ? "Available" : "Checked at creation"}
                            </em>
                          </div>
                          <small>A custom domain can be connected after provisioning.</small>
                        </label>
                      </div>

                      <fieldset className="store-onboarding-categories">
                        <legend>Store category</legend>
                        <p>Choose the sample collection. Your template is selected separately.</p>
                        <div>{storeCategories.map(item => <label key={item.key} className={category === item.key ? "is-selected" : ""}>
                          <input type="radio" name="store-category" value={item.key} checked={category === item.key} onChange={() => setCategory(item.key)} />
                          <span><strong>{item.label}</strong><small>{item.description} · {item.count} products</small></span>
                        </label>)}</div>
                      </fieldset>
                      <p className="store-onboarding-market-note">Libya · LYD · Africa/Tripoli</p>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="store-onboarding-step">
                      <div className="store-onboarding-step__heading">
                        <h3>Owner & Access</h3>
                        <p>Add the store owner and their secure access details</p>
                      </div>
                      {error ? (
                        <div className="store-onboarding-alert" role="alert">
                          <PiWarningCircle /> {error}
                        </div>
                      ) : null}
                      {isExistingClient ? (
                        <div className="store-onboarding-existing-client">
                          <PiShieldCheck />
                          This store will be linked to <strong>{existingClient?.name}</strong>.
                        </div>
                      ) : null}
                      <div className="store-onboarding-fields store-onboarding-fields--owner">
                        <label>
                          <span>Client / Company Name</span>
                          <input
                            ref={clientNameRef}
                            value={clientName}
                            onChange={(event) => setClientName(event.target.value)}
                            disabled={isExistingClient}
                            maxLength={120}
                          />
                        </label>
                        <label>
                          <span>Owner Name</span>
                          <input
                            ref={ownerNameRef}
                            value={ownerName}
                            onChange={(event) => setOwnerName(event.target.value)}
                            placeholder="Full name"
                            maxLength={120}
                          />
                        </label>
                        <label>
                          <span>Owner Email</span>
                          <input
                            ref={ownerEmailRef}
                            type="email"
                            value={ownerEmail}
                            onChange={(event) => setOwnerEmail(event.target.value)}
                            placeholder="owner@example.com"
                            autoComplete="off"
                          />
                        </label>
                        <label>
                          <span>Public Phone</span>
                          <input
                            value={publicPhone}
                            onChange={(event) => setPublicPhone(event.target.value)}
                            placeholder="+218 ..."
                          />
                        </label>
                        <label>
                          <span>WhatsApp Number</span>
                          <input
                            value={whatsappNumber}
                            onChange={(event) => setWhatsappNumber(event.target.value)}
                            placeholder="+218 ..."
                          />
                        </label>
                        <label className="store-onboarding-owner-toggle">
                          <span>
                            <strong>Reuse existing account</strong>
                            <small>Link this email without creating a new password</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={reuseOwner}
                            onChange={(event) => {
                              setReuseOwner(event.target.checked)
                              if (event.target.checked) setPassword("")
                            }}
                          />
                          <i aria-hidden="true" />
                        </label>
                        <label className="store-onboarding-fields__wide">
                          <span>Temporary Password</span>
                          <input
                            ref={passwordRef}
                            maxLength={128}
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={reuseOwner ? "Not required for an existing account" : "At least 8 characters"}
                            autoComplete="new-password"
                            disabled={reuseOwner}
                          />
                          <small>The password is never stored in the dashboard or provisioning log.</small>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="store-onboarding-step">
                      <div className="store-onboarding-step__heading">
                        <h3>Choose your storefront</h3>
                        <p>Pick a design, then choose how this store takes orders.</p>
                      </div>
                      {error ? (
                        <div className="store-onboarding-alert" role="alert">
                          <PiWarningCircle /> {error}
                        </div>
                      ) : null}
                      <fieldset className="store-onboarding-templates">
                        <legend>Storefront template</legend>
                        <div className="store-onboarding-templates__grid">
                          {templatesStudioVisibleKeys.map((key, index) => (
                            <label key={key} className={template === newStoreTemplateLabels[key] ? "is-selected" : ""}>
                              <input type="radio" name="store-template" value={key} checked={template === newStoreTemplateLabels[key]} onChange={() => {
                                const previous = creationTemplatePalettes[templateKeyForLabel(template) as keyof typeof creationTemplatePalettes]
                                const next = creationTemplatePalettes[key]
                                if (primaryColor === previous?.primary) setPrimaryColor(next.primary)
                                if (secondaryColor === previous?.background) setSecondaryColor(next.background)
                                setTemplate(newStoreTemplateLabels[key])
                              }} />
                              <img src={templateDefinitions[key].image} alt="" />
                              <span><strong>Template {index + 1}</strong><small>{templateDefinitions[key].category}</small></span>
                              <PiCheckCircleFill aria-hidden="true" />
                            </label>
                          ))}
                        </div>
                        <p>Your design and chosen product collection will be saved together. Review everything before publishing.</p>
                      </fieldset>
                      <div className="store-onboarding-plan-list">
                        <label className={plan === "professional_commerce" ? "is-selected" : ""}>
                          <input
                            type="radio"
                            name="plan"
                            value="professional_commerce"
                            checked={plan === "professional_commerce"}
                            onChange={() => { setPlan("professional_commerce"); setIncludeProducts(true) }}
                          />
                          <span><strong>Professional Commerce</strong><small>Online catalog and assisted commerce setup</small></span>
                          <PiCheckCircleFill />
                        </label>
                        <label className={plan === "starter_whatsapp" ? "is-selected" : ""}>
                          <input
                            type="radio"
                            name="plan"
                            value="starter_whatsapp"
                            checked={plan === "starter_whatsapp"}
                            onChange={() => { setPlan("starter_whatsapp"); setIncludeProducts(false) }}
                          />
                          <span><strong>Starter WhatsApp</strong><small>Store identity without online checkout setup</small></span>
                          <PiCheckCircleFill />
                        </label>
                      </div>
                      <label className="store-onboarding-starter-choice">
                        <input type="checkbox" checked={includeProducts} disabled={plan !== "professional_commerce"} onChange={event => setIncludeProducts(event.target.checked)} />
                        <span><strong>Include starter products</strong><small>{plan === "professional_commerce" ? `${storeCategories.find(item => item.key === category)?.count} sample products with photos, prices, variants and stock. Each store gets independent copies you can edit or delete.` : "Choose Professional Commerce to include products and inventory."}</small></span>
                      </label>
                      <div className="store-onboarding-fields store-onboarding-fields--plan">
                        {plan === "professional_commerce" ? (
                          <label>
                            <span>Libya Delivery (LYD)</span>
                            <input
                              ref={shippingAmountRef}
                              type="number"
                              min="0"
                              step="1"
                              value={shippingAmount}
                              onChange={(event) => setShippingAmount(event.target.value)}
                            />
                            <small>Creates the Store's one flat-rate shipping option.</small>
                          </label>
                        ) : (
                          <div className="store-onboarding-plan-note">
                            <PiInfo /> Commerce setup is not required for this plan.
                          </div>
                        )}
                        <label>
                          <span>Primary Color</span>
                          <div className="store-onboarding-color-input">
                            <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
                            <code>{primaryColor}</code>
                          </div>
                        </label>
                        <label>
                          <span>Secondary Color</span>
                          <div className="store-onboarding-color-input">
                            <input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} />
                            <code>{secondaryColor}</code>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="store-onboarding-step">
                      <div className="store-onboarding-step__heading">
                        <h3>Ready to create your store?</h3>
                        <p>Check the details below. You can go back to change any choice.</p>
                      </div>
                      {error ? (
                        <div className="store-onboarding-alert" role="alert">
                          <PiWarningCircle /> {error}
                        </div>
                      ) : null}
                      <div className="store-onboarding-fields">
                        <label className="store-onboarding-fields__wide">
                          <span>Custom Domain (optional)</span>
                          <div className="store-onboarding-icon-input">
                            <PiGlobe />
                            <input
                              ref={customDomainRef}
                              value={customDomain}
                              onChange={(event) => setCustomDomain(event.target.value)}
                              placeholder="store.example.com"
                            />
                          </div>
                          <small>Recorded as pending until DNS and SSL verification are completed.</small>
                        </label>
                      </div>
                      <div className="store-onboarding-review">
                        <div><span>Store</span><strong>{storeName || "—"}</strong></div>
                        <div><span>Category</span><strong>{storeCategories.find(item => item.key === category)?.label}</strong></div>
                        <div><span>Starter products</span><strong>{includeProducts ? `${storeCategories.find(item => item.key === category)?.count} independent sample products` : "Start with an empty catalog"}</strong></div>
                        <div><span>Owner</span><strong>{ownerEmail || "—"}</strong></div>
                        <div><span>Plan</span><strong>{planLabel}</strong></div>
                        <div><span>Template</span><strong>Template {templatesStudioVisibleKeys.findIndex(key => newStoreTemplateLabels[key] === template) + 1}</strong></div>
                        <div><span>Platform domain</span><strong>{previewDomain}</strong></div>
                        <div><span>Default language</span><strong>{defaultLanguage === "ar-LY" ? "Arabic" : "English"}</strong></div>
                        <div><span>Delivery</span><strong>{plan === "professional_commerce" ? `${shippingAmount || "0"} LYD` : "Not required"}</strong></div>
                      </div>
                      <div className="store-onboarding-local-note">
                        <PiInfo />
                        <span>
                          The store account becomes active after setup. Its storefront design is saved as an unpublished draft; publish it separately from the editor.
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <aside className="store-onboarding-summary" aria-label="Provisioning summary">
                  <div className="store-onboarding-step__heading">
                    <h3>Your new store</h3>
                    <p>Your choices, all in one place</p>
                  </div>
                  <div className="store-onboarding-summary__store">
                    <span>
                      <PiStorefront />
                    </span>
                    <div>
                      <strong>{storeName.trim() || "New Store"}</strong>
                      <small>{previewDomain}</small>
                      <em>Setup in progress</em>
                    </div>
                  </div>
                  <dl className="store-onboarding-summary__details">
                    <div><dt>Status</dt><dd>Activates after setup</dd></div>
                    <div><dt>Owner</dt><dd title={summaryOwner}>{summaryOwner}</dd></div>
                    <div><dt>Plan</dt><dd>{step >= 2 ? planLabel : "Selected in step 2"}</dd></div>
                    <div><dt>Template</dt><dd>{`Template ${templatesStudioVisibleKeys.findIndex(key => newStoreTemplateLabels[key] === template) + 1}`}</dd></div>
                  </dl>
                  <div className="store-onboarding-summary__secure">
                    <PiShieldCheck />
                    <span><strong>Made for this store</strong><small>Its design, products and access are managed independently.</small></span>
                  </div>
                </aside>
              </div>

              <footer className="store-onboarding__footer">
                <button
                  type="button"
                  className="store-onboarding__back"
                  onClick={goBack}
                  disabled={submitting}
                >
                  {step > 1 ? <PiArrowLeft /> : null}
                  {step === 1 ? "Cancel" : "Back"}
                </button>
                <div className="store-onboarding__footer-actions">
                  <div>
                    <button
                      type="button"
                      className="store-onboarding-button store-onboarding-button--outline"
                      onClick={handleSaveDraft}
                      disabled={submitting}
                    >
                      Save for later
                    </button>
                    <button
                      type="submit"
                      className="store-onboarding-button store-onboarding-button--primary"
                      disabled={submitting || Boolean(resumeDraftId)}
                    >
                      {submitting ? (
                        <>
                          <PiSpinnerGap className="store-onboarding-spin" />
                          {stage === "commerce" ? "Setting up" : "Creating"}
                        </>
                      ) : (
                        <>
                          {step === 4 ? "Create Store" : "Continue"}
                          <PiArrowRight />
                        </>
                      )}
                    </button>
                  </div>
                  <p role={draftNotice ? "status" : undefined}>
                    {draftNotice ?? "You can review everything before creation."}
                  </p>
                </div>
              </footer>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
