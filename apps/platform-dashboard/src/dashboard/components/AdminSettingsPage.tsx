import {
  PiBuildings,
  PiGear,
  PiImage,
  PiKey,
  PiPencilSimple,
  PiPlus,
  PiPower,
  PiTrash,
  PiUploadSimple,
  PiUsersThree,
  PiX,
} from "react-icons/pi"
import { useEffect, useMemo, useRef, useState } from "react"

import type { PlatformAdmin } from "../../auth/platform-auth"
import {
  createPlatformUser,
  deletePlatformUser,
  getPlatformSettings,
  listPlatformUsers,
  resetPlatformUserPassword,
  savePlatformSettings,
  updatePlatformUser,
  uploadPlatformImage,
} from "../api"
import type { PlatformSettings, PlatformUser } from "../types"

import "./admin-settings-security.css"

type AdminSettingsPageProps = {
  admin: PlatformAdmin
  isDemo: boolean
  onToast: (message: string) => void
}

type SettingsTab = "general" | "users"
type UserForm = {
  id: string | null
  first_name: string
  last_name: string
  email: string
  avatar_url: string
  password: string
}

const emptyUserForm: UserForm = {
  id: null,
  first_name: "",
  last_name: "",
  email: "",
  avatar_url: "",
  password: "",
}

const demoSettings: PlatformSettings = {
  platformName: "LabibTech Commerce",
  companyName: "LabibTech",
  logoUrl: null,
  systemEmail: "system@labibtech.ly",
  supportEmail: "support@labibtech.ly",
  companyWebsite: "https://www.labibtech.ly",
}

const sameSettings = (left: PlatformSettings, right: PlatformSettings) =>
  JSON.stringify(left) === JSON.stringify(right)

const initials = (user: Pick<PlatformUser, "first_name" | "last_name" | "email">) =>
  `${user.first_name?.[0] ?? user.email[0] ?? "A"}${user.last_name?.[0] ?? ""}`.toUpperCase()

export function AdminSettingsPage({ admin, isDemo, onToast }: AdminSettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>("general")
  const [savedValues, setSavedValues] = useState<PlatformSettings>(demoSettings)
  const [values, setValues] = useState<PlatformSettings>(demoSettings)
  const [revision, setRevision] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(!isDemo)
  const [saving, setSaving] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<UserForm | null>(null)
  const [resetUser, setResetUser] = useState<PlatformUser | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const previewUrls = useRef<string[]>([])
  const dirty = useMemo(() => !sameSettings(values, savedValues), [savedValues, values])

  useEffect(() => {
    if (isDemo) {
      setUsers([
        {
          id: admin.id,
          email: admin.email,
          first_name: admin.first_name ?? "Mohamed",
          last_name: admin.last_name ?? "Ellabib",
          avatar_url: "/assets/admin-overview-avatar-tight.png",
          status: "active",
          role: "Super Admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    Promise.all([
      getPlatformSettings(controller.signal),
      listPlatformUsers(controller.signal),
    ])
      .then(([record, loadedUsers]) => {
        setValues(record.settings)
        setSavedValues(record.settings)
        setRevision(record.revision)
        setUpdatedAt(record.updated_at)
        setUsers(loadedUsers)
      })
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "Platform settings could not be loaded."),
      )
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [admin, isDemo])

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url)
  }, [])

  const updateValue = <Key extends keyof PlatformSettings>(key: Key, value: PlatformSettings[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  const saveGeneral = async () => {
    setSaving(true)
    setError(null)
    try {
      if (isDemo) {
        setSavedValues({ ...values })
        setUpdatedAt(new Date().toISOString())
        onToast("Demo company settings saved for this session.")
      } else {
        const record = await savePlatformSettings(values, revision)
        setValues(record.settings)
        setSavedValues(record.settings)
        setRevision(record.revision)
        setUpdatedAt(record.updated_at)
        onToast("SaaS system settings saved to the database.")
      }
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Settings could not be saved."
      setError(message)
      onToast(message)
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (file: File, target: "logo" | "avatar") => {
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP image no larger than 2 MB.")
      return
    }
    if (isDemo) {
      const preview = URL.createObjectURL(file)
      previewUrls.current.push(preview)
      if (target === "logo") updateValue("logoUrl", preview)
      else setUserForm((current) => (current ? { ...current, avatar_url: preview } : current))
      return
    }
    setSaving(true)
    try {
      const url = await uploadPlatformImage(file)
      if (target === "logo") updateValue("logoUrl", url)
      else setUserForm((current) => (current ? { ...current, avatar_url: url } : current))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.")
    } finally {
      setSaving(false)
    }
  }

  const submitUser = async () => {
    if (!userForm) return
    setUsersLoading(true)
    setError(null)
    try {
      if (isDemo) {
        onToast("User changes are read-only in preview mode.")
        return
      }
      if (userForm.id) {
        const updated = await updatePlatformUser(userForm.id, {
          email: userForm.email,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          avatar_url: userForm.avatar_url || null,
        })
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)))
        onToast("Platform user updated.")
      } else {
        const created = await createPlatformUser({
          email: userForm.email,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          avatar_url: userForm.avatar_url || null,
          password: userForm.password,
        })
        setUsers((current) => [...current, created])
        onToast("Super Admin account created.")
      }
      setUserForm(null)
    } catch (userError) {
      setError(userError instanceof Error ? userError.message : "Platform user could not be saved.")
    } finally {
      setUsersLoading(false)
    }
  }

  const changeStatus = async (user: PlatformUser) => {
    if (isDemo) return onToast("User changes are read-only in preview mode.")
    try {
      const updated = await updatePlatformUser(user.id, {
        status: user.status === "active" ? "disabled" : "active",
      })
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      onToast(updated.status === "active" ? "Platform user enabled." : "Platform user disabled.")
    } catch (statusError) {
      onToast(statusError instanceof Error ? statusError.message : "Access status could not be changed.")
    }
  }

  const removeUser = async (user: PlatformUser) => {
    if (!window.confirm(`Delete ${user.email}? This removes the login permanently.`)) return
    if (isDemo) return onToast("User deletion is read-only in preview mode.")
    try {
      await deletePlatformUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      onToast("Platform user deleted.")
    } catch (deleteError) {
      onToast(deleteError instanceof Error ? deleteError.message : "Platform user could not be deleted.")
    }
  }

  const submitPassword = async () => {
    if (!resetUser) return
    if (isDemo) return onToast("Password reset is read-only in preview mode.")
    try {
      await resetPlatformUserPassword(resetUser.id, resetPassword)
      setResetPassword("")
      setResetUser(null)
      onToast("Password updated. The user can sign in with the new password.")
    } catch (passwordError) {
      onToast(passwordError instanceof Error ? passwordError.message : "Password could not be reset.")
    }
  }

  return (
    <section className="admin-settings-page admin-system-settings" aria-labelledby="admin-settings-title" aria-busy={loading}>
      <header className="admin-page-heading admin-settings-heading">
        <div className="admin-page-heading__copy">
          <h1 id="admin-settings-title">System Settings</h1>
          <p>Manage the SaaS identity and the people who control the whole platform</p>
        </div>
        {tab === "general" ? (
          <div className="admin-page-actions admin-settings-heading__actions">
            <button className="admin-page-button" type="button" disabled={!dirty || saving} onClick={() => setValues(savedValues)}>Discard</button>
            <span className={`admin-settings-dirty${dirty ? " is-dirty" : ""}`}><i />{dirty ? "Unsaved changes" : updatedAt ? "Saved to database" : "Database defaults loaded"}</span>
            <button className="admin-page-button admin-page-button--primary" type="button" disabled={!dirty || saving} onClick={() => void saveGeneral()}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        ) : (
          <button className="admin-page-button admin-page-button--primary" type="button" onClick={() => setUserForm({ ...emptyUserForm })}><PiPlus /> Add Platform User</button>
        )}
      </header>

      {error ? <div className="admin-settings-error" role="alert">{error}</div> : null}
      {isDemo ? <p className="admin-settings-demo-note">Preview mode is read-only for user management. Sign in as Super Admin to modify the database.</p> : null}

      <div className="admin-system-tabs" role="tablist" aria-label="System settings">
        <button type="button" role="tab" aria-selected={tab === "general"} className={tab === "general" ? "is-active" : undefined} onClick={() => setTab("general")}><PiGear /> General</button>
        <button type="button" role="tab" aria-selected={tab === "users"} className={tab === "users" ? "is-active" : undefined} onClick={() => setTab("users")}><PiUsersThree /> Platform Users <span>{users.length}</span></button>
      </div>

      {tab === "general" ? (
        <div className="admin-system-general">
          <section className="admin-page-card admin-system-identity-card">
            <div className="admin-settings-section-title"><div><h2>System Identity</h2><p>Name and visual identity shown across the control plane</p></div><PiBuildings /></div>
            <div className="admin-system-logo-row">
              <div className="admin-system-logo-preview">{values.logoUrl ? <img src={values.logoUrl} alt="System logo" /> : <PiImage />}</div>
              <div><strong>Company logo</strong><small>JPG, PNG or WebP, up to 2 MB</small><button type="button" className="admin-page-button" onClick={() => fileInput.current?.click()}><PiUploadSimple /> Upload Logo</button><input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "logo"); event.target.value = "" }} /></div>
            </div>
            <div className="admin-settings-form-grid">
              <label><span>System Name</span><input value={values.platformName} maxLength={100} onChange={(e) => updateValue("platformName", e.target.value)} /></label>
              <label><span>Company Name</span><input value={values.companyName} maxLength={120} onChange={(e) => updateValue("companyName", e.target.value)} /></label>
            </div>
          </section>

          <section className="admin-page-card admin-system-contact-card">
            <div className="admin-settings-section-title"><div><h2>Company & System Contact</h2><p>Official contact points used by the SaaS</p></div></div>
            <div className="admin-settings-form-grid">
              <label><span>System Email</span><input type="email" value={values.systemEmail} maxLength={254} onChange={(e) => updateValue("systemEmail", e.target.value)} /></label>
              <label><span>Support Email</span><input type="email" value={values.supportEmail} maxLength={254} onChange={(e) => updateValue("supportEmail", e.target.value)} /></label>
              <label className="admin-system-wide-field"><span>Company Website</span><input type="url" value={values.companyWebsite} maxLength={2048} onChange={(e) => updateValue("companyWebsite", e.target.value)} /></label>
            </div>
          </section>

          <aside className="admin-page-card admin-system-summary-card">
            <h2>System Record</h2>
            <dl><div><dt>Scope</dt><dd>Whole SaaS platform</dd></div><div><dt>Access</dt><dd>Super Admin only</dd></div><div><dt>Revision</dt><dd>{revision}</dd></div><div><dt>Storage</dt><dd>Supabase PostgreSQL</dd></div></dl>
            <p><span className="admin-page-status-dot" /> Database-backed and revision protected</p>
          </aside>
        </div>
      ) : (
        <section className="admin-page-card admin-platform-users-card">
          <div className="admin-settings-section-title"><div><h2>Platform Administrators</h2><p>Only these Super Admin users can access and change the whole SaaS system</p></div></div>
          {usersLoading ? <p>Updating platform users…</p> : null}
          <div className="admin-platform-users-table" role="table" aria-label="Platform users">
            <div className="admin-platform-user-row admin-platform-user-row--head" role="row"><span>User</span><span>Role</span><span>Status</span><span>Last updated</span><span>Actions</span></div>
            {users.map((user) => (
              <div className="admin-platform-user-row" role="row" key={user.id}>
                <div className="admin-platform-user-person">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : <i>{initials(user)}</i>}<span><strong>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Platform Admin"}</strong><small>{user.email}{user.id === admin.id ? " · You" : ""}</small></span></div>
                <span className="admin-platform-role">Super Admin</span>
                <span className={`admin-platform-user-status is-${user.status}`}><i />{user.status === "active" ? "Active" : "Disabled"}</span>
                <span>{user.updated_at ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.updated_at)) : "—"}</span>
                <div className="admin-platform-user-actions">
                  <button type="button" title="Edit profile" onClick={() => setUserForm({ id: user.id, first_name: user.first_name ?? "", last_name: user.last_name ?? "", email: user.email, avatar_url: user.avatar_url ?? "", password: "" })}><PiPencilSimple /></button>
                  <button type="button" title="Reset password" onClick={() => setResetUser(user)}><PiKey /></button>
                  <button type="button" title={user.status === "active" ? "Disable user" : "Enable user"} disabled={user.id === admin.id} onClick={() => void changeStatus(user)}><PiPower /></button>
                  <button type="button" title="Delete user" disabled={user.id === admin.id} onClick={() => void removeUser(user)}><PiTrash /></button>
                </div>
              </div>
            ))}
          </div>
          <p className="admin-platform-user-safety">Your own account and the last active Super Admin are protected from disable/delete operations.</p>
        </section>
      )}

      {userForm ? (
        <div className="admin-system-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUserForm(null) }}>
          <section className="admin-system-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-user-dialog-title">
            <header><div><h2 id="platform-user-dialog-title">{userForm.id ? "Edit Platform User" : "Add Platform User"}</h2><p>Super Admin access applies to the entire SaaS system.</p></div><button type="button" aria-label="Close" onClick={() => setUserForm(null)}><PiX /></button></header>
            <div className="admin-system-avatar-editor"><div>{userForm.avatar_url ? <img src={userForm.avatar_url} alt="User avatar" /> : <PiUsersThree />}</div><label className="admin-page-button"><PiUploadSimple /> Upload Photo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "avatar") }} /></label><small>JPG, PNG or WebP · 2 MB max</small></div>
            <div className="admin-system-dialog-grid">
              <label><span>First Name</span><input autoComplete="off" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} /></label>
              <label><span>Last Name</span><input autoComplete="off" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} /></label>
              <label className="is-wide"><span>Email Address</span><input type="email" autoComplete="off" name="platform-user-email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></label>
              {!userForm.id ? <label className="is-wide"><span>Temporary Password</span><input type="password" autoComplete="new-password" name="new-platform-user-password" minLength={10} maxLength={128} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /><small>The password is hashed by Medusa and never returned.</small></label> : null}
            </div>
            <footer><button type="button" className="admin-page-button" onClick={() => setUserForm(null)}>Cancel</button><button type="button" className="admin-page-button admin-page-button--primary" disabled={usersLoading} onClick={() => void submitUser()}>{userForm.id ? "Save User" : "Create Super Admin"}</button></footer>
          </section>
        </div>
      ) : null}

      {resetUser ? (
        <div className="admin-system-dialog-backdrop" role="presentation">
          <section className="admin-system-dialog admin-system-dialog--small" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
            <header><div><h2 id="reset-password-title">Reset Password</h2><p>{resetUser.email}</p></div><button type="button" aria-label="Close" onClick={() => setResetUser(null)}><PiX /></button></header>
            <label><span>New temporary password</span><input type="password" autoComplete="new-password" name="reset-platform-user-password" minLength={10} maxLength={128} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} /></label>
            <footer><button type="button" className="admin-page-button" onClick={() => setResetUser(null)}>Cancel</button><button type="button" className="admin-page-button admin-page-button--primary" disabled={resetPassword.length < 10} onClick={() => void submitPassword()}>Update Password</button></footer>
          </section>
        </div>
      ) : null}
    </section>
  )
}
