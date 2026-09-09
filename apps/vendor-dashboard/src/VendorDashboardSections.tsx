import { useRef, useState } from "react";

import { VendorOrdersPanel, type PortalOrder } from "./VendorOrdersPanel";
import { VendorPortalShell, type VendorPortalTab, type VendorPortalVariant } from "./VendorPortalShell";
import { VendorProductsPanel, type PortalProduct } from "./VendorProductsPanel";
import { VendorSettingsPanel, type VendorSettingsPasswordForm } from "./VendorSettingsPanel";

type SectionVendor = {
  name: string;
  handle: string;
  domains: string[];
  branding: { logo_url: string | null; primary_color: string | null };
};

type SectionMember = {
  email: string;
  role: "owner" | "manager";
};

type SectionNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

type VendorDashboardSectionsProps = {
  activeTab: Exclude<VendorPortalTab, "home">;
  isDemo: boolean;
  isSavingPassword: boolean;
  member: SectionMember;
  notice: SectionNotice | null;
  onLogout: () => Promise<void>;
  onPasswordFormChange: (form: VendorSettingsPasswordForm) => void;
  onSavePassword: () => Promise<void>;
  onSelectProduct: (product: PortalProduct) => void;
  onStartCreateProduct: () => void;
  onTabChange: (tab: VendorPortalTab) => void;
  orders: PortalOrder[];
  passwordForm: VendorSettingsPasswordForm;
  products: PortalProduct[];
  vendor: SectionVendor;
};

const normalizeStoreUrl = (domain: string | undefined) => {
  if (!domain) return null;
  if (/^https?:\/\//i.test(domain)) return domain;
  if (domain.startsWith("localhost") || domain.startsWith("127.0.0.1")) return `http://${domain}`;
  return `https://${domain}`;
};

export function VendorDashboardSections(props: VendorDashboardSectionsProps) {
  const [topSearch, setTopSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const variant: VendorPortalVariant = props.activeTab === "orders" ? "orders" : props.activeTab === "products" ? "products" : "settings";
  const placeholder = variant === "orders" ? "Search orders or customers" : variant === "products" ? "Search products or SKU" : "Search settings";

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  const openStore = () => {
    const url = props.isDemo ? "http://127.0.0.1:5176/sport" : normalizeStoreUrl(props.vendor.domains[0]);
    if (!url) {
      showToast("Connect a storefront domain first.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const visibleNotice = toast
    ? { tone: "success" as const, text: toast }
    : props.notice;

  return (
    <VendorPortalShell
      activeTab={props.activeTab}
      isDemo={props.isDemo}
      member={props.member}
      notice={visibleNotice}
      onLogout={props.onLogout}
      onSearchChange={setTopSearch}
      onTabChange={props.onTabChange}
      onToast={showToast}
      searchPlaceholder={placeholder}
      searchValue={topSearch}
      variant={variant}
      vendor={props.vendor}
    >
      {variant === "products" ? (
        <VendorProductsPanel
          isDemo={props.isDemo}
          onSelectProduct={props.onSelectProduct}
          onStartCreateProduct={props.onStartCreateProduct}
          onToast={showToast}
          products={props.products}
          topSearch={topSearch}
        />
      ) : null}
      {variant === "orders" ? (
        <VendorOrdersPanel
          isDemo={props.isDemo}
          onToast={showToast}
          orders={props.orders}
          topSearch={topSearch}
        />
      ) : null}
      {variant === "settings" ? (
        <VendorSettingsPanel
          isDemo={props.isDemo}
          isSavingPassword={props.isSavingPassword}
          member={props.member}
          onOpenStore={openStore}
          onPasswordFormChange={props.onPasswordFormChange}
          onSavePassword={props.onSavePassword}
          onToast={showToast}
          passwordForm={props.passwordForm}
          vendor={props.vendor}
        />
      ) : null}
    </VendorPortalShell>
  );
}
