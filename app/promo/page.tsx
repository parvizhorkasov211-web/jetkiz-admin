'use client';

import { useState } from 'react';

type Locale = 'ru' | 'kk';

const WHATSAPP_LINK =
  'https://wa.me/77086810693?text=Здравствуйте!%20Хочу%20подключить%20ресторан%20к%20JETKIZ';

const content = {
  ru: {
    navHow: 'Как работает',
    navRestaurants: 'Рестораны',
    navDelivery: 'Доставка',
    badge: 'JETKIZ · доставка еды по городу',
    titleLines: ['Еда из лучших', 'заведений — быстро', 'к вашей двери'],
    description:
      'Выбирайте ресторан, добавляйте любимые блюда и оформляйте заказ за пару минут. JETKIZ доставит еду домой, в офис или туда, где вы сейчас.',
    cta: 'Заказать еду',
    note: 'Доставка до двери',
    bottom: 'Лучшие заведения города · Удобный заказ · Доставка до двери',
    statOne: 'оформить заказ',
    statTwo: 'удобно с телефона',
    statThree: 'локальный сервис',
  },
  kk: {
    navHow: 'Қалай жұмыс істейді',
    navRestaurants: 'Мейрамханалар',
    navDelivery: 'Жеткізу',
    badge: 'JETKIZ · қала ішінде тағам жеткізу',
    titleLines: ['Үздік орындардан', 'тағам — есігіңізге', 'жылдам жеткіземіз'],
    description:
      'Мейрамхананы таңдаңыз, сүйікті тағамдарыңызды қосыңыз және тапсырысты бірнеше минутта рәсімдеңіз. JETKIZ тағамды үйге, кеңсеге немесе тұрған жеріңізге жеткізеді.',
    cta: 'Тапсырыс беру',
    note: 'Есікке дейін жеткізу',
    bottom: 'Үздік орындар · Ыңғайлы тапсырыс · Есікке дейін жеткізу',
    statOne: 'тапсырыс рәсімдеу',
    statTwo: 'телефоннан ыңғайлы',
    statThree: 'жергілікті сервис',
  },
};

export default function PromoPage() {
  const [locale, setLocale] = useState<Locale>('ru');
  const t = content[locale];

  const appFlow =
    locale === 'ru'
      ? {
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
        }
      : {
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
        };

  const partner =
    locale === 'ru'
      ? {
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
          phone: '+7 708 681 06 93',
          whatsappButton: 'Написать в WhatsApp',
        }
      : {
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
          phone: '+7 708 681 06 93',
          whatsappButton: 'WhatsApp-қа жазу',
        };

  const delivery =
    locale === 'ru'
      ? {
          eyebrow: 'Доставка JETKIZ',
          title: 'Ваш заказ в надёжных руках',
          textOne:
            'Еду доставляют курьеры, прошедшие полную регистрацию в системе JETKIZ. Мы контролируем путь заказа: от передачи в ресторане до доставки клиенту.',
          textTwo:
            'Курьер забирает блюдо у ресторана, аккуратно доставляет его по адресу, а статус заказа отображается в приложении. Вы можете не переживать за сохранность блюд — доставка проходит через понятный и контролируемый процесс.',
          cta: 'Скачать приложение',
          badge: 'Курьер · Ресторан · Клиент',
          bottom:
            'Проверенные курьеры · Контроль статусов · Бережная доставка · Заказ в системе JETKIZ',
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
              title: 'Бережная доставка',
              text: 'Курьер забирает заказ у ресторана и доставляет его аккуратно, чтобы блюдо приехало к клиенту в нормальном виде.',
            },
          ],
        }
      : {
          eyebrow: 'JETKIZ жеткізуі',
          title: 'Тапсырысыңыз сенімді қолда',
          textOne:
            'Тағамды JETKIZ жүйесінде толық тіркеуден өткен курьерлер жеткізеді. Біз тапсырыстың жолын бақылаймыз: мейрамханадан берілген сәттен бастап клиентке жеткізілгенге дейін.',
          textTwo:
            'Курьер тағамды мейрамханадан алып, мекенжайға ұқыпты жеткізеді, ал тапсырыс мәртебесі қосымшада көрінеді. Тағамның сақталуына алаңдамайсыз — жеткізу түсінікті әрі бақыланатын процесс арқылы өтеді.',
          cta: 'Қосымшаны жүктеу',
          badge: 'Курьер · Мейрамхана · Клиент',
          bottom:
            'Тіркелген курьерлер · Мәртебе бақылауы · Ұқыпты жеткізу · JETKIZ жүйесіндегі тапсырыс',
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
              title: 'Ұқыпты жеткізу',
              text: 'Курьер тапсырысты мейрамханадан алып, тағам клиентке дұрыс күйде жетуі үшін ұқыпты жеткізеді.',
            },
          ],
        };

  const toggleLocale = () => {
    setLocale((current) => (current === 'ru' ? 'kk' : 'ru'));
  };

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-white text-black">
      <section className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-black">
        <img
          src="/brand/jetkiz-burabay-hero.png"
          alt="JETKIZ доставка еды по городу"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/42 via-black/10 to-white/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-transparent to-black/28" />
        <div className="absolute right-0 top-0 h-full w-[50vw] bg-gradient-to-l from-white/52 via-white/20 to-transparent" />

        <header className="absolute left-0 right-0 top-0 z-30">
          <div className="mx-auto grid max-w-[1540px] grid-cols-[240px_1fr_180px] items-center px-10 py-7">
            <a href="/promo" className="flex items-center justify-start">
              <img
                src="/brand/jetkiz-logo.png"
                alt="JETKIZ"
                className="h-[112px] w-[112px] rounded-full bg-white object-contain p-2 shadow-2xl"
              />
            </a>

            <nav className="mx-auto hidden h-[62px] w-[560px] grid-cols-3 items-center rounded-full bg-white/92 px-2 text-[15px] font-black text-black shadow-2xl backdrop-blur-xl md:grid">
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
            </nav>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleLocale}
                className="h-[58px] w-[112px] rounded-full bg-white/92 text-[15px] font-black text-black shadow-2xl backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white"
              >
                {locale === 'ru' ? 'RU / KZ' : 'KZ / RU'}
              </button>
            </div>
          </div>
        </header>

        <div className="absolute right-[5vw] top-[42vh] z-20 w-[620px] rounded-[34px] border border-white/70 bg-white/88 p-8 shadow-[0_35px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <p className="mb-5 text-[13px] font-black uppercase tracking-[0.22em] text-[#489F2A]">
            {t.badge}
          </p>

          <h1 className="text-[49px] font-black leading-[0.94] tracking-[-0.052em] text-black">
            {t.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-6 min-h-[112px] text-[18px] font-semibold leading-8 text-black/70">
            {t.description}
          </p>

          <div className="mt-8 flex h-[68px] items-center gap-4">
            <a
              href="#order"
              className="group flex h-[64px] w-[210px] shrink-0 items-center justify-center rounded-full bg-[#489F2A] px-4 text-[16px] font-black text-white shadow-[0_18px_45px_rgba(72,159,42,0.38)] transition hover:-translate-y-0.5 hover:bg-[#3f8f24]"
            >
              <span className="text-center leading-[18px]">{t.cta}</span>
              <span className="ml-3 shrink-0 transition group-hover:translate-x-1">
                →
              </span>
            </a>

            <div className="flex h-[64px] w-[240px] shrink-0 items-center justify-center gap-3 rounded-full bg-[#DFDFDF]/72 px-4 text-[15px] font-black text-black/76">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#489F2A]" />
              <span className="text-center leading-[17px]">{t.note}</span>
            </div>
          </div>

          <div className="mt-7 grid min-h-[82px] grid-cols-3 gap-4 border-t border-black/10 pt-5">
            <div>
              <div className="text-[24px] font-black leading-none text-black">
                2 мин
              </div>
              <div className="mt-2 text-[12px] font-bold leading-[15px] text-black/55">
                {t.statOne}
              </div>
            </div>

            <div>
              <div className="text-[24px] font-black leading-none text-black">
                24/7
              </div>
              <div className="mt-2 text-[12px] font-bold leading-[15px] text-black/55">
                {t.statTwo}
              </div>
            </div>

            <div>
              <div className="text-[24px] font-black leading-none text-black">
                JETKIZ
              </div>
              <div className="mt-2 text-[12px] font-bold leading-[15px] text-black/55">
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
        className="relative overflow-hidden bg-white px-6 py-28 text-black md:px-10"
      >
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#489F2A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-[#489F2A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div>
              <p className="mb-5 text-[13px] font-black uppercase tracking-[0.28em] text-[#489F2A]">
                {appFlow.eyebrow}
              </p>

              <h2 className="max-w-[700px] text-[54px] font-black leading-[0.92] tracking-[-0.06em] text-black md:text-[82px]">
                {appFlow.title}
              </h2>
            </div>

            <div className="lg:ml-auto lg:max-w-[620px]">
              <p className="text-[21px] font-semibold leading-9 text-black/62">
                {appFlow.description}
              </p>

              <div className="mt-7 inline-flex rounded-full bg-black px-6 py-4 text-[15px] font-black text-white shadow-2xl">
                {appFlow.stepLabel}
              </div>
            </div>
          </div>

          <div className="mt-20 grid gap-8 lg:grid-cols-4">
            {appFlow.steps.map((step, index) => (
              <article
                key={step.number}
                className={[
                  'group relative overflow-hidden rounded-[38px] border border-black/10 bg-[#F7F7F7] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_34px_90px_rgba(72,159,42,0.22)]',
                  index === 1 ? 'lg:mt-16' : '',
                  index === 2 ? 'lg:mt-6' : '',
                  index === 3 ? 'lg:mt-24' : '',
                ].join(' ')}
              >
                <div className="absolute left-6 top-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#489F2A] text-[15px] font-black text-white shadow-xl">
                  {step.number}
                </div>

                <div className="relative mx-auto flex h-[500px] w-full items-center justify-center overflow-hidden rounded-[30px] bg-white">
                  <div className="absolute inset-x-8 top-5 z-10 h-6 rounded-b-[22px] bg-black/10" />

                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-full w-full rounded-[30px] object-cover object-top transition duration-500 group-hover:scale-[1.035]"
                  />
                </div>

                <div className="pt-7">
                  <h3 className="text-[27px] font-black leading-[1] tracking-[-0.045em] text-black">
                    {step.title}
                  </h3>

                  <p className="mt-4 min-h-[132px] text-[16px] font-semibold leading-7 text-black/58">
                    {step.text}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-[40px] bg-black p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.22)] md:p-10">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.26em] text-[#489F2A]">
                  {appFlow.benefitLabel}
                </p>

                <h3 className="mt-4 max-w-[760px] text-[42px] font-black leading-[0.98] tracking-[-0.05em] md:text-[56px]">
                  {appFlow.benefitTitle}
                </h3>
              </div>

              <div className="rounded-full bg-white px-7 py-4 text-center text-[15px] font-black leading-6 text-black md:max-w-[560px]">
                {appFlow.bottom}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="restaurants"
        className="relative overflow-hidden bg-[#F4F4F4] px-6 py-28 text-black md:px-10"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-[460px] w-[460px] rounded-full bg-[#489F2A]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-black/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
            <div className="relative min-h-[760px] overflow-hidden rounded-[48px] bg-black shadow-[0_34px_110px_rgba(0,0,0,0.26)]">
              <img
                src="/brand/restaurant-partner-handoff.png"
                alt="Ресторан передаёт заказ курьеру JETKIZ"
                className="absolute inset-0 h-full w-full object-cover object-right"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/14" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/22" />

              <div className="absolute bottom-8 left-6 right-6 rounded-[32px] border border-white/55 bg-white/92 p-6 shadow-2xl backdrop-blur-xl">
                <div className="grid gap-4 md:grid-cols-3">
                  {partner.points.map((point) => (
                    <div key={point.title}>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#489F2A] text-[18px] font-black text-white">
                        ✓
                      </div>

                      <h4 className="text-[18px] font-black leading-[1.05] tracking-[-0.035em] text-black">
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

            <div className="flex flex-col justify-between rounded-[48px] bg-white p-8 shadow-[0_30px_100px_rgba(0,0,0,0.12)] md:p-10 lg:p-12">
              <div>
                <p className="mb-6 text-[13px] font-black uppercase tracking-[0.28em] text-[#489F2A]">
                  {partner.eyebrow}
                </p>

                <h2 className="max-w-[760px] text-[50px] font-black leading-[0.92] tracking-[-0.06em] text-black md:text-[72px]">
                  {partner.title}
                </h2>

                <p className="mt-8 max-w-[720px] text-[20px] font-semibold leading-9 text-black/64">
                  {partner.description}
                </p>

                <div className="mt-8 rounded-[30px] border border-[#489F2A]/25 bg-[#489F2A]/8 p-6">
                  <p className="text-[24px] font-black leading-[1.12] tracking-[-0.035em] text-black">
                    {partner.strong}
                  </p>

                  <p className="mt-3 text-[15px] font-bold leading-6 text-black/55">
                    {partner.note}
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex h-[66px] items-center justify-center rounded-full bg-[#489F2A] px-9 text-[17px] font-black text-white shadow-[0_22px_55px_rgba(72,159,42,0.34)] transition hover:-translate-y-1 hover:bg-[#3f8f24]"
                  >
                    {partner.button}
                    <span className="ml-3 transition group-hover:translate-x-1">
                      →
                    </span>
                  </a>

                  <div className="flex h-[66px] items-center rounded-full bg-[#DFDFDF]/70 px-7 text-[16px] font-black text-black/72">
                    {partner.phone}
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-[36px] bg-black p-7 text-white">
                <p className="text-[13px] font-black uppercase tracking-[0.24em] text-[#489F2A]">
                  {partner.registerLabel}
                </p>

                <h3 className="mt-4 text-[34px] font-black leading-[0.96] tracking-[-0.05em] md:text-[44px]">
                  {partner.formTitle}
                </h3>

                <p className="mt-5 text-[17px] font-semibold leading-8 text-white/68">
                  {partner.formText}
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="rounded-[24px] border border-white/12 bg-white/8 px-6 py-5">
                    <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/45">
                      WhatsApp
                    </div>
                    <div className="mt-2 text-[24px] font-black text-white">
                      {partner.phone}
                    </div>
                  </div>

                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-[66px] items-center justify-center rounded-full bg-white px-8 text-[16px] font-black text-black transition hover:-translate-y-1 hover:bg-[#489F2A] hover:text-white"
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
        className="relative overflow-hidden bg-white px-6 py-28 text-black md:px-10"
      >
        <div className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-[#489F2A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-16 h-[520px] w-[520px] rounded-full bg-black/8 blur-3xl" />

        <div className="relative mx-auto max-w-[1540px]">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[48px] bg-black p-8 text-white shadow-[0_34px_110px_rgba(0,0,0,0.24)] md:p-12">
              <p className="mb-6 text-[13px] font-black uppercase tracking-[0.28em] text-[#489F2A]">
                {delivery.eyebrow}
              </p>

              <h2 className="max-w-[760px] text-[54px] font-black leading-[0.92] tracking-[-0.06em] text-white md:text-[78px]">
                {delivery.title}
              </h2>

              <p className="mt-8 max-w-[760px] text-[20px] font-semibold leading-9 text-white/66">
                {delivery.textOne}
              </p>

              <p className="mt-6 max-w-[760px] text-[20px] font-semibold leading-9 text-white/66">
                {delivery.textTwo}
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#order"
                  className="group inline-flex h-[66px] items-center justify-center rounded-full bg-[#489F2A] px-9 text-[17px] font-black text-white shadow-[0_22px_55px_rgba(72,159,42,0.34)] transition hover:-translate-y-1 hover:bg-[#3f8f24]"
                >
                  {delivery.cta}
                  <span className="ml-3 transition group-hover:translate-x-1">
                    →
                  </span>
                </a>

                <div className="flex h-[66px] items-center rounded-full bg-white/10 px-7 text-[16px] font-black text-white/82">
                  {delivery.badge}
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              {delivery.points.map((point) => (
                <div
                  key={point.number}
                  className="rounded-[40px] border border-black/8 bg-[#F7F7F7] p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(72,159,42,0.18)]"
                >
                  <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[#489F2A] text-[24px] font-black text-white shadow-xl">
                    {point.number}
                  </div>

                  <h3 className="text-[34px] font-black leading-none tracking-[-0.045em] text-black">
                    {point.title}
                  </h3>

                  <p className="mt-5 max-w-[640px] text-[18px] font-semibold leading-8 text-black/60">
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-[40px] border border-black/8 bg-[#DFDFDF]/45 p-7 text-center shadow-[0_20px_70px_rgba(0,0,0,0.06)]">
            <p className="text-[18px] font-black leading-8 text-black/72">
              {delivery.bottom}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}