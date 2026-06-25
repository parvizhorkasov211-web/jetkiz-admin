import Link from 'next/link';
import {
  company,
  documentPath,
  email,
  getDocuments,
  getLegalDocument,
  homeContent,
  phoneDisplay,
  type LegalSlug,
  type Locale,
} from './content';
import { DetailGrid, PublicFooter, PublicHeader } from './public-shell';

export function LegalPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: Exclude<LegalSlug, 'contacts'>;
}) {
  const document = getLegalDocument(locale, slug);
  const docs = getDocuments(locale);
  const content = homeContent[locale];

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#F8FAF7] text-[#101510]">
      <PublicHeader locale={locale} slug={slug} />
      <section className="w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <Link
            href={locale === 'kk' ? '/kk' : '/'}
            className="text-sm font-semibold text-[#16A34A] transition hover:text-[#15803D]"
          >
            {locale === 'kk' ? 'Басты бетке оралу' : 'На главную'}
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[310px_1fr] lg:items-start">
            <aside className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
                {content.nav.docs}
              </p>
              <nav className="mt-4 grid gap-2">
                {docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={documentPath(locale, doc.slug)}
                    className={
                      doc.slug === slug
                        ? 'rounded-2xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white'
                        : 'rounded-2xl px-4 py-3 text-sm font-medium text-[#4B5563] transition hover:bg-[#ECFDF3] hover:text-[#15803D]'
                    }
                  >
                    {doc.title}
                  </Link>
                ))}
              </nav>
            </aside>

            <article className="rounded-[32px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)] sm:p-8 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
                JETKIZ
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
                {document.meta.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[#4B5563]">
                {document.meta.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-[#6B7280]">
                {locale === 'kk' ? company.kkDate : company.ruDate}
              </p>

              <div className="mt-10 space-y-9">
                {document.sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-2xl font-bold leading-tight text-[#111827]">
                      {section.title}
                    </h2>
                    <div className="mt-4 max-w-4xl space-y-4 text-base font-medium leading-8 text-[#374151] sm:text-lg">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-12 border-t border-[#E5E7EB] pt-8">
                <h2 className="text-2xl font-bold text-[#111827]">
                  {locale === 'kk' ? 'Деректемелер' : 'Реквизиты'}
                </h2>
                <div className="mt-5">
                  <DetailGrid locale={locale} />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}

export function ContactsPage({ locale }: { locale: Locale }) {
  const content = homeContent[locale];
  const rows =
    locale === 'kk'
      ? [
          ['Компания', company.kkName],
          ['БСН', company.bin],
          ['Мекенжайы', company.kkAddress],
          ['Телефон / WhatsApp', phoneDisplay],
          ['Email', email],
          ['Өтініштерді қарау уақыты', 'күн сайын 09:00–21:00'],
          ['Ресми өтініштер', 'email пайдаланылады'],
          ['WhatsApp', 'жедел байланысқа арналған қосымша арна'],
        ]
      : [
          ['Компания', company.ruName],
          ['БИН', company.bin],
          ['Адрес', company.ruAddress],
          ['Телефон / WhatsApp', phoneDisplay],
          ['Email', email],
          ['Режим обработки обращений', 'ежедневно с 09:00 до 21:00'],
          ['Официальные обращения', 'использовать email'],
          ['WhatsApp', 'дополнительный канал оперативной связи'],
        ];

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#F8FAF7] text-[#101510]">
      <PublicHeader locale={locale} slug="contacts" />
      <section className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
            {content.nav.contacts}
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
            {locale === 'kk' ? 'JETKIZ байланыстары' : 'Контакты JETKIZ'}
          </h1>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  {label}
                </p>
                <p className="mt-2 text-base font-semibold leading-7 text-[#111827]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#16A34A] px-6 text-base font-semibold text-white transition hover:bg-[#15803D]"
            >
              {email}
            </a>
            <a
              href={`https://wa.me/77086810693`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DDE5DD] bg-white px-6 text-base font-semibold transition hover:border-[#16A34A] hover:text-[#15803D]"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
