import type { StorefrontAppearance } from "../types"
import { useEffect, useState } from "react"

function HexColorInput({ value, label, onChange }: { value: string; label: string; onChange: (color: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return <input className="urbx-settings__hex" aria-label={label + " hex"} value={text} maxLength={7} onChange={event => {
    const color = event.target.value
    setText(color)
    if (/^#[0-9a-f]{6}$/i.test(color)) onChange(color)
  }} onBlur={() => { if (!/^#[0-9a-f]{6}$/i.test(text)) setText(value) }} />
}

const fonts = [
  ["original", "Original template fonts"], ["cairo", "Cairo · Arabic & Latin"],
  ["manrope", "Manrope"], ["condensed", "Roboto Condensed"], ["anton", "Anton"],
  ["marker", "Permanent Marker"], ["system", "System sans-serif"], ["serif", "Georgia · Serif"],
] as const

export function UrbxAppearanceSettings({ value = {}, background, accent, disabled, onChange }: {
  value?: StorefrontAppearance
  background: string
  accent: string
  disabled: boolean
  onChange: (value: StorefrontAppearance | undefined) => void
}) {
  const groups = [
    { title: "Page colors", fields: [
      ["text_color", "Main text", "#ffffff"], ["heading_color", "Headings", value.text_color ?? "#ffffff"],
      ["muted_text_color", "Secondary text", "#a0a0a0"], ["button_text_color", "Button text", "#070707"],
      ["surface_color", "Cards & panels", "#101110"],
    ] },
    { title: "Navbar colors", fields: [
      ["navbar_background", "Navbar background", background], ["navbar_text_color", "Navbar text & icons", "#898d89"],
      ["navbar_active_color", "Active navbar item", accent],
    ] },
  ] as const
  return <>
    {groups.map(group => <fieldset disabled={disabled} key={group.title}><legend>{group.title}</legend>
      {group.fields.map(([key, label, fallback]) => <label className="glow-store-settings__color" key={key}>
        <span>{label}</span>
        <input type="color" aria-label={label} value={value[key] ?? fallback} onChange={event => onChange({ ...value, [key]: event.target.value })} />
        <HexColorInput label={label} value={value[key] ?? fallback} onChange={color => onChange({ ...value, [key]: color })} />
      </label>)}
    </fieldset>)}
    <fieldset disabled={disabled}><legend>Typography</legend>
      {([["body_font", "Body & navigation font"], ["heading_font", "Heading & display font"]] as const).map(([key, label]) => <label className="glow-store-settings__name" key={key}>{label}
        <select aria-label={label} value={value[key] ?? "original"} onChange={event => onChange({ ...value, [key]: event.target.value as StorefrontAppearance[typeof key] })}>
          {fonts.map(([font, name]) => <option key={font} value={font}>{name}</option>)}
        </select>
      </label>)}
      <small>Fonts and colors apply across Template 5 pages. Lettering inside photographs is part of the image.</small>
      <button type="button" onClick={() => onChange(undefined)}>Reset text, navbar & fonts</button>
    </fieldset>
  </>
}
