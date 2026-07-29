import type { StorefrontProfileDto } from "../types";
import { BrandMark } from "./BrandMark";
import { StorefrontLink } from "../lib/navigation";

type StoreFooterProps = {
  profile: StorefrontProfileDto;
};

export const StoreFooter = ({ profile }: StoreFooterProps) => (
  <footer className="store-footer">
    <div className="shell store-footer__inner">
      <div className="store-footer__brand">
        <BrandMark />
        <div>
          <strong>{profile.name}</strong>
          {profile.domain ? <span dir="ltr">{profile.domain}</span> : null}
        </div>
      </div>

      <nav aria-label="روابط المتجر">
        <StorefrontLink to="/">الرئيسية</StorefrontLink>
        <StorefrontLink to="/products">المنتجات</StorefrontLink>
      </nav>

      <p>© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
    </div>
  </footer>
);
