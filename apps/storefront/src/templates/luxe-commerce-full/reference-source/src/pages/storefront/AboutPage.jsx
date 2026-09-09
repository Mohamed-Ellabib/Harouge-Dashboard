import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Glasses,
  Handshake,
  Heart,
  History,
  Home,
  PenLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
} from 'lucide-react';
import StorefrontFooter from '@/components/storefront/StorefrontFooter.jsx';
import StorefrontSearchPanel from '@/components/storefront/StorefrontSearchPanel.jsx';
import { CART_CHANGE_EVENT, getCartItemCount } from '@/lib/storefrontCart.js';
import './WatchesPage.css';
import './AboutPage.css';

const values = [
  {
    icon: ShieldCheck,
    title: 'الأصالة',
    description: 'كل قطعة نعرضها مضمونة المصدر، لأن الثقة تبدأ من المنتج الأصلي.',
  },
  {
    icon: Handshake,
    title: 'الثقة',
    description: 'علاقات ممتدة مع عملائنا، بُنيت بالوضوح والالتزام على مدى خمسة عقود.',
  },
  {
    icon: Sparkles,
    title: 'التميّز',
    description: 'اختيار دقيق لعلامات عالمية وقطع تحمل قيمة تتجاوز اللحظة.',
  },
  {
    icon: History,
    title: 'الاستمرارية',
    description: 'إرث عائلي يتجدد مع كل جيل، ويحافظ على الوعد ذاته منذ عام 1970.',
  },
];

export default function AboutPage() {
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'من نحن | السنوسي وأبنائه';

    const syncCartCount = () => setCartCount(getCartItemCount());
    window.addEventListener(CART_CHANGE_EVENT, syncCartCount);

    return () => {
      document.title = previousTitle;
      window.removeEventListener(CART_CHANGE_EVENT, syncCartCount);
    };
  }, []);

  return (
    <main className="about-page" dir="rtl">
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
            <Link className="is-active" to="/about">من نحن</Link>
            <a href="#contact">تواصل معنا</a>
          </nav>

          <div className="customer-header__actions" aria-label="أدوات المتجر">
            <button type="button" aria-label="بحث" onClick={() => setIsSearchOpen(true)}>
              <Search aria-hidden="true" />
            </button>
            <Link className="customer-header__wishlist" to="/favorites" aria-label="المفضلة">
              <Heart aria-hidden="true" />
            </Link>
            <Link className="customer-header__cart" to="/cart" aria-label="السلة">
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="about-page__hero" aria-labelledby="about-page-title">
        <div className="customer-home__lane about-page__hero-inner">
          <div className="about-page__hero-copy">
            <img src="/customer-assets/store-header-logo.png" alt="" />
            <p>منذ عام 1970</p>
            <h1 id="about-page-title" className="about-page__hero-statement">
              خمسة عقود من الأصالة، صنعت اسماً تثق به ليبيا.
            </h1>
          </div>
          <a className="about-page__scroll-cue" href="#our-story" aria-label="انتقل إلى قصتنا">
            <span>قصتنا</span>
            <ArrowLeft aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="about-page__story" id="our-story" aria-labelledby="our-story-title">
        <div className="customer-home__lane about-page__story-grid">
          <div className="about-page__year" aria-hidden="true">
            <span>19</span>
            <span>70</span>
          </div>
          <div className="about-page__story-copy">
            <h2 id="our-story-title">اسمٌ بدأ بالوقت، واستمر بالثقة</h2>
            <p>
              منذ عام 1970، تحرص شركة السنوسي وأبنائه للساعات على تقديم أرقى الساعات الفاخرة
              والأصلية لعملائها في جميع مدن ليبيا. وعلى مدار أكثر من خمسة عقود، ترسّخ اسمنا كأحد
              أعرق الأسماء في سوق التجزئة الليبي، قائماً على الثقة والأصالة والالتزام بالجودة.
            </p>
            <p>
              لم تكن الساعة بالنسبة إلينا مجرد قطعة تُقتنى، بل قيمة ترافق صاحبها وتروي شيئاً عنه.
              لذلك ظل اختيارنا لكل علامة وكل قطعة امتداداً لاسم نحافظ عليه جيلاً بعد جيل.
            </p>
          </div>
        </div>
      </section>

      <section className="about-page__milestones" aria-label="محطات من تاريخنا">
        <div className="customer-home__lane about-page__milestones-inner">
          <article>
            <strong>1970</strong>
            <span>بداية الحكاية</span>
          </article>
          <i aria-hidden="true" />
          <article>
            <strong>50+</strong>
            <span>عاماً من الخبرة</span>
          </article>
          <i aria-hidden="true" />
          <article>
            <strong>12</strong>
            <span>صالة عرض في ليبيا</span>
          </article>
        </div>
      </section>

      <section className="about-page__today" aria-labelledby="about-today-title">
        <div className="customer-home__lane about-page__today-inner">
          <div className="about-page__today-copy">
            <span>اليوم</span>
            <h2 id="about-today-title">تاريخ نعتز به، وتجربة تتجدد</h2>
            <p>
              نفتخر بإدارة 12 صالة عرض في مواقع مميزة، تجمع بين أرقى العلامات التجارية العالمية
              وخدمة عملاء تليق بتاريخنا الطويل. لقد بنينا قاعدة عملاء مخلصين على مدى أكثر من خمسين
              عاماً، ونعتز بكوننا الوجهة الموثوقة لكل من يبحث عن ساعة أصلية تحمل قيمة حقيقية.
            </p>
          </div>
        </div>
      </section>

      <section className="about-page__mission" aria-labelledby="about-mission-title">
        <div className="customer-home__lane about-page__mission-grid">
          <div className="about-page__mission-heading">
            <span>رسالتنا</span>
            <h2 id="about-mission-title">أن نكون الجسر الموثوق بين العالم وليبيا</h2>
          </div>
          <p>
            نقرّب إلى عملائنا أفضل ماركات الساعات في العالم، بمنتجات أصلية 100% وتجربة شراء تليق
            بثقتهم؛ من لحظة الاختيار وحتى ما بعد الاقتناء.
          </p>
        </div>
      </section>

      <section className="about-page__values" aria-labelledby="about-values-title">
        <div className="customer-home__lane">
          <div className="about-page__section-heading">
            <span>ما يحكم كل اختيار</span>
            <h2 id="about-values-title">قيم لا تتغير مع الزمن</h2>
          </div>
          <div className="about-page__values-grid">
            {values.map(({ icon: Icon, title, description }, index) => (
              <article key={title}>
                <span className="about-page__value-number">0{index + 1}</span>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__closing" aria-labelledby="about-closing-title">
        <div className="customer-home__lane about-page__closing-inner">
          <div>
            <h2 id="about-closing-title">خبرة محلية، بمعايير عالمية</h2>
            <p>
              خبرتنا العميقة في السوق المحلية وشغفنا الدائم بالتميّز يجعلاننا شريكاً موثوقاً
              للعلامات الفاخرة، ووجهة قريبة لكل عميل يبحث عن الأصالة.
            </p>
            <Link to="/watches">
              استكشف مجموعاتنا
              <ArrowLeft aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <StorefrontFooter />

      <nav className="customer-bottom-nav" aria-label="التنقل السفلي">
        <Link to="/store"><Home aria-hidden="true" /><span>الرئيسية</span></Link>
        <Link to="/sunglasses"><Glasses aria-hidden="true" /><span>النظارات</span></Link>
        <Link to="/watches"><Clock aria-hidden="true" /><span>الساعات</span></Link>
        <Link to="/pens"><PenLine aria-hidden="true" /><span>الأقلام</span></Link>
        <Link to="/account"><User aria-hidden="true" /><span>الحساب</span></Link>
      </nav>

      <StorefrontSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </main>
  );
}
