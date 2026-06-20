'use client';

import { useState, type ReactNode } from 'react';

type Locale = 'ru' | 'kk';

const PHONE_DISPLAY = '+7 708 681 06 93';
const PHONE_RAW = '77086810693';

const WHATSAPP_LINK = `https://wa.me/${PHONE_RAW}?text=Здравствуйте!%20Хочу%20подключить%20ресторан%20к%20JETKIZ`;

const company = {
  name: 'ТОО “JETKIZ DIGITAL SYSTEMS”',
  bin: '260540025332',
  address:
    'Республика Казахстан, Акмолинская область, Бурабайский район, г. Щучинск, ул. Интернациональная, дом 49',
  phone: PHONE_DISPLAY,
  domain: 'jetkiz.asia',
  payment: 'PayLink.kz',
};

const content = {
  ru: {
    navHow: 'Как работает',
    navRestaurants: 'Рестораны',
    navDelivery: 'Доставка',
    navLegal: 'Правила',
    badge: 'JETKIZ · доставка еды по городу',
    titleLines: ['Еда из лучших', 'заведений — быстро', 'к вашей двери'],
    description:
      'Выбирайте ресторан, добавляйте любимые блюда и оформляйте заказ за пару минут. JETKIZ доставит еду домой, в офис или туда, где вы сейчас.',
    cta: 'Заказать еду',
    note: 'Доставка или самовывоз',
    bottom: 'Лучшие заведения города · Удобный заказ · Доставка до двери',
    statOne: 'оформить заказ',
    statTwo: 'удобно с телефона',
    statThree: 'локальный сервис',
  },
  kk: {
    navHow: 'Қалай жұмыс істейді',
    navRestaurants: 'Мейрамханалар',
    navDelivery: 'Жеткізу',
    navLegal: 'Ережелер',
    badge: 'JETKIZ · қала ішінде тағам жеткізу',
    titleLines: ['Үздік орындардан', 'тағам — есігіңізге', 'жылдам жеткіземіз'],
    description:
      'Мейрамхананы таңдаңыз, сүйікті тағамдарыңызды қосыңыз және тапсырысты бірнеше минутта рәсімдеңіз. JETKIZ тағамды үйге, кеңсеге немесе тұрған жеріңізге жеткізеді.',
    cta: 'Тапсырыс беру',
    note: 'Жеткізу немесе алып кету',
    bottom: 'Үздік орындар · Ыңғайлы тапсырыс · Есікке дейін жеткізу',
    statOne: 'тапсырыс рәсімдеу',
    statTwo: 'телефоннан ыңғайлы',
    statThree: 'жергілікті сервис',
  },
};

const appFlowContent = {
  ru: {
    eyebrow: 'Как работает JETKIZ',
    title: 'Путь заказа в приложении',
    description:
      'Скачайте приложение, выберите ресторан, добавьте любимые блюда в корзину, выберите способ получения и ожидайте свой заказ.',
    bottom:
      'Без звонков · Понятная сумма · Доставка или самовывоз · Статус заказа в приложении',
    benefitTitle: 'Всё оформление заказа — в одном приложении',
    benefitLabel: 'Преимущество для клиента',
    stepLabel: '4 простых шага',
    steps: [
      {
        number: '01',
        title: 'Выберите ресторан',
        text: 'Выберите ресторан из списка на главном экране или в разделе “Рестораны”. Смотрите заведения города, акции, блюда и выбирайте то, что хочется заказать сейчас.',
        image: '/brand/client-home.png',
      },
      {
        number: '02',
        title: 'Добавьте блюда в корзину',
        text: 'Откройте ресторан, добавьте любимые блюда в корзину, измените количество и заранее проверьте итоговую сумму заказа.',
        image: '/brand/client-cart.png',
      },
      {
        number: '03',
        title: 'Выберите способ получения',
        text: 'На экране оформления выберите доставку до двери или самовывоз из ресторана. Проверьте адрес, способ оплаты и подтвердите заказ.',
        image: '/brand/client-checkout.png',
      },
      {
        number: '04',
        title: 'Ожидайте свой заказ',
        text: 'После оформления ресторан получит заказ и начнёт приготовление. Вам останется дождаться подтверждения и следить за статусом в приложении.',
        image: '/brand/client-order-success.png',
      },
    ],
  },
  kk: {
    eyebrow: 'JETKIZ қалай жұмыс істейді',
    title: 'Қосымшадағы тапсырыс жолы',
    description:
      'Қосымшаны жүктеп алыңыз, мейрамхананы таңдаңыз, сүйікті тағамдарды себетке қосыңыз, алу тәсілін таңдаңыз және тапсырысыңызды күтіңіз.',
    bottom:
      'Қоңыраусыз · Түсінікті сома · Жеткізу немесе алып кету · Тапсырыс мәртебесі қосымшада',
    benefitTitle: 'Тапсырыстың бәрі — бір қосымшада',
    benefitLabel: 'Клиентке пайдасы',
    stepLabel: '4 қарапайым қадам',
    steps: [
      {
        number: '01',
        title: 'Мейрамхананы таңдаңыз',
        text: 'Басты экрандағы немесе “Мейрамханалар” бөліміндегі тізімнен қаладағы орындарды көріп, бүгін тапсырыс бергіңіз келетін мейрамхананы таңдаңыз.',
        image: '/brand/client-home.png',
      },
      {
        number: '02',
        title: 'Тағамдарды себетке қосыңыз',
        text: 'Ұнаған тағамдарды себетке қосыңыз, санын өзгертіңіз және тапсырыстың жалпы сомасын алдын ала тексеріңіз.',
        image: '/brand/client-cart.png',
      },
      {
        number: '03',
        title: 'Алу тәсілін таңдаңыз',
        text: 'Рәсімдеу экранында есікке дейін жеткізуді немесе мейрамханадан алып кетуді таңдаңыз. Мекенжайды, төлем тәсілін тексеріп, тапсырысты растаңыз.',
        image: '/brand/client-checkout.png',
      },
      {
        number: '04',
        title: 'Тапсырысыңызды күтіңіз',
        text: 'Тапсырыс рәсімделгеннен кейін мейрамхана оны қабылдап, дайындауды бастайды. Сіз мәртебесін қосымшада бақылап отырасыз.',
        image: '/brand/client-order-success.png',
      },
    ],
  },
};

const partnerContent = {
  ru: {
    eyebrow: 'JETKIZ для ресторанов',
    title: 'Готовьте блюда — доставку и логистику мы возьмём на себя',
    description:
      'Подключайтесь к JETKIZ и принимайте заказы онлайн. Вы готовите и передаёте заказ курьеру — дальше мы берём на себя доставку, сопровождение заказа и удобное взаимодействие с клиентом.',
    strong:
      'Ваши заказы под защитой, а выплаты поступают на следующий рабочий день.',
    note: 'В выходные дни выплаты не проводятся.',
    button: 'Стать партнёром',
    registerLabel: 'Регистрация ресторана',
    points: [
      {
        title: 'Вы готовите — мы доставляем',
        text: 'Курьеры JETKIZ забирают заказ и доставляют его клиенту.',
      },
      {
        title: 'Каждый заказ под контролем',
        text: 'Статусы, история и движение заказа видны в системе.',
      },
      {
        title: 'Выплаты на следующий рабочий день',
        text: 'Финансы поступают после рабочего дня по понятной схеме.',
      },
    ],
    formTitle: 'Хотите подключить ресторан к JETKIZ?',
    formText:
      'Напишите нам в WhatsApp. Мы расскажем условия подключения и поможем добавить ресторан на платформу.',
    phone: PHONE_DISPLAY,
    whatsappButton: 'Написать в WhatsApp',
  },
  kk: {
    eyebrow: 'JETKIZ мейрамханаларға',
    title: 'Сіз тағамды дайындайсыз — жеткізу мен логистиканы біз аламыз',
    description:
      'JETKIZ платформасына қосылып, онлайн тапсырыстар қабылдаңыз. Сіз тапсырысты дайындап, курьерге бересіз — әрі қарай жеткізу, тапсырысты сүйемелдеу және клиентпен ыңғайлы байланыс біздің жағымызда.',
    strong:
      'Тапсырыстарыңыз жүйеде қорғалады, ал төлемдер келесі жұмыс күні түседі.',
    note: 'Демалыс күндері төлем жүргізілмейді.',
    button: 'Серіктес болу',
    registerLabel: 'Мейрамхананы тіркеу',
    points: [
      {
        title: 'Сіз дайындайсыз — біз жеткіземіз',
        text: 'JETKIZ курьерлері тапсырысты алып, клиентке жеткізеді.',
      },
      {
        title: 'Әр тапсырыс бақылауда',
        text: 'Мәртебе, тарих және тапсырыс қозғалысы жүйеде көрінеді.',
      },
      {
        title: 'Төлем келесі жұмыс күні',
        text: 'Қаржы түсімі түсінікті схема бойынша жүргізіледі.',
      },
    ],
    formTitle: 'Мейрамханаңызды JETKIZ-ке қосқыңыз келе ме?',
    formText:
      'WhatsApp арқылы жазыңыз. Қосылу шарттарын түсіндіріп, мейрамханаңызды платформаға қосуға көмектесеміз.',
    phone: PHONE_DISPLAY,
    whatsappButton: 'WhatsApp-қа жазу',
  },
};

const deliveryContent = {
  ru: {
    eyebrow: 'Доставка JETKIZ',
    title: 'Ваш заказ в надёжных руках',
    textOne:
      'Еду доставляют курьеры, прошедшие полную регистрацию в системе JETKIZ. Мы контролируем путь заказа: от передачи в ресторане до доставки клиенту.',
    textTwo:
      'Курьер забирает блюдо у ресторана, аккуратно доставляет его по адресу, а статус заказа отображается в приложении. Также клиент может выбрать самовывоз, если ресторан поддерживает такой способ получения.',
    cta: 'Скачать приложение',
    badge: 'Курьер · Ресторан · Клиент',
    bottom:
      'Проверенные курьеры · Контроль статусов · Бережная доставка · Самовывоз · Заказ в системе JETKIZ',
    points: [
      {
        number: '01',
        title: 'Проверенные курьеры',
        text: 'Каждый курьер проходит регистрацию перед выходом на линию и работает в системе JETKIZ.',
      },
      {
        number: '02',
        title: 'Заказ под контролем',
        text: 'Статусы заказа фиксируются в системе: ресторан принял заказ, готовит, передал курьеру, курьер доставляет.',
      },
      {
        number: '03',
        title: 'Доставка или самовывоз',
        text: 'Клиент может получить заказ курьером или забрать его самостоятельно из ресторана, если самовывоз доступен.',
      },
    ],
  },
  kk: {
    eyebrow: 'JETKIZ жеткізуі',
    title: 'Тапсырысыңыз сенімді қолда',
    textOne:
      'Тағамды JETKIZ жүйесінде толық тіркеуден өткен курьерлер жеткізеді. Біз тапсырыстың жолын бақылаймыз: мейрамханадан берілген сәттен бастап клиентке жеткізілгенге дейін.',
    textTwo:
      'Курьер тағамды мейрамханадан алып, мекенжайға ұқыпты жеткізеді, ал тапсырыс мәртебесі қосымшада көрінеді. Егер мейрамхана қолдаса, клиент тапсырысты өзі алып кете алады.',
    cta: 'Қосымшаны жүктеу',
    badge: 'Курьер · Мейрамхана · Клиент',
    bottom:
      'Тіркелген курьерлер · Мәртебе бақылауы · Ұқыпты жеткізу · Алып кету · JETKIZ жүйесіндегі тапсырыс',
    points: [
      {
        number: '01',
        title: 'Тіркелген курьерлер',
        text: 'Әр курьер желіге шықпас бұрын тіркеуден өтеді және JETKIZ жүйесінде жұмыс істейді.',
      },
      {
        number: '02',
        title: 'Тапсырыс бақылауда',
        text: 'Тапсырыс мәртебелері жүйеде белгіленеді: мейрамхана қабылдады, дайындап жатыр, курьерге берді, курьер жеткізуде.',
      },
      {
        number: '03',
        title: 'Жеткізу немесе алып кету',
        text: 'Клиент тапсырысты курьер арқылы ала алады немесе мейрамханадан өзі алып кете алады.',
      },
    ],
  },
};

const Badge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-black/10 bg-white px-4 text-center text-[12px] font-black leading-4 text-black shadow-sm sm:min-h-[42px] sm:px-5 sm:text-[13px]">
    {children}
  </span>
);

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#489F2A] sm:mb-5 sm:text-[13px] sm:tracking-[0.28em]">
    {children}
  </p>
);

const LegalCard = ({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) => (
  <article
    id={id}
    className="scroll-mt-24 rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_18px_55px_rgba(0,0,0,0.07)] sm:rounded-[34px] sm:p-7 md:p-9"
  >
    <h3 className="text-[28px] font-black leading-[0.98] tracking-[-0.045em] text-black sm:text-[34px] md:text-[42px]">
      {title}
    </h3>

    <div className="mt-5 space-y-4 text-[15px] font-semibold leading-7 text-black/68 sm:mt-6 sm:text-[16px] sm:leading-8">
      {children}
    </div>
  </article>
);

export default function PromoPage() {
  const [locale, setLocale] = useState<Locale>('ru');

  const t = content[locale];
  const appFlow = appFlowContent[locale];
  const partner = partnerContent[locale];
  const delivery = deliveryContent[locale];

  const toggleLocale = () => {
    setLocale((current) => (current === 'ru' ? 'kk' : 'ru'));
  };

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-white text-black">
      <section className="relative left-1/2 min-h-[860px] w-screen -translate-x-1/2 overflow-hidden bg-black md:min-h-screen">
        <img
          src="/brand/jetkiz-burabay-hero.png"
          alt="JETKIZ доставка еды по городу"
          className="absolute inset-0 h-full w-full object-cover object-[38%_center] md:object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/52 via-black/16 to-white/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/34" />
        <div className="absolute right-0 top-0 hidden h-full w-[50vw] bg-gradient-to-l from-white/52 via-white/20 to-transparent md:block" />

        <header className="absolute left-0 right-0 top-0 z-30">
          <div className="mx-auto grid max-w-[1540px] grid-cols-[90px_1fr_86px] items-center gap-3 px-4 py-5 sm:grid-cols-[110px_1fr_96px] md:grid-cols-[190px_1fr_140px] md:px-8 md:py-6 lg:grid-cols-[240px_1fr_180px] lg:px-10 lg:py-7">
            <a href="#top" className="flex items-center justify-start">
              <img
                src="/brand/jetkiz-logo.png"
                alt="JETKIZ"
                className="h-[70px] w-[70px] rounded-full bg-white object-contain p-2 shadow-2xl sm:h-[74px] sm:w-[74px] md:h-[96px] md:w-[96px] lg:h-[112px] lg:w-[112px]"
              />
            </a>

            <nav className="mx-auto hidden h-[62px] w-full max-w-[760px] grid-cols-4 items-center rounded-full bg-white/92 px-2 text-[14px] font-black text-black shadow-2xl backdrop-blur-xl lg:grid">
              <a
                href="#how"
                className="flex h-full items-center justify-center rounded-full px-4 text-center leading-[17px] transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navHow}
              </a>

              <a
                href="#restaurants"
                className="flex h-full items-center justify-center rounded-full px-4 text-center leading-[17px] transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navRestaurants}
              </a>

              <a
                href="#delivery"
                className="flex h-full items-center justify-center rounded-full px-4 text-center leading-[17px] transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navDelivery}
              </a>

              <a
                href="#legal"
                className="flex h-full items-center justify-center rounded-full px-4 text-center leading-[17px] transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navLegal}
              </a>
            </nav>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleLocale}
                className="h-[48px] w-[82px] rounded-full bg-white/92 text-[12px] font-black text-black shadow-2xl backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white sm:w-[86px] sm:text-[13px] md:h-[56px] md:w-[106px] md:text-[14px] lg:h-[58px] lg:w-[112px]"
              >
                {locale === 'ru' ? 'RU / KZ' : 'KZ / RU'}
              </button>
            </div>
          </div>
        </header>

        <div
          id="top"
          className="relative z-20 mx-auto mb-10 mt-[160px] w-[calc(100vw-32px)] rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_35px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:mt-[168px] sm:w-[min(520px,calc(100vw-40px))] sm:p-6 md:absolute md:right-[5vw] md:top-[42vh] md:mx-0 md:mb-0 md:mt-0 md:w-[620px] md:rounded-[34px] md:p-8"
        >
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#489F2A] sm:mb-5 sm:text-[13px] sm:tracking-[0.22em]">
            {t.badge}
          </p>

          <h1 className="text-[37px] font-black leading-[0.94] tracking-[-0.052em] text-black sm:text-[44px] md:text-[49px]">
            {t.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-5 min-h-0 text-[16px] font-semibold leading-7 text-black/70 md:mt-6 md:min-h-[112px] md:text-[18px] md:leading-8">
            {t.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 md:mt-8 md:flex-nowrap md:gap-4">
            <a
              href="#order"
              className="group flex h-[60px] w-full shrink-0 items-center justify-center rounded-full bg-[#489F2A] px-4 text-[16px] font-black text-white shadow-[0_18px_45px_rgba(72,159,42,0.38)] transition hover:-translate-y-0.5 hover:bg-[#3f8f24] sm:w-[210px] md:h-[64px]"
            >
              <span className="text-center leading-[18px]">{t.cta}</span>
              <span className="ml-3 shrink-0 transition group-hover:translate-x-1">
                →
              </span>
            </a>

            <div className="flex h-[60px] w-full shrink-0 items-center justify-center gap-3 rounded-full bg-[#DFDFDF]/72 px-4 text-[15px] font-black text-black/76 sm:w-[240px] md:h-[64px]">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#489F2A]" />
              <span className="text-center leading-[17px]">{t.note}</span>
            </div>
          </div>

          <div className="mt-6 grid min-h-[82px] grid-cols-3 gap-3 border-t border-black/10 pt-5 sm:gap-4 md:mt-7">
            <div>
              <div className="text-[20px] font-black leading-none text-black sm:text-[24px]">
                2 мин
              </div>
              <div className="mt-2 text-[11px] font-bold leading-[15px] text-black/55 sm:text-[12px]">
                {t.statOne}
              </div>
            </div>

            <div>
              <div className="text-[20px] font-black leading-none text-black sm:text-[24px]">
                24/7
              </div>
              <div className="mt-2 text-[11px] font-bold leading-[15px] text-black/55 sm:text-[12px]">
                {t.statTwo}
              </div>
            </div>

            <div>
              <div className="text-[20px] font-black leading-none text-black sm:text-[24px]">
                JETKIZ
              </div>
              <div className="mt-2 text-[11px] font-bold leading-[15px] text-black/55 sm:text-[12px]">
                {t.statThree}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-30 hidden min-h-[52px] w-[560px] -translate-x-1/2 items-center justify-center rounded-full border border-white/60 bg-white/88 px-8 py-3 text-center text-[14px] font-black leading-[18px] text-black shadow-2xl backdrop-blur-xl md:flex">
          {t.bottom}
        </div>
      </section>

      <section
        id="how"
        className="relative overflow-hidden bg-white px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#489F2A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-[#489F2A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div>
              <SectionLabel>{appFlow.eyebrow}</SectionLabel>

              <h2 className="max-w-[700px] text-[44px] font-black leading-[0.92] tracking-[-0.06em] text-black sm:text-[54px] md:text-[82px]">
                {appFlow.title}
              </h2>
            </div>

            <div className="lg:ml-auto lg:max-w-[620px]">
              <p className="text-[17px] font-semibold leading-8 text-black/62 sm:text-[19px] md:text-[21px] md:leading-9">
                {appFlow.description}
              </p>

              <div className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-[14px] font-black text-white shadow-2xl sm:mt-7 sm:px-6 sm:py-4 sm:text-[15px]">
                {appFlow.stepLabel}
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:mt-16 md:gap-8 lg:mt-20 lg:grid-cols-4">
            {appFlow.steps.map((step, index) => (
              <article
                key={step.number}
                className={[
                  'group relative overflow-hidden rounded-[30px] border border-black/10 bg-[#F7F7F7] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_34px_90px_rgba(72,159,42,0.22)] sm:rounded-[38px] sm:p-5',
                  index === 1 ? 'lg:mt-16' : '',
                  index === 2 ? 'lg:mt-6' : '',
                  index === 3 ? 'lg:mt-24' : '',
                ].join(' ')}
              >
                <div className="absolute left-5 top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#489F2A] text-[13px] font-black text-white shadow-xl sm:left-6 sm:top-6 sm:h-14 sm:w-14 sm:text-[15px]">
                  {step.number}
                </div>

                <div className="relative mx-auto flex h-[390px] w-full items-center justify-center overflow-hidden rounded-[26px] bg-white sm:h-[460px] md:h-[500px] md:rounded-[30px]">
                  <div className="absolute inset-x-8 top-5 z-10 h-6 rounded-b-[22px] bg-black/10" />

                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-full w-full rounded-[26px] object-cover object-top transition duration-500 group-hover:scale-[1.035] md:rounded-[30px]"
                  />
                </div>

                <div className="pt-6 sm:pt-7">
                  <h3 className="text-[25px] font-black leading-[1] tracking-[-0.045em] text-black sm:text-[27px]">
                    {step.title}
                  </h3>

                  <p className="mt-4 min-h-0 text-[15px] font-semibold leading-7 text-black/58 lg:min-h-[132px] lg:text-[16px]">
                    {step.text}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-[32px] bg-black p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.22)] sm:mt-16 sm:rounded-[40px] sm:p-8 md:p-10">
            <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#489F2A] sm:text-[13px] sm:tracking-[0.26em]">
                  {appFlow.benefitLabel}
                </p>

                <h3 className="mt-4 max-w-[760px] text-[36px] font-black leading-[0.98] tracking-[-0.05em] sm:text-[42px] md:text-[56px]">
                  {appFlow.benefitTitle}
                </h3>
              </div>

              <div className="rounded-[26px] bg-white px-6 py-4 text-center text-[14px] font-black leading-6 text-black sm:rounded-full sm:px-7 sm:text-[15px] md:max-w-[560px]">
                {appFlow.bottom}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="restaurants"
        className="relative overflow-hidden bg-[#F4F4F4] px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-[460px] w-[460px] rounded-full bg-[#489F2A]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-black/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
            <div className="relative min-h-[560px] overflow-hidden rounded-[34px] bg-black shadow-[0_34px_110px_rgba(0,0,0,0.26)] sm:min-h-[680px] sm:rounded-[48px] lg:min-h-[760px]">
              <img
                src="/brand/restaurant-partner-handoff.png"
                alt="Ресторан передаёт заказ курьеру JETKIZ"
                className="absolute inset-0 h-full w-full object-cover object-center sm:object-right"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

              <div className="absolute bottom-5 left-4 right-4 rounded-[28px] border border-white/55 bg-white/92 p-5 shadow-2xl backdrop-blur-xl sm:bottom-8 sm:left-6 sm:right-6 sm:rounded-[32px] sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {partner.points.map((point) => (
                    <div key={point.title}>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#489F2A] text-[18px] font-black text-white">
                        ✓
                      </div>

                      <h4 className="text-[17px] font-black leading-[1.05] tracking-[-0.035em] text-black sm:text-[18px]">
                        {point.title}
                      </h4>

                      <p className="mt-2 text-[13px] font-bold leading-5 text-black/58">
                        {point.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[34px] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.12)] sm:rounded-[48px] sm:p-8 md:p-10 lg:p-12">
              <div>
                <SectionLabel>{partner.eyebrow}</SectionLabel>

                <h2 className="max-w-[760px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] text-black sm:text-[50px] md:text-[72px]">
                  {partner.title}
                </h2>

                <p className="mt-7 max-w-[720px] text-[17px] font-semibold leading-8 text-black/64 sm:text-[19px] md:mt-8 md:text-[20px] md:leading-9">
                  {partner.description}
                </p>

                <div className="mt-7 rounded-[26px] border border-[#489F2A]/25 bg-[#489F2A]/8 p-5 sm:mt-8 sm:rounded-[30px] sm:p-6">
                  <p className="text-[22px] font-black leading-[1.12] tracking-[-0.035em] text-black sm:text-[24px]">
                    {partner.strong}
                  </p>

                  <p className="mt-3 text-[15px] font-bold leading-6 text-black/55">
                    {partner.note}
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-3 sm:mt-8 sm:gap-4">
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex h-[60px] w-full items-center justify-center rounded-full bg-[#489F2A] px-7 text-[16px] font-black text-white shadow-[0_22px_55px_rgba(72,159,42,0.34)] transition hover:-translate-y-1 hover:bg-[#3f8f24] sm:h-[66px] sm:w-auto sm:px-9 sm:text-[17px]"
                  >
                    {partner.button}
                    <span className="ml-3 transition group-hover:translate-x-1">
                      →
                    </span>
                  </a>

                  <div className="flex h-[60px] w-full items-center justify-center rounded-full bg-[#DFDFDF]/70 px-7 text-[16px] font-black text-black/72 sm:h-[66px] sm:w-auto">
                    {partner.phone}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[30px] bg-black p-6 text-white sm:mt-10 sm:rounded-[36px] sm:p-7">
                <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#489F2A] sm:text-[13px] sm:tracking-[0.24em]">
                  {partner.registerLabel}
                </p>

                <h3 className="mt-4 text-[30px] font-black leading-[0.96] tracking-[-0.05em] sm:text-[34px] md:text-[44px]">
                  {partner.formTitle}
                </h3>

                <p className="mt-5 text-[16px] font-semibold leading-7 text-white/68 sm:text-[17px] sm:leading-8">
                  {partner.formText}
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="rounded-[24px] border border-white/12 bg-white/8 px-5 py-5 sm:px-6">
                    <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/45 sm:text-[13px]">
                      WhatsApp
                    </div>
                    <div className="mt-2 text-[22px] font-black text-white sm:text-[24px]">
                      {partner.phone}
                    </div>
                  </div>

                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-[62px] items-center justify-center rounded-full bg-white px-7 text-[16px] font-black text-black transition hover:-translate-y-1 hover:bg-[#489F2A] hover:text-white sm:h-[66px] sm:px-8"
                  >
                    {partner.whatsappButton}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="delivery"
        className="relative overflow-hidden bg-white px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-[#489F2A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-16 h-[520px] w-[520px] rounded-full bg-black/8 blur-3xl" />

        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[34px] bg-black p-6 text-white shadow-[0_34px_110px_rgba(0,0,0,0.24)] sm:rounded-[48px] sm:p-8 md:p-12">
              <SectionLabel>{delivery.eyebrow}</SectionLabel>

              <h2 className="max-w-[760px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] text-white sm:text-[54px] md:text-[78px]">
                {delivery.title}
              </h2>

              <p className="mt-7 max-w-[760px] text-[17px] font-semibold leading-8 text-white/66 sm:text-[19px] md:mt-8 md:text-[20px] md:leading-9">
                {delivery.textOne}
              </p>

              <p className="mt-5 max-w-[760px] text-[17px] font-semibold leading-8 text-white/66 sm:text-[19px] md:mt-6 md:text-[20px] md:leading-9">
                {delivery.textTwo}
              </p>

              <div className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">
                <a
                  href="#order"
                  className="group inline-flex h-[60px] w-full items-center justify-center rounded-full bg-[#489F2A] px-7 text-[16px] font-black text-white shadow-[0_22px_55px_rgba(72,159,42,0.34)] transition hover:-translate-y-1 hover:bg-[#3f8f24] sm:h-[66px] sm:w-auto sm:px-9 sm:text-[17px]"
                >
                  {delivery.cta}
                  <span className="ml-3 transition group-hover:translate-x-1">
                    →
                  </span>
                </a>

                <div className="flex h-[60px] w-full items-center justify-center rounded-full bg-white/10 px-7 text-center text-[15px] font-black text-white/82 sm:h-[66px] sm:w-auto sm:text-[16px]">
                  {delivery.badge}
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              {delivery.points.map((point) => (
                <div
                  key={point.number}
                  className="rounded-[30px] border border-black/8 bg-[#F7F7F7] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(72,159,42,0.18)] sm:rounded-[40px] sm:p-8"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#489F2A] text-[22px] font-black text-white shadow-xl sm:mb-7 sm:h-16 sm:w-16 sm:text-[24px]">
                    {point.number}
                  </div>

                  <h3 className="text-[30px] font-black leading-none tracking-[-0.045em] text-black sm:text-[34px]">
                    {point.title}
                  </h3>

                  <p className="mt-5 max-w-[640px] text-[16px] font-semibold leading-8 text-black/60 sm:text-[18px]">
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-[30px] border border-black/8 bg-[#DFDFDF]/45 p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.06)] sm:mt-12 sm:rounded-[40px] sm:p-7">
            <p className="text-[16px] font-black leading-8 text-black/72 sm:text-[18px]">
              {delivery.bottom}
            </p>
          </div>
        </div>
      </section>

      <section
        id="order"
        className="relative overflow-hidden bg-[#F4F4F4] px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <div className="rounded-[34px] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.1)] sm:rounded-[48px] sm:p-8 md:p-12">
              <SectionLabel>Услуги и цены</SectionLabel>

              <h2 className="max-w-[820px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] text-black sm:text-[50px] md:text-[76px]">
                Что можно заказать через JETKIZ
              </h2>

              <p className="mt-7 text-[17px] font-semibold leading-8 text-black/64 sm:text-[19px] md:mt-8 md:text-[20px] md:leading-9">
                JETKIZ предоставляет онлайн-сервис для оформления заказов еды из
                ресторанов, доставки курьером и самовывоза. Итоговая сумма
                заказа показывается до подтверждения оплаты.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Badge>Онлайн-заказ еды</Badge>
                <Badge>Доставка</Badge>
                <Badge>Самовывоз</Badge>
                <Badge>Сервис для ресторанов</Badge>
              </div>
            </div>

            <div className="grid gap-5">
              {[
                {
                  title: 'Онлайн-заказ еды',
                  price: 'Цена: по меню ресторана',
                  text: 'Клиент выбирает ресторан, добавляет блюда в корзину и оформляет заказ через сервис JETKIZ.',
                },
                {
                  title: 'Доставка еды',
                  price: 'Цена: отображается при оформлении заказа',
                  text: 'Доставка выполняется курьером в доступной зоне обслуживания. Стоимость доставки показывается до оплаты.',
                },
                {
                  title: 'Самовывоз',
                  price: 'Цена: бесплатно, если ресторан поддерживает самовывоз',
                  text: 'Клиент может самостоятельно забрать заказ из ресторана после подтверждения готовности.',
                },
                {
                  title: 'Сервисный сбор',
                  price: 'Цена: если применяется, отображается до оплаты',
                  text: 'Сервисный сбор может применяться за использование платформы и всегда показывается клиенту до подтверждения заказа.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] sm:rounded-[34px] sm:p-7"
                >
                  <h3 className="text-[27px] font-black leading-none tracking-[-0.04em] text-black sm:text-[30px]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-[15px] font-black text-[#489F2A] sm:text-[16px]">
                    {item.price}
                  </p>
                  <p className="mt-3 text-[15px] font-semibold leading-7 text-black/62 sm:text-[16px]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="payment"
        className="relative overflow-hidden bg-black px-4 py-20 text-white sm:px-6 md:px-10 md:py-28"
      >
        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em] text-[#489F2A] sm:mb-6 sm:text-[13px] sm:tracking-[0.28em]">
                Оплата банковской картой
              </p>

              <h2 className="max-w-[860px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] text-white sm:text-[54px] md:text-[82px]">
                Оплата через PayLink.kz
              </h2>

              <p className="mt-7 max-w-[880px] text-[17px] font-semibold leading-8 text-white/68 sm:text-[19px] md:mt-8 md:text-[20px] md:leading-9">
                Оплата банковской картой в JETKIZ осуществляется через платёжную
                организацию PayLink.kz. К оплате могут приниматься банковские
                карты Visa и Mastercard. При оплате может применяться технология
                3D Secure, если она поддерживается банком-эмитентом.
              </p>

              <p className="mt-5 max-w-[880px] text-[17px] font-semibold leading-8 text-white/68 sm:text-[19px] md:mt-6 md:text-[20px] md:leading-9">
                JETKIZ не хранит данные банковских карт. Платёжные данные
                передаются через защищённое HTTPS/SSL-соединение на стороне
                платёжной организации.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white p-6 text-black shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:rounded-[42px] sm:p-8">
              <h3 className="text-[32px] font-black leading-[0.96] tracking-[-0.05em] sm:text-[36px]">
                Платёжная безопасность
              </h3>

              <div className="mt-7 flex flex-wrap gap-3">
                <Badge>Visa</Badge>
                <Badge>Mastercard</Badge>
                <Badge>3D Secure</Badge>
                <Badge>PayLink.kz</Badge>
                <Badge>HTTPS / SSL</Badge>
              </div>

              <div className="mt-8 space-y-4 text-[15px] font-semibold leading-7 text-black/66 sm:text-[16px]">
                <p>
                  После оплаты клиенту рекомендуется сохранить электронный чек,
                  подтверждение транзакции и номер заказа.
                </p>
                <p>
                  При ошибке оплаты заказ может не быть подтверждён до успешного
                  завершения платежа.
                </p>
                <p>
                  Возврат по оплаченному заказу производится на карту, с которой
                  была совершена оплата, если иное не предусмотрено правилами
                  платёжной организации и банка клиента.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="legal"
        className="relative overflow-hidden bg-[#F4F4F4] px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="relative mx-auto max-w-[1540px]">
          <div className="mb-12 max-w-[980px] sm:mb-14">
            <SectionLabel>Юридическая информация</SectionLabel>

            <h2 className="text-[42px] font-black leading-[0.92] tracking-[-0.06em] text-black sm:text-[50px] md:text-[78px]">
              Правила сервиса JETKIZ
            </h2>

            <p className="mt-7 text-[17px] font-semibold leading-8 text-black/64 sm:text-[19px] md:mt-8 md:text-[20px] md:leading-9">
              Ниже размещены временная публичная оферта, правила оплаты,
              доставки, возврата и политика конфиденциальности для пользователей
              сервиса JETKIZ.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-7">
            <LegalCard id="offer" title="Публичная оферта">
              <p>
                Настоящая публичная оферта определяет условия использования
                сервиса JETKIZ, размещённого на домене {company.domain}, а также
                в мобильных приложениях и иных цифровых каналах сервиса.
              </p>

              <p>
                Исполнитель: {company.name}, БИН {company.bin}, адрес:{' '}
                {company.address}.
              </p>

              <p>
                Пользователь, оформляя заказ через JETKIZ, подтверждает, что
                ознакомился с условиями настоящей оферты и принимает их.
              </p>

              <p>
                JETKIZ предоставляет цифровой сервис для выбора ресторанов,
                оформления заказа, передачи заказа ресторану, организации
                доставки или самовывоза, а также отображения статуса заказа.
              </p>

              <p>
                Стоимость заказа формируется из стоимости блюд по меню
                ресторана, стоимости доставки, скидок, возможного сервисного
                сбора и иных параметров, отображаемых до подтверждения заказа.
              </p>

              <p>
                Заказ считается оформленным после подтверждения пользователем
                данных заказа и, если выбрана онлайн-оплата, после успешной
                оплаты через платёжную организацию.
              </p>

              <p>
                JETKIZ вправе отказать в оформлении или исполнении заказа, если
                ресторан недоступен, товар отсутствует, адрес находится вне зоны
                обслуживания, оплата не прошла или возникла техническая ошибка.
              </p>

              <p>
                Пользователь обязан указывать достоверный номер телефона, адрес
                доставки и данные, необходимые для исполнения заказа.
              </p>

              <p>
                Все обращения по заказам принимаются по телефону/WhatsApp:{' '}
                {company.phone}.
              </p>
            </LegalCard>

            <LegalCard id="refund" title="Возврат и отмена заказа">
              <p>
                Пользователь может отменить заказ до начала приготовления, если
                ресторан ещё не принял заказ в работу.
              </p>

              <p>
                После начала приготовления отмена заказа рассматривается
                индивидуально, так как еда является товаром, который готовится
                под конкретный заказ пользователя.
              </p>

              <p>
                Если заказ был оплачен онлайн, а отмена подтверждена сервисом,
                возврат производится на карту, с которой была совершена оплата.
                Срок поступления денег зависит от банка клиента и платёжной
                организации.
              </p>

              <p>
                Возврат может быть произведён при технической ошибке оплаты,
                ошибочном списании, невозможности исполнения заказа,
                существенном нарушении состава заказа или иной подтверждённой
                проблеме.
              </p>

              <p>
                Для рассмотрения возврата пользователь должен предоставить номер
                заказа, номер телефона, описание ситуации и, при наличии, чек или
                подтверждение оплаты.
              </p>

              <p>
                Обращения принимаются по телефону/WhatsApp: {company.phone}.
              </p>
            </LegalCard>

            <LegalCard id="delivery-rules" title="Доставка и самовывоз">
              <p>
                Доставка осуществляется в городе Щучинск и доступных зонах
                обслуживания сервиса JETKIZ.
              </p>

              <p>
                Срок доставки зависит от времени приготовления ресторана,
                расстояния, загруженности курьеров, погодных условий и других
                факторов.
              </p>

              <p>
                Если выбран самовывоз, пользователь самостоятельно забирает заказ
                из ресторана после подтверждения готовности заказа.
              </p>

              <p>
                Пользователь обязан быть доступен по указанному номеру телефона
                во время исполнения заказа.
              </p>
            </LegalCard>

            <LegalCard id="privacy" title="Политика конфиденциальности">
              <p>
                JETKIZ обрабатывает данные, необходимые для работы сервиса:
                номер телефона, имя, адрес доставки, состав заказа, историю
                заказов, статус оплаты и технические данные приложения.
              </p>

              <p>
                Данные используются для регистрации пользователя, оформления и
                исполнения заказов, связи с пользователем, обработки оплат,
                поддержки, улучшения качества сервиса и предотвращения
                мошенничества.
              </p>

              <p>
                Платёжные данные банковской карты обрабатываются на стороне
                платёжной организации {company.payment}. JETKIZ не хранит полные
                данные банковских карт.
              </p>

              <p>
                Передача данных осуществляется через защищённое соединение.
                Доступ к данным ограничивается только лицами и системами, которым
                он необходим для работы сервиса.
              </p>

              <p>
                Пользователь может обратиться по вопросам обработки данных по
                телефону/WhatsApp: {company.phone}.
              </p>
            </LegalCard>

            <LegalCard id="licenses" title="Лицензии и разрешения">
              <p>
                Деятельность {company.name} по предоставлению онлайн-сервиса
                заказа и доставки еды не относится к лицензируемым видам
                деятельности.
              </p>

              <p>
                При изменении законодательства или требований регулирующих
                органов информация на сайте будет обновлена.
              </p>
            </LegalCard>

            <LegalCard id="contacts" title="Реквизиты и контакты">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-[#F4F4F4] p-5 sm:rounded-[26px] sm:p-6">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40 sm:text-[13px]">
                    Компания
                  </p>
                  <p className="mt-2 text-[20px] font-black text-black sm:text-[22px]">
                    {company.name}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#F4F4F4] p-5 sm:rounded-[26px] sm:p-6">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40 sm:text-[13px]">
                    БИН
                  </p>
                  <p className="mt-2 text-[20px] font-black text-black sm:text-[22px]">
                    {company.bin}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#F4F4F4] p-5 sm:rounded-[26px] sm:p-6 md:col-span-2">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40 sm:text-[13px]">
                    Адрес
                  </p>
                  <p className="mt-2 text-[20px] font-black leading-8 text-black sm:text-[22px]">
                    {company.address}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#F4F4F4] p-5 sm:rounded-[26px] sm:p-6">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40 sm:text-[13px]">
                    Телефон / WhatsApp
                  </p>
                  <p className="mt-2 text-[20px] font-black text-black sm:text-[22px]">
                    {company.phone}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#F4F4F4] p-5 sm:rounded-[26px] sm:p-6">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40 sm:text-[13px]">
                    Домен
                  </p>
                  <p className="mt-2 text-[20px] font-black text-black sm:text-[22px]">
                    {company.domain}
                  </p>
                </div>
              </div>
            </LegalCard>
          </div>
        </div>
      </section>

      <footer className="bg-black px-4 py-12 text-white sm:px-6 md:px-10 md:py-14">
        <div className="mx-auto max-w-[1540px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <img
                src="/brand/jetkiz-logo.png"
                alt="JETKIZ"
                className="h-[82px] w-[82px] rounded-full bg-white object-contain p-2 sm:h-[92px] sm:w-[92px]"
              />

              <h2 className="mt-7 text-[30px] font-black leading-none tracking-[-0.04em] sm:text-[32px]">
                JETKIZ
              </h2>

              <p className="mt-4 max-w-[560px] text-[15px] font-semibold leading-7 text-white/58">
                Онлайн-сервис заказа еды, доставки и самовывоза в Щучинске.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-black">
                  Visa
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-black">
                  Mastercard
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-black">
                  3D Secure
                </span>
                <span className="rounded-full bg-[#489F2A] px-4 py-2 text-[13px] font-black text-white">
                  PayLink.kz
                </span>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-[15px] font-black uppercase tracking-[0.18em] text-white/40 sm:text-[16px]">
                  Юридическая информация
                </h3>

                <div className="mt-5 space-y-3 text-[15px] font-semibold leading-6 text-white/68">
                  <p>{company.name}</p>
                  <p>БИН: {company.bin}</p>
                  <p>{company.address}</p>
                  <p>Телефон / WhatsApp: {company.phone}</p>
                  <p>Домен: {company.domain}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-black uppercase tracking-[0.18em] text-white/40 sm:text-[16px]">
                  Разделы
                </h3>

                <nav className="mt-5 grid gap-3 text-[15px] font-semibold text-white/68">
                  <a href="#how" className="transition hover:text-white">
                    Как работает
                  </a>
                  <a href="#restaurants" className="transition hover:text-white">
                    Ресторанам
                  </a>
                  <a href="#delivery" className="transition hover:text-white">
                    Доставка
                  </a>
                  <a href="#payment" className="transition hover:text-white">
                    Оплата
                  </a>
                  <a href="#offer" className="transition hover:text-white">
                    Публичная оферта
                  </a>
                  <a href="#refund" className="transition hover:text-white">
                    Возврат и отмена
                  </a>
                  <a href="#privacy" className="transition hover:text-white">
                    Политика конфиденциальности
                  </a>
                  <a href="#contacts" className="transition hover:text-white">
                    Контакты
                  </a>
                </nav>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-7 text-[13px] font-semibold leading-6 text-white/42">
            <p>
              © {new Date().getFullYear()} {company.name}. Все права защищены.
            </p>
            <p className="mt-2">
              Клиенту рекомендуется сохранять электронный чек, подтверждение
              оплаты и номер заказа до завершения оказания услуги.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}