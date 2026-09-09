import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Glasses,
  Heart,
  Home,
  PenLine,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';
import StorefrontFooter from '@/components/storefront/StorefrontFooter.jsx';
import StorefrontSearchPanel from '@/components/storefront/StorefrontSearchPanel.jsx';
import { CART_CHANGE_EVENT, getCartItemCount } from '@/lib/storefrontCart.js';
import '@/pages/storefront/WatchesPage.css';
import '@/pages/storefront/LegalPage.css';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

export default function LegalPageLayout({ title, eyebrow, summary, lastUpdated, children }) {
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | السنوسي وأبنائه`;

    const syncCartCount = () => setCartCount(getCartItemCount());
    window.addEventListener(CART_CHANGE_EVENT, syncCartCount);

    return () => {
      document.title = previousTitle;
      window.removeEventListener(CART_CHANGE_EVENT, syncCartCount);
    };
  }, [title]);

  return (
    <main className="legal-page" dir="rtl">
      <header className="customer-header" aria-label="التنقل الرئيسي">
        <div className="customer-home__lane customer-header__inner">
          <Link className="customer-header__hamburger" to="/favorites" aria-label="المفضلة">
            <Heart aria-hidden="true" />
          </Link>

          <Link className="customer-header__brand" to="/store" aria-label="السنوسي وأبنائه">
            <img
              className="customer-header__brand-logo"
              src="/customer-assets/store-header-logo.png"
              alt="السنوسي وأبنائه 1970"
            />
          </Link>

          <nav className="customer-header__nav" aria-label="روابط المتجر">
            <Link to="/store">الرئيسية</Link>
            <Link to="/watches">الساعات</Link>
            <Link to="/sunglasses">النظارات</Link>
            <Link to="/pens">الأقلام</Link>
            <Link to="/about">من نحن</Link>
            <a href="#contact">تواصل معنا</a>
          </nav>

          <div className="customer-header__actions" aria-label="أدوات المتجر">
            <button type="button" aria-label="بحث" onClick={() => setIsSearchOpen(true)}>
              <Search aria-hidden="true" />
            </button>
            <Link className="customer-header__wishlist" to="/favorites" aria-label="المفضلة">
              <Heart aria-hidden="true" />
            </Link>
            <Link className="customer-header__cart" to="/cart" aria-label={`السلة، ${cartCount} منتجات`}>
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="legal-page__hero" aria-labelledby="legal-page-title">
        <div className="customer-home__lane legal-page__hero-inner">
          <span>{eyebrow}</span>
          <h1 id="legal-page-title">{title}</h1>
          <p>{summary}</p>
          <time dateTime="2026-07-16">آخر تحديث: {lastUpdated}</time>
        </div>
      </section>

      <article className="customer-home__lane legal-page__document">
        {children}
      </article>

      <StorefrontFooter />

      <nav className="customer-bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map(({ label, href, icon: Icon }) => (
          <Link to={href} key={href}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <StorefrontSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </main>
  );
}
