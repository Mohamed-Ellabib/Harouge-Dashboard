import React from 'react';
import { Glasses, Clock, ShoppingBag, Eye, User, Wrench, Menu, Search, Heart, MapPin, Mail, Phone, Instagram, Home, PenLine } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const CustomerPlaceholderPage = ({ title, icon: Icon }) => {
  const location = useLocation();

  return (
    <main className="customer-home" dir="rtl">
      <header className="customer-header" aria-label="التنقل الرئيسي">
        <div className="customer-home__lane customer-header__inner">
          <button className="customer-header__hamburger" type="button" aria-label="القائمة">
            <Menu aria-hidden="true" />
          </button>

          <a className="customer-header__brand" href="/" aria-label="السنوسي وأبنائه">
            <strong>السنوسي وأبنائه</strong>
            <span>SINCE 1959</span>
          </a>

          <nav className="customer-header__nav" aria-label="روابط المتجر">
            <a href="/">الرئيسية</a>
            <a href="/watches">الساعات</a>
            <a className={location.pathname === '/sunglasses' ? 'is-active' : ''} href="/sunglasses">النظارات</a>
            <a className={location.pathname === '/pens' ? 'is-active' : ''} href="/pens">الأقلام</a>
            <a href="#about">عن نحن</a>
            <a href="#contact">تواصل معنا</a>
          </nav>

          <div className="customer-header__actions" aria-label="أدوات المتجر">
            <button type="button" aria-label="بحث"><Search aria-hidden="true" /></button>
            <a className="customer-header__wishlist" href="/favorites" aria-label="المفضلة"><Heart aria-hidden="true" /></a>
            <a className="customer-header__cart" href="/cart" aria-label="السلة">
              <ShoppingBag aria-hidden="true" />
              <span>0</span>
            </a>
            {location.pathname === '/account' ? (
               <button className="customer-header__cart" type="button" aria-label="الحساب" style={{ color: 'var(--color-primary)' }}>
                 <User aria-hidden="true" />
               </button>
            ) : (
               <a href="/account" aria-label="الحساب" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', color: 'var(--color-text-muteder)' }}>
                 <User aria-hidden="true" />
               </a>
            )}
          </div>
        </div>
      </header>

      <section style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '80px 20px',
          textAlign: 'center',
          minHeight: '60vh'
      }}>
        <div style={{ 
            backgroundColor: '#0a0a0b', 
            border: '1px solid rgba(201, 150, 82, 0.45)',
            padding: '60px', 
            borderRadius: '16px', 
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
        }}>
            <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(201, 150, 82, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c99655'
            }}>
                {Icon ? <Icon size={40} /> : <Wrench size={40} />}
            </div>
            
            <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f8f8f8', marginBottom: '12px' }}>{title}</h1>
                <p style={{ fontSize: '1.1rem', color: '#b8b1aa', fontWeight: '600' }}>
                    هذه الصفحة قيد التطوير حالياً وسيتم إطلاقها قريباً.
                </p>
            </div>

            <a 
                href="/" 
                className="customer-button customer-button--primary" 
                style={{ marginTop: '20px' }}
            >
                العودة للرئيسية
            </a>
        </div>
      </section>

      <footer className="customer-footer" id="contact">
        <div className="customer-home__lane customer-footer__grid">
          <section className="customer-footer__brand" aria-label="عن السنوسي وأبنائه">
            <strong>السنوسي وأبنائه</strong>
            <span>SINCE 1959</span>
            <p>نحن موزع رسمي لأكبر الساعات<br />والنظارات العالمية في ليبيا منذ 1959.</p>
            <div>
              <a href="https://facebook.com" aria-label="Facebook">f</a>
              <a href="https://instagram.com/sanusi.ly" aria-label="Instagram"><Instagram aria-hidden="true" /></a>
              <a href="https://tiktok.com" aria-label="TikTok">♪</a>
            </div>
          </section>

          <section className="customer-footer__nav" aria-label="روابط سريعة">
            <h2>روابط سريعة</h2>
            <a href="/">الرئيسية</a>
            <a href="/watches">الساعات</a>
            <a href="/sunglasses">النظارات</a>
            <a href="/pens">الأقلام</a>
            <a href="#contact">تواصل معنا</a>
          </section>

          <section className="customer-footer__nav" aria-label="معلومات">
            <h2>معلومات</h2>
            <a href="#about">عن نحن</a>
            <a href="#privacy">سياسة الخصوصية</a>
            <a href="#terms">الشروط والأحكام</a>
            <a href="#returns">سياسة الاسترجاع</a>
          </section>

          <section className="customer-footer__contact" aria-label="تواصل معنا">
            <h2>تواصل معنا</h2>
            <a href="tel:+218213333622"><Phone aria-hidden="true" />+218 21 333 3622</a>
            <a href="mailto:info@sanusi.ly"><Mail aria-hidden="true" />info@sanusi.ly</a>
            <span><MapPin aria-hidden="true" />طرابلس - ليبيا</span>
          </section>
        </div>
        <div className="customer-home__lane customer-footer__bottom">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} السنوسي وأبنائه</p>
        </div>
      </footer>

      {/* Mobile-only: fixed bottom navigation bar */}
      <nav className="customer-bottom-nav" aria-label="التنقل السفلي">
        <a href="/"><Home aria-hidden="true" /><span>الرئيسية</span></a>
        <a className={location.pathname === '/sunglasses' ? 'is-active' : ''} href="/sunglasses"><Glasses aria-hidden="true" /><span>النظارات</span></a>
        <a href="/watches"><Clock aria-hidden="true" /><span>الساعات</span></a>
        <a className={location.pathname === '/pens' ? 'is-active' : ''} href="/pens"><PenLine aria-hidden="true" /><span>الأقلام</span></a>
        <a className={location.pathname === '/account' ? 'is-active' : ''} href="/account"><User aria-hidden="true" /><span>الحساب</span></a>
      </nav>
    </main>
  );
};

export default CustomerPlaceholderPage;
