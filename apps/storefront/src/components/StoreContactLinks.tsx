import { storefrontUiText } from "../lib/localization";
import type { StorefrontProfileDto } from "../types";

type StoreContactLinksProps = {
  profile: StorefrontProfileDto;
  className?: string;
};

const telephoneHref = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.replace(/[^+\d]/gu, "");
  return /^\+?\d{5,20}$/u.test(normalized) ? `tel:${normalized}` : null;
};

const whatsappHref = (value: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/gu, "");
  return /^\d{5,20}$/u.test(digits) ? `https://wa.me/${digits}` : null;
};

const emailHref = (value: string): string =>
  `mailto:${value.replace(/[%?#]/gu, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )}`;

export const StoreContactLinks = ({
  className,
  profile,
}: StoreContactLinksProps) => {
  const { public_email: email, public_phone: phone, whatsapp_number: whatsapp } =
    profile.contact;
  const phoneHref = telephoneHref(phone);
  const waHref = whatsappHref(whatsapp);

  if (!email && !phoneHref && !waHref) return null;

  return (
    <address
      className={className}
      aria-label={storefrontUiText(profile.locale, {
        ar: "بيانات التواصل مع المتجر",
        en: "Store contact details",
      })}
    >
      {email ? (
        <a href={emailHref(email)} dir="ltr">
          <span>{storefrontUiText(profile.locale, { ar: "البريد", en: "Email" })}</span>
          {email}
        </a>
      ) : null}
      {phone && phoneHref ? (
        <a href={phoneHref} dir="ltr">
          <span>{storefrontUiText(profile.locale, { ar: "الهاتف", en: "Phone" })}</span>
          {phone}
        </a>
      ) : null}
      {whatsapp && waHref ? (
        <a href={waHref} target="_blank" rel="noopener noreferrer" dir="ltr">
          <span>{storefrontUiText(profile.locale, { ar: "واتساب", en: "WhatsApp" })}</span>
          {whatsapp}
        </a>
      ) : null}
    </address>
  );
};
