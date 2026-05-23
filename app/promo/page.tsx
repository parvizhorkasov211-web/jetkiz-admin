import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  Leaf,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "JETKIZ для ресторанов",
  description:
    "JETKIZ — доставка еды для ресторанов: курьеры, низкие тарифы, продвижение и поддержка в Щучинске и Бурабае.",
};

const phoneDisplay = "+7 708 681 06 93";
const phoneHref = "tel:+77086810693";
const whatsappHref = "https://wa.me/77086810693";

const navItems = [
  { label: "Преимущества", href: "#benefits" },
  { label: "Тарифы", href: "#plans" },
  { label: "Подключение", href: "#steps" },
  { label: "Контакты", href: "#contacts" },
];

const benefits = [
  {
    title: "Низкие тарифы",
    text: "Понятные условия без лишней нагрузки на ресторан. Финальные условия обсуждаются индивидуально.",
    icon: WalletCards,
  },
  {
    title: "Курьеры от JETKIZ",
    text: "Доставка закрывается нашей стороной, а ресторан спокойно фокусируется на еде и скорости кухни.",
    icon: Truck,
  },
  {
    title: "Продвижение ресторанов",
    text: "Помогаем получать больше заказов через акции, баннеры, уведомления и рекомендации внутри сервиса.",
    icon: Sparkles,
  },
  {
    title: "Простые правила",
    text: "Без сложной бюрократии. Подключение, меню, заказы и выплаты — всё понятно и прозрачно.",
    icon: ShieldCheck,
  },
  {
    title: "Поддержка на старте",
    text: "Поможем добавить ресторан, подготовить меню и настроить работу так, чтобы быстро запуститься.",
    icon: Headphones,
  },
  {
    title: "Работа в городе",
    text: "JETKIZ строится под локальный рынок Щучинска и Бурабая, а не под абстрактную большую сеть.",
    icon: MapPin,
  },
];

const plans = [
  {
    name: "Старт",
    label: "Для нового ресторана",
    text: "Быстрый выход в доставку, помощь с карточкой ресторана и базовой настройкой меню.",
  },
  {
    name: "Рост",
    label: "Для активных заведений",
    text: "Больше заказов, продвижение, уведомления, акции и стабильная работа с курьерами.",
  },
  {
    name: "Партнёр",
    label: "Для сетей и филиалов",
    text: "Индивидуальные условия для ресторанов с несколькими точками и большим объёмом заказов.",
  },
];

const steps = [
  {
    title: "Оставьте заявку",
    text: "Позвоните или напишите на номер JETKIZ. Мы уточним данные ресторана и условия подключения.",
  },
  {
    title: "Подготовим запуск",
    text: "Поможем оформить ресторан, меню, фотографии, график работы и базовые правила доставки.",
  },
  {
    title: "Начните получать заказы",
    text: "Ресторан появляется в JETKIZ, клиенты делают заказы, а доставка работает через наших курьеров.",
  },
];

function SoftCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[32px] border border-emerald-950/10 bg-white/80",
        "shadow-[0_24px_80px_rgba(6,78,59,0.10)] backdrop-blur-xl",
        "transition duration-500 hover:-translate-y-1 hover:border-emerald-500/25",
        "hover:shadow-[0_32px_110px_rgba(6,95,70,0.16)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
      <Leaf className="h-4 w-4" />
      {children}
    </div>
  );
}

export default function PromoPage() {
  return (
    <main className="relative isolate min-h-screen w-screen max-w-none overflow-x-hidden bg-[#f7fff8] text-emerald-950">
      <style>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-emerald-950/10 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition group-hover:scale-105">
              J
            </span>
            <span className="text-lg font-black tracking-[0.22em] text-emerald-950">
              JETKIZ
            </span>
          </a>

          <div className="hidden items-center gap-1 rounded-full border border-emerald-950/10 bg-white/70 p-1 shadow-sm lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-bold text-emerald-950/70 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-xs font-bold text-emerald-950/55 transition hover:bg-emerald-50 hover:text-emerald-800 sm:px-4 sm:text-sm"
            >
              Вход
            </Link>
            <a
              href="#contacts"
              className="hidden rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl sm:inline-flex"
            >
              Подключиться
            </a>
          </div>
        </div>
      </nav>

      <section id="top" className="relative min-h-screen pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.20),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(132,204,22,0.16),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f1faf3_55%,#f7fbf6_100%)]" />
        <div className="absolute left-1/2 top-28 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-24">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-emerald-700/15 bg-white/75 px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm backdrop-blur">
              <CheckCircle2 className="h-4 w-4" />
              Доставка еды для ресторанов Щучинска и Бурабая
            </div>

            <h1 className="max-w-4xl text-6xl font-black leading-[0.95] tracking-[-0.06em] text-emerald-950 sm:text-7xl lg:text-8xl">
              Доставка, которая помогает ресторану расти.
            </h1>

            <p className="mt-8 max-w-2xl text-xl leading-9 text-emerald-950/65 sm:text-2xl sm:leading-10">
              JETKIZ подключает рестораны к доставке без сложных условий:
              курьеры от нас, низкие тарифы, помощь в продвижении и нормальная
              поддержка.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contacts"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-emerald-600 px-7 text-base font-black text-white shadow-2xl shadow-emerald-700/25 transition hover:-translate-y-1 hover:bg-emerald-700"
              >
                Подключить ресторан
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#benefits"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-emerald-950/10 bg-white/70 px-7 text-base font-black text-emerald-950 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white"
              >
                Смотреть условия
                <ArrowDown className="h-5 w-5" />
              </a>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["Низкие", "тарифы"],
                ["Наши", "курьеры"],
                ["Быстрый", "старт"],
              ].map(([value, label]) => (
                <div
                  key={`${value}-${label}`}
                  className="rounded-3xl border border-emerald-950/10 bg-white/65 p-4 text-center shadow-sm backdrop-blur"
                >
                  <p className="text-xl font-black text-emerald-800">
                    {value}
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-950/50">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[48px] bg-emerald-400/20 blur-3xl" />

            <SoftCard className="overflow-hidden p-4">
              <div className="rounded-[28px] bg-emerald-950 p-6 text-white">
                <div className="flex items-start justify-between border-b border-white/10 pb-6">
                  <div>
                    <p className="text-sm font-bold text-emerald-200/70">
                      Панель партнёра
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                      Новые заказы
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-emerald-950">
                    JETKIZ
                  </div>
                </div>

                <div className="grid gap-3 py-6">
                  {[
                    ["Бургер сет", "Курьер назначен", "12 мин"],
                    ["Пицца Маргарита", "Готовится", "18 мин"],
                    ["Роллы темпура", "В пути", "7 мин"],
                  ].map(([title, status, time]) => (
                    <div
                      key={title}
                      className="group flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.10]"
                    >
                      <div>
                        <p className="font-black">{title}</p>
                        <p className="mt-1 text-sm font-semibold text-white/45">
                          {status}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-400/15 px-3 py-2 text-sm font-black text-emerald-200">
                        {time}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["24/7", "заявки"],
                    ["3", "шага"],
                    ["1", "город"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-3xl bg-white p-4 text-center text-emerald-950"
                    >
                      <p className="text-3xl font-black tracking-[-0.04em]">
                        {value}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-950/45">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </SoftCard>
          </div>
        </div>
      </section>

      <section id="benefits" className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <SectionLabel>Что получает ресторан</SectionLabel>
            <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.05em] text-emerald-950 sm:text-6xl">
              Не просто приложение. Партнёрство для роста.
            </h2>
            <p className="mt-6 text-xl leading-9 text-emerald-950/60">
              Мы закрываем сложные части доставки: курьеров, запуск,
              продвижение и поддержку. Ресторан занимается главным — едой.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <SoftCard key={benefit.title} className="p-7">
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-700/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black tracking-[-0.03em]">
                    {benefit.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-emerald-950/60">
                    {benefit.text}
                  </p>
                </SoftCard>
              );
            })}
          </div>
        </div>
      </section>

      <section id="plans" className="relative bg-emerald-950 px-5 py-20 text-white sm:px-8 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.28),transparent_32%),radial-gradient(circle_at_90%_40%,rgba(132,204,22,0.16),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-emerald-100">
                <BadgeCheck className="h-4 w-4" />
                Тарифы
              </div>
              <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">
                Гибкие условия без лишней нагрузки.
              </h2>
            </div>
            <p className="max-w-2xl text-xl leading-9 text-white/65">
              Мы предлагаем низкие тарифы, прозрачные выплаты и помощь на
              старте. Конкретные условия обсуждаются индивидуально с каждым
              рестораном.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={[
                  "rounded-[32px] border border-white/10 bg-white/[0.07] p-7 backdrop-blur-xl",
                  "transition duration-500 hover:-translate-y-1 hover:border-emerald-300/35 hover:bg-white/[0.10]",
                  index === 1 ? "shadow-[0_30px_90px_rgba(16,185,129,0.18)]" : "",
                ].join(" ")}
              >
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200/80">
                  {plan.label}
                </p>
                <h3 className="mt-4 text-4xl font-black tracking-[-0.05em]">
                  {plan.name}
                </h3>
                <p className="mt-6 min-h-28 text-base leading-8 text-white/62">
                  {plan.text}
                </p>
                <a
                  href="#contacts"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Обсудить условия
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="steps" className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionLabel>Как подключиться</SectionLabel>
            <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">
              Запуск без лишней сложности.
            </h2>
            <p className="mt-6 text-xl leading-9 text-emerald-950/60">
              Один разговор — и мы объясним условия, подготовим ресторан и
              поможем выйти в доставку.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => (
              <SoftCard key={step.title} className="p-6">
                <div className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.03em]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-base leading-8 text-emerald-950/60">
                      {step.text}
                    </p>
                  </div>
                </div>
              </SoftCard>
            ))}
          </div>
        </div>
      </section>

      <section id="contacts" className="px-5 pb-10 pt-16 sm:px-8 lg:pb-14">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[44px] bg-emerald-600 p-8 text-white shadow-[0_36px_120px_rgba(5,150,105,0.35)] sm:p-12 lg:p-16">
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-lime-300/20 blur-3xl" />

            <div className="relative grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-100">
                  Контакты
                </p>
                <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.06em] sm:text-6xl">
                  Подключить ресторан к JETKIZ.
                </h2>
                <p className="mt-6 max-w-2xl text-xl leading-9 text-white/75">
                  Позвоните или напишите на номер JETKIZ. Мы расскажем условия,
                  добавим ресторан и поможем подготовить меню к запуску.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={phoneHref}
                    className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-white px-7 text-base font-black text-emerald-700 transition hover:-translate-y-1 hover:bg-emerald-50"
                  >
                    <Phone className="h-5 w-5" />
                    Позвонить
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-white/25 bg-white/10 px-7 text-base font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                  >
                    Написать WhatsApp
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/20 bg-white/12 p-7 backdrop-blur-xl">
                <div className="grid gap-5">
                  <div className="flex items-start gap-4 rounded-3xl bg-white/12 p-5">
                    <Phone className="mt-1 h-6 w-6 shrink-0 text-emerald-100" />
                    <div>
                      <p className="text-sm font-bold text-white/55">Номер</p>
                      <a
                        href={phoneHref}
                        className="mt-1 block text-2xl font-black tracking-[-0.03em] text-white"
                      >
                        {phoneDisplay}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-3xl bg-white/12 p-5">
                    <Building2 className="mt-1 h-6 w-6 shrink-0 text-emerald-100" />
                    <div>
                      <p className="text-sm font-bold text-white/55">Город</p>
                      <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">
                        Щучинск / Бурабай
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-3xl bg-white/12 p-5">
                    <Clock3 className="mt-1 h-6 w-6 shrink-0 text-emerald-100" />
                    <div>
                      <p className="text-sm font-bold text-white/55">Запуск</p>
                      <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">
                        После согласования условий
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-col gap-4 px-2 py-8 text-sm font-semibold text-emerald-950/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© JETKIZ. Доставка еды для ресторанов.</p>
            <Link
              href="/login"
              className="w-fit rounded-full px-4 py-2 transition hover:bg-emerald-50 hover:text-emerald-800"
            >
              Вход в кабинет
            </Link>
          </footer>
        </div>
      </section>
    </main>
  );
}