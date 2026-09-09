import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  CaretRight,
  CheckCircle,
  Clock,
  CurrencyDollar,
  EnvelopeSimple,
  Gear,
  Globe,
  Handbag,
  LockKey,
  Palette,
  ShieldCheck,
  Storefront,
  Truck,
  UploadSimple,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";

import "./vendor-settings-panel.css";

export type VendorSettingsPanelVendor = {
  name: string;
  handle: string;
  domains: string[];
  branding: {
    logo_url: string | null;
    primary_color: string | null;
  };
};

export type VendorSettingsPanelMember = {
  email: string;
  role: "owner" | "manager";
};

export type VendorSettingsPasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type VendorSettingsPanelProps = {
  isDemo: boolean;
  vendor: VendorSettingsPanelVendor;
  member: VendorSettingsPanelMember;
  passwordForm: VendorSettingsPasswordForm;
  isSavingPassword: boolean;
  onPasswordFormChange: (form: VendorSettingsPasswordForm) => void;
  onSavePassword: () => Promise<void>;
  onOpenStore: () => void;
  onToast: (message: string) => void;
};

type SettingsTab =
  | "general"
  | "branding"
  | "orders"
  | "notifications"
  | "team"
  | "security";

type SettingsDraft = {
  storeName: string;
  storeUrl: string;
  businessEmail: string;
  phone: string;
  country: string;
  city: string;
  description: string;
  logoUrl: string;
  storeLive: boolean;
  acceptOrders: boolean;
  automaticConfirmation: boolean;
  lowStockAlerts: boolean;
};

const DEMO_LOGO = "/assets/dashboard-reference/store-clock-logo.png";

const settingsTabs = [
  { id: "general" as const, label: "General", icon: Gear },
  { id: "branding" as const, label: "Branding", icon: Palette },
  { id: "orders" as const, label: "Orders & Shipping", icon: Truck },
  { id: "notifications" as const, label: "Notifications", icon: Bell },
  { id: "team" as const, label: "Team", icon: UsersThree },
  { id: "security" as const, label: "Security", icon: ShieldCheck },
];

const stripProtocol = (value: string) =>
  value.replace(/^https?:\/\//i, "").replace(/\/$/, "");

const buildInitialDraft = (
  isDemo: boolean,
  vendor: VendorSettingsPanelVendor,
  member: VendorSettingsPanelMember,
): SettingsDraft => {
  if (isDemo) {
    return {
      storeName: "Al Sanousi Store",
      storeUrl: "alsanousi.labibtech.com",
      businessEmail: "store@alsanousi.ly",
      phone: "+218 91 234 5678",
      country: "Libya",
      city: "Tripoli",
      description: "Luxury watches selected for timeless style.",
      logoUrl: DEMO_LOGO,
      storeLive: true,
      acceptOrders: true,
      automaticConfirmation: false,
      lowStockAlerts: true,
    };
  }

  const domain = stripProtocol(
    vendor.domains[0] || `${vendor.handle || "store"}.labibtech.com`,
  );

  return {
    storeName: vendor.name,
    storeUrl: domain,
    businessEmail: member.email,
    phone: "",
    country: "Libya",
    city: "Tripoli",
    description: `${vendor.name} products and collections.`,
    logoUrl: vendor.branding.logo_url || DEMO_LOGO,
    storeLive: true,
    acceptOrders: true,
    automaticConfirmation: false,
    lowStockAlerts: true,
  };
};

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`vendor-settings__toggle${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span />
    </button>
  );
}

function PreferenceRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Handbag;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="vendor-settings__preference-row">
      <span className="vendor-settings__preference-icon">
        <Icon size={21} weight="regular" />
      </span>
      <span className="vendor-settings__preference-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Toggle checked={checked} label={title} onChange={onChange} />
    </div>
  );
}

export function VendorSettingsPanel({
  isDemo,
  vendor,
  member,
  passwordForm,
  isSavingPassword,
  onPasswordFormChange,
  onSavePassword,
  onOpenStore,
  onToast,
}: VendorSettingsPanelProps) {
  const initialDraft = useMemo(
    () => buildInitialDraft(isDemo, vendor, member),
    [
      isDemo,
      member.email,
      vendor.branding.logo_url,
      vendor.domains,
      vendor.handle,
      vendor.name,
    ],
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [draft, setDraft] = useState<SettingsDraft>(initialDraft);
  const [saved, setSaved] = useState<SettingsDraft>(initialDraft);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const objectLogoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
    setSaved(initialDraft);
  }, [initialDraft]);

  useEffect(
    () => () => {
      if (objectLogoUrlRef.current) {
        URL.revokeObjectURL(objectLogoUrlRef.current);
      }
    },
    [],
  );

  const updateDraft = <Key extends keyof SettingsDraft>(
    key: Key,
    value: SettingsDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = () => {
    if (!draft.storeName.trim()) {
      onToast("Enter a store name before saving.");
      return;
    }

    if (!draft.businessEmail.includes("@")) {
      onToast("Enter a valid business email before saving.");
      return;
    }

    if (!draft.storeUrl.trim()) {
      onToast("Enter a store URL before saving.");
      return;
    }

    setSaved(draft);
    onToast("Store settings saved.");
  };

  const discardSettings = () => {
    setDraft(saved);
    onToast("Unsaved changes discarded.");
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      onToast("Choose a PNG or JPG logo.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onToast("The logo must be 2 MB or smaller.");
      return;
    }

    if (objectLogoUrlRef.current) {
      URL.revokeObjectURL(objectLogoUrlRef.current);
    }

    const logoUrl = URL.createObjectURL(file);
    objectLogoUrlRef.current = logoUrl;
    updateDraft("logoUrl", logoUrl);
    onToast("Logo ready. Save changes to keep it.");
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSavePassword();
  };

  return (
    <section className="vendor-settings" aria-labelledby="vendor-settings-title">
      <header className="vendor-settings__header">
        <div>
          <h1 id="vendor-settings-title">Settings</h1>
          <p>Manage your store details, preferences and account.</p>
        </div>
        <div className="vendor-settings__header-actions">
          <button className="vendor-settings__primary-button" onClick={saveSettings} type="button">
            Save Changes
          </button>
          <button className="vendor-settings__outline-button" onClick={discardSettings} type="button">
            Discard
          </button>
        </div>
      </header>

      <nav className="vendor-settings__tabs" aria-label="Settings sections" role="tablist">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              aria-controls={`vendor-settings-${tab.id}-panel`}
              aria-selected={selected}
              className={selected ? "is-active" : ""}
              id={`vendor-settings-${tab.id}-tab`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <Icon size={22} weight="regular" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "general" ? (
        <div
          aria-labelledby="vendor-settings-general-tab"
          className="vendor-settings__general-grid"
          id="vendor-settings-general-panel"
          role="tabpanel"
        >
          <article className="vendor-settings__card vendor-settings__store-information">
            <h2>Store Information</h2>
            <p>Basic details shown to your customers.</p>

            <div className="vendor-settings__logo-row">
              <img alt="Store logo" src={draft.logoUrl} />
              <div>
                <strong>Store Logo</strong>
                <small>PNG or JPG, max 2 MB</small>
                <button onClick={() => logoInputRef.current?.click()} type="button">
                  Change Logo
                </button>
                <input
                  accept="image/png,image/jpeg"
                  className="vendor-settings__hidden-input"
                  onChange={handleLogoChange}
                  ref={logoInputRef}
                  type="file"
                />
              </div>
            </div>

            <div className="vendor-settings__form-grid">
              <label>
                <span>Store Name</span>
                <input
                  onChange={(event) => updateDraft("storeName", event.target.value)}
                  value={draft.storeName}
                />
              </label>
              <label>
                <span>Store URL</span>
                <input
                  onChange={(event) => updateDraft("storeUrl", event.target.value)}
                  value={draft.storeUrl}
                />
              </label>
              <label>
                <span>Business Email</span>
                <input
                  inputMode="email"
                  onChange={(event) => updateDraft("businessEmail", event.target.value)}
                  value={draft.businessEmail}
                />
              </label>
              <label>
                <span>Phone Number</span>
                <input
                  inputMode="tel"
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  value={draft.phone}
                />
              </label>
              <label>
                <span>Country</span>
                <select
                  onChange={(event) => updateDraft("country", event.target.value)}
                  value={draft.country}
                >
                  <option>Libya</option>
                </select>
              </label>
              <label>
                <span>City</span>
                <select
                  onChange={(event) => updateDraft("city", event.target.value)}
                  value={draft.city}
                >
                  <option>Tripoli</option>
                  <option>Benghazi</option>
                  <option>Misrata</option>
                </select>
              </label>
              <label className="vendor-settings__description-field">
                <span>Store Description</span>
                <textarea
                  onChange={(event) => updateDraft("description", event.target.value)}
                  value={draft.description}
                />
              </label>
            </div>
          </article>

          <article className="vendor-settings__card vendor-settings__store-status">
            <h2>Store Status</h2>
            <div className="vendor-settings__status-banner">
              <span className="vendor-settings__live-dot" />
              <div>
                <strong>{draft.storeLive ? "Storefront Live" : "Storefront Paused"}</strong>
                <small>
                  {draft.storeLive
                    ? "Your store is visible to customers"
                    : "Customers cannot currently access your store"}
                </small>
              </div>
              <Toggle
                checked={draft.storeLive}
                label="Storefront live"
                onChange={(next) => updateDraft("storeLive", next)}
              />
            </div>
            <div className="vendor-settings__domain-row">
              <div>
                <strong>Store Domain</strong>
                <span>{draft.storeUrl}</span>
              </div>
              <button onClick={onOpenStore} type="button">
                View Store
              </button>
            </div>
          </article>

          <article className="vendor-settings__card vendor-settings__regional-settings">
            <h2>Regional Settings</h2>
            <button onClick={() => onToast("Currency is fixed to LYD for this store.")} type="button">
              <CurrencyDollar size={26} weight="regular" />
              <span><strong>Currency</strong><small>Libyan Dinar (LYD)</small></span>
              <CaretRight size={18} />
            </button>
            <button onClick={() => onToast("English and Arabic are enabled.")} type="button">
              <Globe size={26} weight="regular" />
              <span><strong>Language</strong><small>English / العربية</small></span>
              <CaretRight size={18} />
            </button>
            <button onClick={() => onToast("Time zone is set to Africa/Tripoli.")} type="button">
              <Clock size={26} weight="regular" />
              <span><strong>Time Zone</strong><small>Africa/Tripoli · UTC+2</small></span>
              <CaretRight size={18} />
            </button>
          </article>

          <article className="vendor-settings__card vendor-settings__order-preferences">
            <h2>Order Preferences</h2>
            <PreferenceRow
              checked={draft.acceptOrders}
              description="Allow customers to place orders"
              icon={Handbag}
              onChange={(next) => updateDraft("acceptOrders", next)}
              title="Accept New Orders"
            />
            <PreferenceRow
              checked={draft.automaticConfirmation}
              description="Confirm new orders automatically"
              icon={CheckCircle}
              onChange={(next) => updateDraft("automaticConfirmation", next)}
              title="Automatic Confirmation"
            />
            <PreferenceRow
              checked={draft.lowStockAlerts}
              description="Notify me when stock is below 5"
              icon={Bell}
              onChange={(next) => updateDraft("lowStockAlerts", next)}
              title="Low Stock Alerts"
            />
          </article>

          <article className="vendor-settings__profile-completion">
            <h2>Profile Completion</h2>
            <strong>92%</strong>
            <div className="vendor-settings__progress" aria-label="Profile 92% complete">
              <span />
            </div>
            <p>Complete your tax information</p>
            <button onClick={() => onToast("Setup checklist opened.")} type="button">
              Continue Setup
            </button>
          </article>
        </div>
      ) : null}

      {activeTab === "branding" ? (
        <div
          aria-labelledby="vendor-settings-branding-tab"
          className="vendor-settings__alternate-grid"
          id="vendor-settings-branding-panel"
          role="tabpanel"
        >
          <article className="vendor-settings__card vendor-settings__alternate-card">
            <span className="vendor-settings__alternate-icon"><Palette size={27} /></span>
            <h2>Store Branding</h2>
            <p>Update the logo and presentation used across your customer storefront.</p>
            <div className="vendor-settings__branding-preview">
              <img alt="Current store logo" src={draft.logoUrl} />
              <div><strong>{draft.storeName}</strong><small>{draft.storeUrl}</small></div>
            </div>
            <button className="vendor-settings__primary-button" onClick={() => logoInputRef.current?.click()} type="button">
              <UploadSimple size={18} /> Choose Logo
            </button>
          </article>
          <article className="vendor-settings__card vendor-settings__alternate-card">
            <span className="vendor-settings__alternate-icon"><Storefront size={27} /></span>
            <h2>Storefront Preview</h2>
            <p>Review your active brand on the customer-facing store.</p>
            <button className="vendor-settings__outline-button" onClick={onOpenStore} type="button">View Store</button>
          </article>
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <div
          aria-labelledby="vendor-settings-orders-tab"
          className="vendor-settings__alternate-grid"
          id="vendor-settings-orders-panel"
          role="tabpanel"
        >
          <article className="vendor-settings__card vendor-settings__alternate-card">
            <span className="vendor-settings__alternate-icon"><Handbag size={27} /></span>
            <h2>Order Preferences</h2>
            <p>Choose how your store receives and confirms customer orders.</p>
            <PreferenceRow checked={draft.acceptOrders} description="Allow customers to place orders" icon={Handbag} onChange={(next) => updateDraft("acceptOrders", next)} title="Accept New Orders" />
            <PreferenceRow checked={draft.automaticConfirmation} description="Confirm new orders automatically" icon={CheckCircle} onChange={(next) => updateDraft("automaticConfirmation", next)} title="Automatic Confirmation" />
          </article>
          <article className="vendor-settings__card vendor-settings__alternate-card">
            <span className="vendor-settings__alternate-icon"><Truck size={27} /></span>
            <h2>Shipping</h2>
            <p>Flat-rate delivery is configured for Libya in LYD.</p>
            <button className="vendor-settings__outline-button" onClick={() => onToast("Shipping setup opened.")} type="button">Manage Shipping</button>
          </article>
        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <div
          aria-labelledby="vendor-settings-notifications-tab"
          className="vendor-settings__single-panel"
          id="vendor-settings-notifications-panel"
          role="tabpanel"
        >
          <article className="vendor-settings__card vendor-settings__alternate-card">
            <span className="vendor-settings__alternate-icon"><Bell size={27} /></span>
            <h2>Notification Preferences</h2>
            <p>Control the operational alerts sent to your merchant account.</p>
            <PreferenceRow checked={draft.lowStockAlerts} description="Notify me when stock is below 5" icon={Bell} onChange={(next) => updateDraft("lowStockAlerts", next)} title="Low Stock Alerts" />
            <PreferenceRow checked={draft.acceptOrders} description="Receive a message for every new order" icon={EnvelopeSimple} onChange={(next) => updateDraft("acceptOrders", next)} title="New Order Messages" />
          </article>
        </div>
      ) : null}

      {activeTab === "team" ? (
        <div
          aria-labelledby="vendor-settings-team-tab"
          className="vendor-settings__single-panel"
          id="vendor-settings-team-panel"
          role="tabpanel"
        >
          <article className="vendor-settings__card vendor-settings__alternate-card">
            <span className="vendor-settings__alternate-icon"><UsersThree size={27} /></span>
            <h2>Team</h2>
            <p>People with access to this vendor account.</p>
            <div className="vendor-settings__team-member">
              <span>{member.email.slice(0, 1).toUpperCase()}</span>
              <div><strong>{member.email}</strong><small>{member.role === "owner" ? "Store Owner" : "Store Manager"}</small></div>
              <em>Active</em>
            </div>
            <button className="vendor-settings__outline-button" onClick={() => onToast("Team invitations are not enabled yet.")} type="button">
              <UserPlus size={18} /> Invite Member
            </button>
          </article>
        </div>
      ) : null}

      {activeTab === "security" ? (
        <div
          aria-labelledby="vendor-settings-security-tab"
          className="vendor-settings__single-panel"
          id="vendor-settings-security-panel"
          role="tabpanel"
        >
          <form className="vendor-settings__card vendor-settings__security-form" onSubmit={submitPassword}>
            <span className="vendor-settings__alternate-icon"><LockKey size={27} /></span>
            <h2>Password & Security</h2>
            <p>Use a strong password you do not reuse on other services.</p>
            <div className="vendor-settings__security-fields">
              <label><span>Current Password</span><input autoComplete="current-password" onChange={(event) => onPasswordFormChange({ ...passwordForm, current_password: event.target.value })} type="password" value={passwordForm.current_password} /></label>
              <label><span>New Password</span><input autoComplete="new-password" onChange={(event) => onPasswordFormChange({ ...passwordForm, new_password: event.target.value })} type="password" value={passwordForm.new_password} /></label>
              <label><span>Confirm New Password</span><input autoComplete="new-password" onChange={(event) => onPasswordFormChange({ ...passwordForm, confirm_password: event.target.value })} type="password" value={passwordForm.confirm_password} /></label>
            </div>
            <button className="vendor-settings__primary-button" disabled={isSavingPassword} type="submit">
              {isSavingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
