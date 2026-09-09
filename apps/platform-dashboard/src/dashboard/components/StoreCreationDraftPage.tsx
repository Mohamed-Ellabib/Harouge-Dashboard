import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { confirmCreationDraft, deleteCreationDraft, draftCatalog, storeCategories, listCreationDrafts, readCreationDraft, runCreationTrial, saveCreationDraft, type CreationDraft, type CreationDraftSummary, type CreationProduct, type CreationValues } from "../creation-drafts"
import { DASHBOARD_BEFORE_NAVIGATION_EVENT, navigateDashboard, navigateDashboardDetail } from "../routing"
import { LiveDraftPreview } from "./AdminStorefrontEditorPage"
import { applyGlowContent, GlowContentDialog, glowContentField } from "./GlowContentDialog"
import { GlowStoreSettings } from "./GlowStoreSettings"
import { uploadPlatformImage } from "../api"
import "./glow-phone-editor.css"
import "./store-creation-draft.css"

const phones = [
  { id: "iphone-15", device: "mobile" as const, label: "iPhone 15 Pro Max", width: 430, height: 932 },
  { id: "iphone-12", device: "mobile" as const, label: "iPhone 12", width: 390, height: 844 },
  { id: "galaxy", device: "mobile" as const, label: "Galaxy Ultra", width: 412, height: 915 },
]
const message = (error: unknown) => error instanceof Error ? error.message : "The draft could not be saved. Your edits are still here."

export function CreationDraftList({ query = "" }: { query?: string }) {
  const [drafts, setDrafts] = useState<CreationDraftSummary[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CreationDraftSummary | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [notice, setNotice] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const deleteLock = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true); setError("")
    void listCreationDrafts().then(result => { if (active) setDrafts(result.drafts.filter(d => d.status !== "confirmed")) })
      .catch(() => { if (active) setError("Saved drafts are temporarily unavailable.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])
  useEffect(() => {
    if (deleteTarget && !dialog.current?.open) dialog.current?.showModal()
    else if (!deleteTarget) dialog.current?.close()
  }, [deleteTarget])
  const remove = async () => {
    if (!deleteTarget || deleteLock.current) return
    deleteLock.current = true; setDeleting(true); setDeleteError("")
    try {
      await deleteCreationDraft(deleteTarget.id, deleteTarget.revision)
      setDrafts(current => current.filter(draft => draft.id !== deleteTarget.id))
      setNotice(`“${deleteTarget.name}” was permanently deleted.`)
      setDeleteTarget(null)
    } catch (error) { setDeleteError(error instanceof Error ? error.message : "Deletion failed. Your draft is still saved.") }
    finally { deleteLock.current = false; setDeleting(false) }
  }
  const visibleDrafts = drafts.filter(draft => `${draft.name} ${draft.owner_name || ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section className="creation-draft-list">
    <div className="creation-draft-list__heading"><h2>Continue creating a store</h2><button type="button" disabled={loading || deleting} onClick={() => setReload(value => value + 1)}>Refresh</button></div>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading saved drafts…</p> : error ? <p role="alert">{error}</p>
      : !visibleDrafts.length ? <p>{drafts.length ? "No drafts match your search." : "No saved drafts yet. Choose a template to start creating your store."}</p>
      : visibleDrafts.map(draft => <article className="creation-draft-list__row" key={draft.id}>
        <button className="creation-draft-list__resume" type="button" onClick={() => navigateDashboardDetail("storefronts", draft.id)}>
          <strong>{draft.name}</strong><span>{draft.owner_name || "Owner not selected"} · {draft.status === "confirming" ? "Resume confirmation" : "Saved draft"}</span><span>Continue →</span>
        </button>
        <button className="creation-draft-list__delete" type="button" disabled={draft.status !== "draft" || Boolean(draft.store_profile_id)}
          title={draft.status !== "draft" || draft.store_profile_id ? "Store setup has started. Resume setup to manage the resulting store." : "Permanently delete this draft"}
          aria-label={`Delete draft ${draft.name}`} onClick={() => { setDeleteError(""); setDeleteTarget(draft) }}>Delete</button>
      </article>)}
    <dialog ref={dialog} className="creation-draft-delete-dialog" aria-labelledby="creation-draft-delete-title"
      onCancel={event => { if (deleteLock.current) event.preventDefault(); else setDeleteTarget(null) }}>
      <h2 id="creation-draft-delete-title">Delete this draft permanently?</h2>
      <p>“{deleteTarget?.name}” and all of its saved design, sample products, trial carts and test orders will be permanently removed. This cannot be undone.</p>
      {deleteError && <p role="alert">{deleteError}</p>}
      <div className="creation-draft-delete-dialog__actions">
        <button type="button" autoFocus disabled={deleting} onClick={() => setDeleteTarget(null)}>Keep draft</button>
        <button className="creation-draft-list__delete" type="button" disabled={deleting} onClick={() => void remove()}>{deleting ? "Deleting…" : "Delete permanently"}</button>
      </div>
    </dialog>
  </section>
}

export function StoreCreationDraftPage({ id, onConfirmed }: { id: string; onConfirmed: () => Promise<void> }) {
  const [draft, setDraft] = useState<CreationDraft | null>(null)
  const [values, setValues] = useState<CreationValues | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(true)
  const [selection, setSelection] = useState<string | null>(null)
  const [showOwner, setShowOwner] = useState(false)
  const [phone, setPhone] = useState(phones[0])
  const [password, setPassword] = useState("")
  const [trialOrders, setTrialOrders] = useState<{ display_id: string; total: number }[] | null>(null)
  const latest = useRef<CreationValues | null>(null)
  const saved = useRef<CreationDraft | null>(null)
  const pending = useRef<Promise<CreationDraft> | null>(null)
  const undo = useRef<CreationValues[]>([])

  useEffect(() => {
    let active = true
    void readCreationDraft(id).then(({ draft: result }) => { if (active) { saved.current = result; latest.current = result.values; setDraft(result); setValues(result.values) } }).catch(error => { if (active) setError(message(error)) })
    return () => { active = false }
  }, [id])

  const update = useCallback((change: (current: CreationValues) => CreationValues) => {
    if (!latest.current || saved.current?.status !== "draft") return
    undo.current = [...undo.current.slice(-19), latest.current]
    latest.current = change(latest.current)
    setValues(latest.current)
  }, [])
  const dirty = values !== null && JSON.stringify(values) !== JSON.stringify(draft?.values)
  const flush = useCallback(async (): Promise<CreationDraft> => {
    while (pending.current) await pending.current
    const current = saved.current
    const snapshot = latest.current
    if (!current || !snapshot) throw new Error("The saved draft has not loaded yet.")
    if (current.status !== "draft" || JSON.stringify(snapshot) === JSON.stringify(current.values)) return current
    setSaving(true)
    const request = saveCreationDraft(id, current.revision, snapshot).then(({ draft: result }) => {
      saved.current = result; setDraft(result); setError("")
      if (latest.current === snapshot) { latest.current = result.values; setValues(result.values) }
      return result
    })
    pending.current = request
    try { return await request } catch (error) { setError(message(error)); throw error }
    finally { if (pending.current === request) pending.current = null; setSaving(false) }
  }, [id])
  useEffect(() => {
    if (!dirty || confirming || draft?.status !== "draft") return
    const timer = window.setTimeout(() => { void flush().catch(() => undefined) }, 800)
    return () => window.clearTimeout(timer)
  }, [values, confirming, draft?.status, flush])
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty || confirming) { event.preventDefault(); event.returnValue = "" } }
    const leave = (event: Event) => { if ((dirty || confirming) && !window.confirm("This draft still has unsaved work. Leave this screen?")) event.preventDefault() }
    window.addEventListener("beforeunload", unload); window.addEventListener(DASHBOARD_BEFORE_NAVIGATION_EVENT, leave)
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener(DASHBOARD_BEFORE_NAVIGATION_EVENT, leave) }
  }, [dirty, confirming])

  const catalog = useMemo(() => values ? draftCatalog(values, id) : [], [id, values])
  const previewStore = useMemo(() => ({ id, handle: `draft-${id.slice(8)}`, domains: [], commerce_readiness: null }), [id])
  const trialRequest = useCallback(async (command: unknown) => { await flush(); return runCreationTrial(id, command) }, [flush, id])
  const confirm = async () => {
    if (confirming) return
    setConfirming(true); setError("")
    try {
      // Freeze editing first, then commit exactly the reviewed revision.
      const current = await flush()
      const { draft: result } = await confirmCreationDraft(id, current.revision, password || undefined)
      saved.current = result; latest.current = result.values; setDraft(result); setValues(result.values); setPassword(""); setShowOwner(false)
      await onConfirmed()
    } catch (error) {
      setError(message(error))
      // Confirmation may have persisted resumable checkpoints before failing.
      try { const result = await readCreationDraft(id); saved.current = result.draft; setDraft(result.draft) } catch { /* Keep the current editor and error. */ }
    } finally { setConfirming(false) }
  }
  if (!draft || !values) return <section><p role="status">{error || "Opening your saved store draft…"}</p><button onClick={() => navigateDashboard("storefronts")}>Back to templates</button></section>
  const locked = confirming || draft.status !== "draft"
  const contentLanguage = ["urbx", "template-6"].includes(values.document.template_key) ? "en" : values.configuration.locale.startsWith("en") ? "en" : "ar"
  const field = selection ? glowContentField(values.document, selection, contentLanguage) : null
  const product = selection?.startsWith("product.") ? values.products.find(p => p.slug === selection.slice(8)) : null
  return createPortal(<section className="glow-phone-editor creation-editor">
    <header className="glow-phone-editor__header">
      <button onClick={() => navigateDashboard("storefronts")}>← Templates</button>
      <h1>{values.configuration.name}<span>{draft.status === "confirmed" ? "Store created · not published" : "Store draft"}</span></h1>
      <span className="glow-phone-editor__save-status" role="status">{saving ? "Saving…" : dirty ? "Unsaved changes" : `Saved · revision ${draft.revision}`}</span>
      <button disabled={!undo.current.length || locked} onClick={() => { const previous = undo.current.pop(); if (previous) { latest.current = previous; setValues(previous) } }}>Undo</button>
      <button onClick={() => setShowOwner(true)}>{draft.status === "confirmed" ? "Owner details" : "Owner & setup"}</button>
      {draft.store_profile_id && draft.status === "confirmed" ? <button className="is-primary" onClick={() => navigateDashboardDetail("storefronts", draft.store_profile_id!)}>Open store & publish</button> : <button className="is-primary" disabled={confirming} onClick={() => setShowOwner(true)}>{confirming ? "Creating store…" : draft.status === "confirming" ? "Resume confirmation" : "Confirm & create store"}</button>}
    </header>
    <div className="creation-editor__controls">
      <div className="glow-phone-editor__mode"><button aria-pressed={editing} disabled={locked} onClick={() => setEditing(true)}>Click to edit</button><button aria-pressed={!editing} onClick={() => setEditing(false)}>Try the store</button></div>
      <select aria-label="Phone size" value={phone.id} onChange={e => setPhone(phones.find(p => p.id === e.target.value)!)}>{phones.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <button onClick={() => { void runCreationTrial(id, { action: "orders" }).then(result => setTrialOrders(result as { display_id: string; total: number }[])).catch(error => setError(message(error))) }}>Test orders</button>
    </div>
    <GlowStoreSettings configuration={values.configuration} document={values.document} onAppearanceChange={appearance => update(v => ({ ...v, document: { ...v.document, appearance } }))} disabled={locked} onChange={change => update(v => ({ ...v, configuration: change(v.configuration) }))} />
    {error ? <p className="glow-phone-editor__error" role="alert">{error} {draft.status === "draft" ? <button onClick={() => { void flush().catch(() => undefined) }}>Retry save</button> : null}</p> : null}
    <LiveDraftPreview configuration={values.configuration} document={values.document} expanded originalDesignPreview={false} creationDraftId={id} catalogOverride={catalog}
      onTrialRequest={trialRequest} designEditing={editing && !locked} onDesignSelect={setSelection} preset={phone} scaleMode="fit" store={previewStore} />
    <p className="glow-phone-editor__hint">{editing ? "Click text, images or products inside the phone to edit." : "Trial checkout saves test orders only. No payments, stock changes or customer notifications."} <span>Draft prices are in LYD. Publishing is a separate step.</span></p>
    {field ? <GlowContentDialog key={field.key} field={field} onClose={() => setSelection(null)} onApply={text => { update(current => {
      const nextDocument = applyGlowContent(current.document, field.key, text, contentLanguage)
      const category = /^category\.([a-z0-9-]+)\.name$/.exec(field.key)
      const oldName = category && contentLanguage === "en" ? current.document.brands.items.find(c => c.slug === category[1])?.name.en : null
      return { ...current, document: nextDocument, products: oldName ? current.products.map(p => p.category === oldName ? { ...p, category: text } : p) : current.products }
    }); setSelection(null) }} /> : null}
    {product ? <CreationProductDialog key={product.slug} product={product} galleryEditing={["urbx", "template-6"].includes(values.document.template_key)} categories={values.document.brands.items.map(c => c.name.en)} onClose={() => setSelection(null)} onApply={next => { update(v => ({ ...v, products: v.products.map(p => p.slug === next.slug ? next : p) })); setSelection(null) }} /> : null}
    {showOwner ? <CreationDialog title="Owner & store setup" onClose={() => { if (!confirming) { setShowOwner(false); setPassword("") } }}>
      <p>Your exact saved design and starter products will belong to this store. Confirmation does not publish it.</p>
      {values.starter_catalog ? <p><strong>{storeCategories.find(category => category.key === values.starter_catalog)?.label}</strong> · {values.products.length} sample products. Edit or replace them before publishing.</p> : null}
      {draft.status === "confirming" && draft.confirmation_progress ? <p role="status">{draft.confirmation_progress.owner_and_store ? "Owner and store are saved. " : "Owner and store setup is pending. "}{draft.confirmation_progress.commerce ? "Delivery and checkout are ready. " : ""}{draft.confirmation_progress.catalog ? "Starter products are saved. " : ""}{draft.confirmation_progress.presentation ? "Template is saved. " : ""}Resume to finish the remaining steps.</p> : null}
      <fieldset disabled={locked}>
        <label>Owner name<input value={values.owner.name} maxLength={120} onChange={e => { const name = e.target.value; update(v => ({ ...v, owner: { ...v.owner, name } })) }} /></label>
        <label>Owner email<input type="email" value={values.owner.email} onChange={e => { const email = e.target.value; update(v => ({ ...v, owner: { ...v.owner, email } })) }} /></label>
        <label>Store handle<input value={values.handle} placeholder="my-glow-store" onChange={e => { const handle = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""); update(v => ({ ...v, handle })) }} /></label>
        <label><span><input type="checkbox" checked={values.owner.reuse_existing} onChange={e => { const reuse_existing = e.target.checked; update(v => ({ ...v, owner: { ...v.owner, reuse_existing } })) }} /> Use an existing merchant account</span></label>
        <label>Standard delivery fee (LYD)<input type="number" min={0} step={1} value={values.delivery_amount} onChange={e => { const delivery_amount = Number(e.target.value); update(v => ({ ...v, delivery_amount })) }} /></label>
      </fieldset>
      {!values.owner.reuse_existing && draft.status !== "confirmed" && !draft.confirmation_progress?.owner_and_store ? <label>Temporary owner password<input type="password" autoComplete="new-password" maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><small>{draft.status === "confirming" ? "If confirmation was interrupted, enter the same temporary password you originally used. It is never saved in the draft." : "Used only to create the account. Never saved in your draft."}</small></label> : null}
      {error ? <p role="alert">{error}</p> : null}
      {draft.status !== "confirmed" ? <button className="is-primary" disabled={confirming || !values.owner.name || !values.owner.email || !values.handle} onClick={() => void confirm()}>{confirming ? "Creating…" : draft.status === "confirming" ? "Resume store setup" : "Confirm saved design & create store"}</button> : <p>This store is connected to its owner. Publishing is available in the store editor.</p>}
    </CreationDialog> : null}
    {trialOrders ? <CreationDialog title="Saved test orders" onClose={() => setTrialOrders(null)}><p>Separate from merchant sales, inventory and customer notifications.</p>{trialOrders.length ? trialOrders.map(order => <p key={order.display_id}><strong>{order.display_id}</strong> · {order.total.toFixed(3)} LYD · Test order confirmed</p>) : <p>No test orders yet. Choose “Try the store” and complete checkout.</p>}</CreationDialog> : null}
  </section>, document.body)
}

function CreationDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close() }, [])
  return createPortal(<dialog className="glow-content-dialog creation-dialog" aria-label={title} ref={ref} onCancel={event => { event.preventDefault(); onClose() }}><header><h2>{title}</h2><button onClick={onClose} aria-label="Close">×</button></header>{children}</dialog>, document.body)
}
function CreationProductDialog({ product, categories, galleryEditing, onApply, onClose }: { product: CreationProduct; categories: string[]; galleryEditing: boolean; onApply: (p: CreationProduct) => void; onClose: () => void }) {
  const [value, setValue] = useState(product)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  return <CreationDialog title="Edit product" onClose={onClose}>
    <img className="creation-dialog__product" src={value.thumbnail} alt={value.title} />
    <label>{galleryEditing ? "Replace catalog thumbnail" : "Replace product image"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setUploading(true); setError(""); try { const url = await uploadPlatformImage(file); setValue(v => ({ ...v, thumbnail: url, images: galleryEditing ? v.images : [url, ...v.images.slice(1)] })) } catch (error) { setError(message(error)) } finally { setUploading(false) } }} /></label>
    {galleryEditing && <fieldset disabled={uploading}><legend>Product gallery</legend><small>The first photo is the main product view. These photos are independent from the shop thumbnail.</small>
      {value.images.map((src, index) => <div className="creation-dialog__gallery-image" key={`${index}:${src}`}><img src={src} alt={`Product view ${index + 1}`} /><div>
        <label>Replace view {index + 1}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setUploading(true); setError(""); try { const url = await uploadPlatformImage(file); setValue(v => ({ ...v, images: v.images.map((image, i) => i === index ? url : image) })) } catch (error) { setError(message(error)) } finally { setUploading(false) } }} /></label>
        <button type="button" disabled={value.images.length <= 1} onClick={() => setValue(v => ({ ...v, images: v.images.filter((_, i) => i !== index) }))}>Remove view {index + 1}</button>
      </div></div>)}
      {value.images.length < 8 && <label>Add gallery photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setUploading(true); setError(""); try { const url = await uploadPlatformImage(file); setValue(v => ({ ...v, images: [...v.images, url].slice(0, 8) })) } catch (error) { setError(message(error)) } finally { setUploading(false) } }} /></label>}
    </fieldset>}
    <label>Name<input value={value.title} maxLength={160} onChange={e => setValue({ ...value, title: e.target.value })} /></label>
    <label>Short description<input value={value.subtitle} maxLength={200} onChange={e => setValue({ ...value, subtitle: e.target.value })} /></label>
    <label>Description<textarea value={value.description} maxLength={3000} onChange={e => setValue({ ...value, description: e.target.value.replace(/[\r\n]/g, " ") })} /></label>
    <label>Category<select value={value.category} onChange={e => setValue({ ...value, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
    {value.variants.map((variant, index) => <fieldset key={index}><legend>{variant.size}{variant.color ? ` · ${variant.color}` : ""}</legend><div className="creation-dialog__variant">
      {(["amount", "stock"] as const).map(key => <label key={key}>{key === "amount" ? "Price (LYD)" : "Stock"}<input type="number" min={0} step={key === "stock" ? 1 : .001} value={variant[key]} onChange={e => { const amount = Number(e.target.value); setValue(v => ({ ...v, variants: v.variants.map((item, i) => i === index ? { ...item, [key]: amount } : item) })) }} /></label>)}
    </div></fieldset>)}
    {error ? <p role="alert">{error}</p> : null}<footer><button onClick={onClose}>Cancel</button><button className="is-primary" disabled={uploading || !value.title.trim()} onClick={() => onApply(value)}>Apply product changes</button></footer>
  </CreationDialog>
}
