import { useEffect, useState } from 'react';
import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  createTelephoneHref,
  fetchStorefrontContact,
  normalizeStorefrontContact,
  readCachedStorefrontContact,
  STOREFRONT_CONTACT_EVENT,
} from '@/lib/storefrontContact.js';

export default function StorefrontFooter() {
  const [contact, setContact] = useState(() => readCachedStorefrontContact());

  useEffect(() => {
    let controller = new AbortController();

    const refreshContact = async () => {
      controller.abort();
      const requestController = new AbortController();
      controller = requestController;

      try {
        const nextContact = await fetchStorefrontContact({ signal: requestController.signal });
        if (!requestController.signal.aborted) setContact(nextContact);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Failed to refresh storefront contact settings; using cached defaults', error);
        }
      }
    };

    const handleContactChange = (event) => {
      setContact(normalizeStorefrontContact(event.detail));
    };

    refreshContact();
    window.addEventListener('focus', refreshContact);
    window.addEventListener(STOREFRONT_CONTACT_EVENT, handleContactChange);

    return () => {
      controller.abort();
      window.removeEventListener('focus', refreshContact);
      window.removeEventListener(STOREFRONT_CONTACT_EVENT, handleContactChange);
    };
  }, []);

  return (
    <footer className="customer-footer" id="contact">
      <div className="customer-home__lane customer-footer__grid">
        <section className="customer-footer__brand" aria-label="عن السنوسي وأبنائه">
          <Link className="customer-footer__brand-home" to="/store" aria-label="السنوسي وأبنائه - الرئيسية">
            <img
              className="customer-footer__brand-logo"
              src="/customer-assets/store-header-logo.png"
              alt="السنوسي وأبنائه 1970"
              loading="lazy"
              decoding="async"
            />
          </Link>
          <Link className="customer-footer__about-link" to="/about">
            تعرف على قصتنا
            <span aria-hidden="true">←</span>
          </Link>
          <p>وجهة ليبية موثوقة للساعات والنظارات الأصلية، وخبرة عائلية تمتد منذ عام 1970.</p>
          <div>
            <a href="https://www.facebook.com/share/19B2X1a1aV/?mibextid=wwXIfr" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
            <a href="https://www.instagram.com/sanusisonsly?igsh=MTZtbWdtb3o2bGlucA==" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram aria-hidden="true" /></a>
            <a href="https://www.tiktok.com/@alsanusi1970?_r=1&_t=ZS-986W12OrPWC" target="_blank" rel="noreferrer" aria-label="TikTok">♪</a>
          </div>
        </section>

        <section className="customer-footer__nav" aria-label="روابط سريعة">
          <h2>روابط سريعة</h2>
          <Link to="/store">الرئيسية</Link>
          <Link to="/watches">الساعات</Link>
          <Link to="/sunglasses">النظارات</Link>
          <Link to="/pens">الأقلام</Link>
          <a href="#contact">تواصل معنا</a>
        </section>

        <section className="customer-footer__nav" aria-label="معلومات">
          <h2>معلومات</h2>
          <Link to="/about">من نحن</Link>
          <Link to="/privacy">سياسة الخصوصية</Link>
          <Link to="/terms">الشروط والأحكام</Link>
          <Link to="/returns">سياسة الاسترجاع</Link>
          <Link to="/account-deletion">حذف الحساب</Link>
        </section>

        <section className="customer-footer__contact" aria-label="تواصل معنا">
          <h2>تواصل معنا</h2>
          <a href={createTelephoneHref(contact.phone)} dir="ltr"><Phone aria-hidden="true" />{contact.phone}</a>
          <a href={`mailto:${contact.email}`} dir="ltr"><Mail aria-hidden="true" />{contact.email}</a>
          <span><MapPin aria-hidden="true" />طرابلس - ليبيا</span>
        </section>
      </div>
      <div className="customer-home__lane customer-footer__bottom">
        <p>جميع الحقوق محفوظة © {new Date().getFullYear()} السنوسي وأبنائه</p>
        <nav className="customer-footer__legal" aria-label="الروابط القانونية">
          <Link to="/privacy">الخصوصية</Link>
          <Link to="/terms">الشروط</Link>
          <Link to="/returns">الاسترجاع</Link>
          <Link to="/account-deletion">حذف الحساب</Link>
        </nav>
      </div>
    </footer>
  );
}
