import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  company,
  documentPath,
  email,
  getDocuments,
  homeContent,
  oppositeLocalePath,
  phoneDisplay,
  type LegalSlug,
  type Locale,
  whatsappLink,
} from './content';

function homePath(locale: Locale) {
  return locale === 'kk' ? '/kk' : '/';
}

export function LanguageSwitcher({
  locale,
  slug,
}: {
  locale: Locale;
  slug?: LegalSlug;
}) {
  const content = homeContent[locale];

  return (
    <Link
      href={oppositeLocalePath(locale, slug)}
      className="inline-flex h-10 items-center rounded-full border border-[#DDE5DD] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:border-[#16A34A] hover:text-[#15803D] sm:px-4"
    >
      {content.langLabel} / {content.langOther}
    </Link>
  );
}

export function PublicHeader({
  locale,
  slug,
}: {
  locale: Locale;
  slug?: LegalSlug;
}) {
  const content = homeContent[locale];
  const base = homePath(locale);

  const links = [
    { href: `${base}#how`, label: content.nav.how },
    { href: `${base}#delivery`, label: content.nav.delivery },
    { href: `${base}#payment`, label: content.nav.payment },
    { href: `${base}#restaurants`, label: content.nav.restaurants },
    { href: documentPath(locale, 'contacts'), label: content.nav.contacts },
    { href: documentPath(locale, 'offer'), label: content.nav.docs },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href={base} className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/jetkiz-logo.png"
            alt="JETKIZ"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-2xl bg-white object-contain shadow-sm"
            priority
          />
          <span className="hidden text-xl font-bold tracking-normal text-[#101510] min-[390px]:inline">
            JETKIZ
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-[#4B5563] xl:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[#16A34A]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher locale={locale} slug={slug} />
          <details className="group xl:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#DDE5DD] bg-white text-[#111827] transition hover:border-[#16A34A] [&::-webkit-details-marker]:hidden">
              <Menu size={19} />
              <span className="sr-only">Menu</span>
            </summary>
            <div className="fixed left-4 right-4 top-[70px] z-50 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
              <nav className="grid gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#ECFDF3] hover:text-[#15803D]"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-[#16A34A] px-4 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                >
                  {content.partnerCta}
                </a>
              </nav>
            </div>
          </details>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="hidden h-10 items-center rounded-full bg-[#16A34A] px-4 text-sm font-semibold text-white transition hover:bg-[#15803D] sm:inline-flex"
          >
            {content.partnerCta}
          </a>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ locale }: { locale: Locale }) {
  const content = homeContent[locale];
  const docs = getDocuments(locale);

  return (
    <footer className="w-full border-t border-[#E5E7EB] bg-[#F8FAF7] px-4 py-10 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/brand/jetkiz-logo.png"
              alt="JETKIZ"
              width={52}
              height={52}
              className="h-13 w-13 rounded-2xl bg-white object-contain shadow-sm"
            />
            <div>
              <p className="text-xl font-bold">JETKIZ</p>
              <p className="text-sm font-medium text-[#6B7280]">{content.heroBadge}</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-[#4B5563]">
            {content.footerText}
          </p>
          <p className="mt-4 text-sm text-[#6B7280]">© 2026 JETKIZ. {content.copyright}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
            {content.nav.docs}
          </h3>
          <nav className="mt-4 grid gap-2 sm:grid-cols-2">
            {docs.map((doc) => (
              <Link
                key={doc.slug}
                href={documentPath(locale, doc.slug)}
                className="text-sm font-medium leading-6 text-[#4B5563] transition hover:text-[#16A34A]"
              >
                {doc.title}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
            {content.nav.contacts}
          </h3>
          <div className="mt-4 space-y-2 text-sm font-medium leading-6 text-[#4B5563]">
            <p>{locale === 'kk' ? company.kkName : company.ruName}</p>
            <p>{locale === 'kk' ? 'БСН' : 'БИН'}: {company.bin}</p>
            <p>Телефон / WhatsApp: {phoneDisplay}</p>
            <a href={`mailto:${email}`} className="block transition hover:text-[#16A34A]">
              {email}
            </a>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/" className="rounded-full border border-[#DDE5DD] bg-white px-4 py-2 text-sm font-semibold">
              RU
            </Link>
            <Link href="/kk" className="rounded-full border border-[#DDE5DD] bg-white px-4 py-2 text-sm font-semibold">
              KZ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  children,
  surface = 'white',
  dark,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  surface?: 'white' | 'soft' | 'green';
  dark?: boolean;
}) {
  const shell =
    dark
      ? 'bg-[#ECFDF3] text-[#101510]'
      : surface === 'green'
      ? 'bg-[#ECFDF3] text-[#101510]'
      : surface === 'soft'
        ? 'bg-[#F8FAF7] text-[#101510]'
        : 'bg-white text-[#101510]';

  return (
    <section id={id} className={`w-full px-4 py-14 sm:px-6 lg:px-8 lg:py-20 ${shell}`}>
      <div className="mx-auto w-full max-w-7xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-normal text-[#101510] sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export function DetailGrid({ locale }: { locale: Locale }) {
  const rows = [
    [locale === 'kk' ? 'Компания' : 'Компания', locale === 'kk' ? company.kkName : company.ruName],
    [locale === 'kk' ? 'БСН' : 'БИН', company.bin],
    [locale === 'kk' ? 'Мекенжайы' : 'Адрес', locale === 'kk' ? company.kkAddress : company.ruAddress],
    ['Телефон / WhatsApp', phoneDisplay],
    ['Email', email],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:last:col-span-2"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            {label}
          </p>
          <p className="mt-2 text-base font-semibold leading-7 text-[#111827]">{value}</p>
        </div>
      ))}
    </div>
  );
}
