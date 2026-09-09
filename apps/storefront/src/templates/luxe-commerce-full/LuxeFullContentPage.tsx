import { useEffect } from "react";

import { HeartIcon, PackageIcon, ShieldCheckIcon } from "../../components/Icons";
import { localizedStorefrontText } from "../../lib/localization";
import { StorefrontLink } from "../../lib/navigation";
import type { StoreContentRoute } from "../../pages/StoreContentPage";
import type { ConfiguredStorefrontProfileDto, StorefrontLocalizedTextDto } from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/AboutPage.css";
import "./reference-source/src/pages/storefront/LegalPage.css";

const localized = (value: StorefrontLocalizedTextDto, profile: ConfiguredStorefrontProfileDto) => localizedStorefrontText(value, profile.locale);

export function LuxeFullContentPage({
  profile,
  route,
}: {
  profile: ConfiguredStorefrontProfileDto;
  route: StoreContentRoute;
}) {
  const { content } = profile.storefront;

  const routeTitle = route === "about"
    ? localized(content.about.title, profile)
    : route === "contact"
      ? localized(content.contact.heading, profile)
      : route === "delivery-returns"
        ? localized(content.policies.delivery.title, profile)
        : route === "privacy"
          ? localized(content.policies.privacy.title, profile)
          : localized(content.policies.terms.title, profile);

  useEffect(() => { document.title = `${routeTitle} | ${profile.name}`; }, [profile.name, routeTitle]);

  if (route === "about") {
    const aboutBody = localized(content.about.body, profile);
    const historyYear = routeTitle.match(/\d{4}/)?.[0] ?? "1970";
    return (
      <article className="about-page">
        <section className="about-page__hero" aria-labelledby="about-page-title">
          <div className="customer-home__lane about-page__hero-inner">
            <div className="about-page__hero-copy">
              <img src={profile.branding.logo_url ?? "/customer-assets/store-header-logo.png"} alt="" />
              <p>{routeTitle}</p>
              <h1 id="about-page-title" className="about-page__hero-statement">أصالة في الاختيار، وتجربة تبني الثقة.</h1>
            </div>
            <a className="about-page__scroll-cue" href="#our-story"><span>قصتنا</span><span aria-hidden="true">←</span></a>
          </div>
        </section>
        <section className="about-page__story" id="our-story" aria-labelledby="our-story-title">
          <div className="customer-home__lane about-page__story-grid">
            <div className="about-page__year" aria-hidden="true"><span>{historyYear.slice(0, 2)}</span><span>{historyYear.slice(2)}</span></div>
            <div className="about-page__story-copy"><h2 id="our-story-title">اسم بدأ بالشغف، واستمر بالثقة</h2><p>{aboutBody}</p><p>كل منتج نقدمه هو امتداد لاسم المتجر ولمعيار واضح في الأصالة والجودة وخدمة العميل.</p></div>
          </div>
        </section>
        <section className="about-page__milestones" aria-label="محطات من تجربتنا"><div className="customer-home__lane about-page__milestones-inner"><article><strong>100%</strong><span>منتجات مختارة</span></article><i aria-hidden="true" /><article><strong>LY</strong><span>خدمة محلية</span></article><i aria-hidden="true" /><article><strong>24/7</strong><span>تجربة رقمية</span></article></div></section>
        <section className="about-page__today" aria-labelledby="about-today-title"><div className="customer-home__lane about-page__today-inner"><div className="about-page__today-copy"><span>اليوم</span><h2 id="about-today-title">هوية نعتز بها، وتجربة تتجدد</h2><p>{aboutBody}</p></div></div></section>
        <section className="about-page__mission" aria-labelledby="about-mission-title"><div className="customer-home__lane about-page__mission-grid"><div className="about-page__mission-heading"><span>رسالتنا</span><h2 id="about-mission-title">أن نجعل الاختيار الأصيل أقرب إلى عملائنا</h2></div><p>نبني تجربة شراء واضحة وموثوقة، من لحظة اكتشاف المنتج وحتى استلامه وخدمة ما بعد البيع.</p></div></section>
        <section className="about-page__values" aria-labelledby="about-values-title"><div className="customer-home__lane"><div className="about-page__section-heading"><span>ما يحكم كل اختيار</span><h2 id="about-values-title">قيم لا تتغير</h2></div><div className="about-page__values-grid"><article><span className="about-page__value-number">01</span><ShieldCheckIcon /><h3>الأصالة</h3><p>وضوح في المصدر والمواصفات والاختيار.</p></article><article><span className="about-page__value-number">02</span><PackageIcon /><h3>الجودة</h3><p>منتجات وتجربة تليق بثقة العميل.</p></article><article><span className="about-page__value-number">03</span><HeartIcon /><h3>العناية</h3><p>خدمة إنسانية في كل خطوة من الرحلة.</p></article></div></div></section>
        <section className="about-page__closing" aria-labelledby="about-closing-title"><div className="customer-home__lane about-page__closing-inner"><div><h2 id="about-closing-title">خبرة محلية، بمعايير عالية</h2><p>{localized(content.contact.body, profile)}</p><StorefrontLink to="/watches">استكشف مجموعاتنا <span aria-hidden="true">←</span></StorefrontLink></div></div></section>
        <LuxeFullBottomNavigation profile={profile} />
      </article>
    );
  }

  const policySections = route === "delivery-returns"
    ? [content.policies.delivery, content.policies.returns]
    : route === "privacy"
      ? [content.policies.privacy]
      : route === "terms"
        ? [content.policies.terms]
        : [];
  const intro = route === "contact" ? localized(content.contact.body, profile) : "نوضح هنا المعلومات التي تنظم تجربة التسوق واستخدام خدمات المتجر.";

  return (
    <article className="legal-page">
      <section className="legal-page__hero"><div className="shell legal-page__hero-inner"><span>{profile.name}</span><h1>{routeTitle}</h1><p>{intro}</p></div></section>
      <div className="shell legal-page__document">
        {route === "contact" ? <section><h2>تواصل معنا</h2><p>{localized(content.contact.body, profile)}</p>{profile.contact.public_phone ? <p><strong>الهاتف:</strong> <a dir="ltr" href={`tel:${profile.contact.public_phone}`}>{profile.contact.public_phone}</a></p> : null}{profile.contact.public_email ? <p><strong>البريد:</strong> <a href={`mailto:${profile.contact.public_email}`}>{profile.contact.public_email}</a></p> : null}{profile.contact.whatsapp_number ? <p><strong>واتساب:</strong> <a dir="ltr" href={`https://wa.me/${profile.contact.whatsapp_number.replace(/\D/g, "")}`}>{profile.contact.whatsapp_number}</a></p> : null}<p className="legal-page__notice">تستخدم بيانات التواصل المنشورة من إعدادات هذا المتجر.</p></section> : policySections.map((section, index) => <section key={index}><h2>{localized(section.title, profile)}</h2><p>{localized(section.body, profile)}</p>{index === 0 ? <p className="legal-page__notice">تنطبق هذه السياسة على الطلبات المنشأة من هذا المتجر.</p> : null}</section>)}
      </div>
      <LuxeFullBottomNavigation profile={profile} />
    </article>
  );
}
