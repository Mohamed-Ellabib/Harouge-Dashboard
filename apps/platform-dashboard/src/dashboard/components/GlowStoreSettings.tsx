import type { PlatformStoreConfiguration, PlatformStorefrontDocument } from "../types"
import { UrbxAppearanceSettings } from "./UrbxAppearanceSettings"

const palettes = [
  { name: "Original glow", accent: "#f35b05", background: "#fffaf5" },
  { name: "Rose", accent: "#b83e68", background: "#fff5f8" },
  { name: "Sage", accent: "#337664", background: "#f3f8f4" },
  { name: "Ocean", accent: "#2469b5", background: "#f3f7fc" },
] as const

export function GlowStoreSettings({ configuration, document, onAppearanceChange, disabled, onChange }: {
  document?: PlatformStorefrontDocument
  onAppearanceChange?: (appearance: PlatformStorefrontDocument["appearance"]) => void
  configuration: PlatformStoreConfiguration
  disabled: boolean
  onChange: (update: (current: PlatformStoreConfiguration) => PlatformStoreConfiguration) => void
}) {
  const changeColor = (key: "primary_color" | "secondary_color", value: string) => {
    if (/^#[0-9a-f]{6}$/i.test(value)) onChange(current => ({ ...current, brand: { ...current.brand, [key]: value } }))
  }
  return <details className="glow-store-settings">
    <summary>{document?.template_key === "urbx" ? "Store design & typography" : "Store name & colors"}</summary>
    <div className="glow-store-settings__panel">
      <h2>Make it your store</h2>
      <p>Changes appear in the phone immediately.</p>
      <label className="glow-store-settings__name">Store name
        <input value={configuration.name} disabled={disabled} maxLength={120} onChange={event => {
          const name = event.target.value
          onChange(current => ({ ...current, name }))
        }} />
      </label>
      {([
        ["primary_color", "Accent & buttons", "#f35b05"],
        ["secondary_color", "Background tint", "#fffaf5"],
      ] as const).map(([key, label, fallback]) => <label className="glow-store-settings__color" key={key}>
        <span>{label}</span><input aria-label={label} type="color" disabled={disabled} value={configuration.brand[key] ?? fallback} onChange={event => changeColor(key, event.target.value)} />
        <code>{configuration.brand[key] ?? fallback}</code>
      </label>)}
      <fieldset disabled={disabled}><legend>Ready-made palettes</legend><div className="glow-store-settings__palettes">
        {palettes.map(palette => <button type="button" key={palette.name} onClick={() => onChange(current => ({ ...current,
          brand: { ...current.brand, primary_color: palette.accent, secondary_color: palette.background },
        }))}><i style={{ background: palette.accent }} /><span>{palette.name}</span></button>)}
      </div></fieldset>
      {document?.template_key === "urbx" && onAppearanceChange ? <UrbxAppearanceSettings value={document.appearance} background={configuration.brand.secondary_color ?? "#070707"} accent={configuration.brand.primary_color ?? "#d5ff00"} disabled={disabled} onChange={onAppearanceChange} /> : null}
      <small>Save your changes to keep these settings. Template colors and fonts are part of the saved design; publication is separate. Colors inside photographs stay unchanged.</small>
    </div>
  </details>
}
