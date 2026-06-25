import {
  Bike,
  Coffee,
  CookingPot,
  Croissant,
  GlassWater,
  HandCoins,
  MapPin,
  Pizza,
  Salad,
  Store,
  Utensils,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  documentPath,
  homeContent,
  type Locale,
  whatsappLink,
} from './content';
import { PublicFooter, PublicHeader, Section } from './public-shell';

const categoryIcons = [Coffee, Pizza, Utensils, CookingPot, Croissant, GlassWater];
const stepIcons = [Utensils, Salad, MapPin, HandCoins];

export function RedesignedPublicHomePage({ locale }: { locale: Locale }) {
  const content = homeContent[locale];

  return (
    <main id="top" className="min-h-screen w-full overflow-x-hidden bg-white text-[#101510]">
      <PublicHeader locale={locale} />

      <section className="w-full bg-[linear-gradient(180deg,#F8FAF7_0%,#FFFFFF_74%)] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-[#BBF7D0] bg-white px-4 py-2 text-sm font-semibold text-[#15803D]">
              {content.heroBadge}
            </p>
            <h1 className="mt-6 max-w-full break-words text-[34px] font-bold leading-[1.06] tracking-normal text-[#101510] sm:max-w-4xl sm:text-5xl lg:text-6xl">
              {content.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-[#4B5563]">
              {content.heroText}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#16A34A] px-4 text-center text-sm font-semibold leading-5 text-white transition hover:bg-[#15803D] sm:w-auto sm:px-6 sm:text-base"
              >
                {content.heroPrimary}
              </a>
              <Link
                href={documentPath(locale, 'delivery')}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#DDE5DD] bg-white px-4 text-center text-sm font-semibold leading-5 text-[#111827] transition hover:border-[#16A34A] hover:text-[#15803D] sm:w-auto sm:px-6 sm:text-base"
              >
                {content.heroSecondary}
              </Link>
            </div>

            <div className="mt-9 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                locale === 'kk' ? 'Тапсырыс' : 'Заказ',
                locale === 'kk' ? 'Жеткізу' : 'Доставка',
                locale === 'kk' ? 'Алып кету' : 'Самовывоз',
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-sm font-semibold text-[#16A34A]">JETKIZ</p>
                  <p className="mt-1 text-base font-semibold text-[#111827]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[380px] min-w-0 overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:min-h-[520px] sm:rounded-[32px] sm:p-4">
            <div className="relative h-full min-h-[356px] overflow-hidden rounded-[22px] bg-[#EEFDF3] sm:min-h-[492px] sm:rounded-[26px]">
              <Image
                src="/brand/jetkiz-burabay-hero.png"
                alt="JETKIZ"
                fill
                className="object-cover"
                priority
                sizes="(min-width: 1024px) 44vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F2417]/55 via-transparent to-transparent" />
              <div className="absolute left-4 right-4 top-4 grid gap-3 sm:left-5 sm:right-5 sm:top-5 sm:grid-cols-2">
                <HeroChip
                  icon={<Utensils size={22} />}
                  tone="green"
                  label={locale === 'kk' ? 'Санаттар' : 'Категории'}
                  value={locale === 'kk' ? 'Жақында' : 'Скоро'}
                />
                <HeroChip
                  icon={<Bike size={22} />}
                  tone="orange"
                  label={locale === 'kk' ? 'Аймақ' : 'Зона'}
                  value={locale === 'kk' ? 'Бурабай ауданы' : 'Бурабайский район'}
                />
              </div>
              <div className="absolute bottom-4 left-4 right-4 rounded-3xl bg-white p-4 shadow-xl sm:bottom-5 sm:left-5 sm:right-5 sm:p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#16A34A]">
                  JETKIZ
                </p>
                <p className="mt-2 text-xl font-semibold leading-tight text-[#111827] sm:text-2xl">
                  {locale === 'kk'
                    ? 'Серіктес мейрамханаларды қосуға дайындық жүріп жатыр'
                    : 'Готовим подключение ресторанов-партнёров'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section id="restaurants-coming" eyebrow="JETKIZ" title={content.futureTitle}>
        <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-[#4B5563]">
          {content.futureText}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.futureCards.map((card, index) => {
            const Icon = categoryIcons[index] ?? Salad;
            return (
              <article
                key={card}
                className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#BBF7D0]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#16A34A]">
                  <Icon size={26} />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-[#111827]">{card}</h3>
                <p className="mt-3 text-base font-medium leading-7 text-[#6B7280]">
                  {locale === 'kk'
                    ? 'Санат іске қосылуға дайындалып жатыр.'
                    : 'Категория готовится к запуску.'}
                </p>
              </article>
            );
          })}
        </div>
      </Section>

      <Section id="how" eyebrow={content.nav.how} title={content.howTitle} surface="soft">
        <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-[#4B5563]">
          {content.howText}
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {content.howSteps.map((step, index) => {
            const Icon = stepIcons[index] ?? Store;
            return (
              <article
                key={step}
                className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A]">
                    <Icon size={23} />
                  </div>
                  <span className="text-sm font-semibold text-[#9CA3AF]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold leading-7 text-[#111827]">{step}</h3>
              </article>
            );
          })}
        </div>
      </Section>

      <Section id="services" eyebrow={locale === 'kk' ? 'Баға' : 'Цены'} title={content.servicesTitle}>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {content.services.map((item) => (
            <article
              key={item}
              className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
            >
              <p className="text-base font-semibold leading-7 text-[#111827]">{item}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="delivery" eyebrow={content.nav.delivery} title={content.deliveryTitle} surface="soft">
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {content.deliveryItems.map((item) => (
            <article key={item} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
              <MapPin className="text-[#16A34A]" size={24} />
              <p className="mt-4 text-base font-semibold leading-7 text-[#111827]">{item}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="payment" eyebrow={content.nav.payment} title={content.paymentTitle} surface="green">
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {content.paymentItems.map((item) => (
            <article key={item} className="rounded-[28px] border border-[#BBF7D0] bg-white p-6">
              <HandCoins className="text-[#16A34A]" size={25} />
              <p className="mt-4 text-base font-semibold leading-7 text-[#111827]">{item}</p>
            </article>
          ))}
        </div>
      </Section>

      <section id="restaurants" className="w-full bg-white px-4 py-14 text-[#101510] sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-[#F8FAF7] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <Image
              src="/brand/restaurant-partner-handoff.png"
              alt="JETKIZ"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#16A34A]">
              {content.nav.restaurants}
            </p>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-[#101510] sm:text-4xl lg:text-5xl">
              {content.restaurantTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-[#4B5563]">
              {content.restaurantText}
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {(locale === 'kk'
                ? ['Тапсырыстарды қабылдау', 'Жеткізуді ұйымдастыру', 'Клиенттермен жұмыс', 'Серіктестерді қолдау']
                : ['Приём заказов', 'Организация доставки', 'Работа с клиентами', 'Поддержка партнёров']
              ).map((item) => (
                <div key={item} className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAF7] p-4 text-base font-semibold text-[#111827]">
                  {item}
                </div>
              ))}
            </div>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#16A34A] px-6 text-base font-semibold text-white transition hover:bg-[#15803D]"
            >
              {content.heroPrimary}
            </a>
          </div>
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}

function HeroChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'green' | 'orange';
}) {
  return (
    <div className="rounded-3xl bg-white/94 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <div
          className={
            tone === 'green'
              ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A]'
              : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFEDD5] text-[#F97316]'
          }
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#6B7280]">{label}</p>
          <p className="font-semibold text-[#111827]">{value}</p>
        </div>
      </div>
    </div>
  );
}
