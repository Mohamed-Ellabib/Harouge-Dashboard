import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  Bell,
  CaretDown,
  ChartBar,
  ChartLineUp,
  EnvelopeSimple,
  Gear,
  Handbag,
  Lifebuoy,
  MagnifyingGlass,
  Package,
  SignOut,
  SquaresFour,
  Storefront,
  UsersThree,
} from "@phosphor-icons/react";

import "./vendor-dashboard-home.css";
import "./vendor-portal-shell.css";
import "./vendor-dashboard-motion.css";

export type VendorPortalTab = "home" | "products" | "orders" | "profile" | "security";
export type VendorPortalVariant = "products" | "orders" | "settings";

type PortalVendor = {
  name: string;
  handle: string;
  domains: string[];
};

type PortalMember = {
  email: string;
  role: "owner" | "manager";
};

type PortalNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

type VendorPortalShellProps = {
  activeTab: VendorPortalTab;
  children: ReactNode;
  isDemo: boolean;
  member: PortalMember;
  notice?: PortalNotice | null;
  onLogout: () => Promise<void>;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: VendorPortalTab) => void;
  onToast: (message: string) => void;
  searchPlaceholder: string;
  searchValue: string;
  variant: VendorPortalVariant;
  vendor: PortalVendor;
};

type PanelName = "messages" | "notifications" | "account" | null;

const normalizeStoreUrl = (domain: string | undefined) => {
  if (!domain) return null;
  if (/^https?:\/\//i.test(domain)) return domain;
  if (domain.startsWith("localhost") || domain.startsWith("127.0.0.1")) {
    return `http://${domain}`;
  }
  return `https://${domain}`;
};

function PortalBrand() {
  return (
    <div className="vendor-home__brand" aria-label="LabibTech">
      <span className="vendor-home__brand-mark" aria-hidden="true">
        <img src="/assets/dashboard-reference/labibtech-l-mark.png" alt="" />
      </span>
      <span className="vendor-home__brand-name">LabibTech</span>
    </div>
  );
}

export function VendorPortalShell({
  activeTab,
  children,
  isDemo,
  member,
  notice,
  onLogout,
  onSearchChange,
  onTabChange,
  onToast,
  searchPlaceholder,
  searchValue,
  variant,
  vendor,
}: VendorPortalShellProps) {
  const referenceQaMode =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";
  const [panel, setPanel] = useState<PanelName>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsActive = activeTab === "profile" || activeTab === "security";
  const storeName = isDemo ? "Al Sanousi Store" : vendor.name;
  const roleLabel = member.role === "owner" ? "Vendor Account" : "Store Manager";
  const orderBadge = isDemo ? "12+" : "";

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const openStore = () => {
    const url = isDemo
      ? "http://127.0.0.1:5176/sport"
      : normalizeStoreUrl(vendor.domains[0]);
    if (!url) {
      onToast("Connect a storefront domain in Settings first.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchValue.trim()) {
      searchRef.current?.focus();
    }
  };

  return (
    <main
      className={`vendor-home vendor-portal vendor-dashboard-enter vendor-portal--${variant} ${referenceQaMode ? "vendor-home--reference-viewport" : ""}`}
      dir="ltr"
      onClick={() => setPanel(null)}
    >
      <div className="vendor-home__app">
        <aside className="vendor-home__sidebar">
          <PortalBrand />

          <nav className="vendor-home__nav" aria-label="Vendor dashboard navigation">
            <span className="vendor-home__nav-label">MENU</span>
            <button className={activeTab === "home" ? "is-active" : ""} onClick={() => onTabChange("home")} type="button"><SquaresFour size={21} /><span>Dashboard</span></button>
            <button className={activeTab === "orders" ? "is-active" : ""} onClick={() => onTabChange("orders")} type="button"><Handbag size={21} /><span>Orders</span>{orderBadge ? <small>{orderBadge}</small> : null}</button>
            <button className={activeTab === "products" ? "is-active" : ""} onClick={() => onTabChange("products")} type="button"><Package size={21} /><span>Products</span></button>
            <button onClick={() => { onTabChange("products"); onToast("Inventory filters are ready in Products."); }} type="button"><ChartBar size={21} /><span>Inventory</span></button>
            <button onClick={() => onTabChange("home")} type="button"><ChartLineUp size={21} /><span>Analytics</span></button>
            <button onClick={() => onToast("Customer profiles appear as orders arrive.")} type="button"><UsersThree size={21} /><span>Customers</span></button>

            <span className="vendor-home__nav-label vendor-home__nav-label--general">GENERAL</span>
            <button className={settingsActive ? "is-active" : ""} onClick={() => onTabChange("profile")} type="button"><Gear size={21} /><span>Settings</span></button>
            <button onClick={() => window.location.assign("mailto:support@labibtech.com")} type="button"><Lifebuoy size={21} /><span>Help</span></button>
            <button onClick={() => void onLogout()} type="button"><SignOut size={21} /><span>Logout</span></button>
          </nav>

          <section className="vendor-home__live-card">
            <Storefront size={20} weight="fill" />
            <h2>Your Store is Live</h2>
            <p>Customers can shop now</p>
            <button onClick={openStore} type="button">View Store</button>
          </section>
        </aside>

        <section className="vendor-home__workspace">
          <header className="vendor-home__topbar">
            <form className="vendor-home__search" onSubmit={submitSearch}>
              <MagnifyingGlass size={22} />
              <input
                aria-label={searchPlaceholder}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                ref={searchRef}
                value={searchValue}
              />
              <kbd>⌘ F</kbd>
            </form>

            <div className="vendor-home__top-actions">
              <div className="vendor-home__popover-anchor">
                <button aria-label="Messages" className="vendor-home__round-button" onClick={(event) => { event.stopPropagation(); setPanel(panel === "messages" ? null : "messages"); }} type="button"><EnvelopeSimple size={21} /></button>
                {panel === "messages" ? <div className="vendor-home__popover" onClick={(event) => event.stopPropagation()}><strong>Messages</strong><p>You are all caught up.</p></div> : null}
              </div>
              <div className="vendor-home__popover-anchor">
                <button aria-label="Notifications" className="vendor-home__round-button" onClick={(event) => { event.stopPropagation(); setPanel(panel === "notifications" ? null : "notifications"); }} type="button"><Bell size={21} /></button>
                {panel === "notifications" ? <div className="vendor-home__popover" onClick={(event) => event.stopPropagation()}><strong>Notifications</strong><p>{isDemo ? "12 orders need your attention." : "Your latest store updates are here."}</p></div> : null}
              </div>
              <div className="vendor-home__account-wrap">
                <button className="vendor-home__account" onClick={(event) => { event.stopPropagation(); setPanel(panel === "account" ? null : "account"); }} type="button">
                  <img src="/assets/dashboard-reference/merchant-avatar.png" alt="" />
                  <span><strong>{storeName}</strong><small>{roleLabel}</small></span>
                  <CaretDown size={15} />
                </button>
                {panel === "account" ? (
                  <div className="vendor-home__popover vendor-home__account-menu" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => onTabChange("profile")} type="button"><Gear size={17} />Store settings</button>
                    <button onClick={() => void onLogout()} type="button"><SignOut size={17} />Sign out</button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <section className="vendor-portal__page">
            {children}
          </section>
        </section>
      </div>

      {notice ? <div className={`vendor-portal__notice is-${notice.tone}`} role="status">{notice.text}</div> : null}
    </main>
  );
}
