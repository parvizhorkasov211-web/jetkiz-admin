'use client';

import { useState, type ReactNode } from 'react';

type Locale = 'ru' | 'kk';

type LegalKey = 'offer' | 'refund' | 'privacy' | 'delivery' | 'licenses';

const PHONE_DISPLAY = '+7 708 681 06 93';
const PHONE_RAW = '77086810693';

const WHATSAPP_LINK = `https://wa.me/${PHONE_RAW}?text=Здравствуйте!%20Хочу%20подключить%20ресторан%20к%20JETKIZ`;

const company = {
  name: 'ТОО “JETKIZ DIGITAL SYSTEMS”',
  bin: '260540025332',
  address:
    'Республика Казахстан, Акмолинская область, Бурабайский район, г. Щучинск, ул. Интернациональная, дом 49',
  phone: PHONE_DISPLAY,
};

const ru = {
  navHow: 'Как работает',
  navDelivery: 'Доставка',
  navRestaurants: 'Ресторанам',
  navDocs: 'Документы',
  badge: 'JETKIZ · доставка еды в Щучинске',
  title: 'Заказывайте еду из ресторанов города',
  description:
    'JETKIZ помогает быстро выбрать ресторан, оформить заказ, выбрать доставку или самовывоз и отслеживать статус заказа в приложении.',
  cta: 'Сделать заказ',
  partnerCta: 'Подключить ресторан',
};

const kk = {
  navHow: 'Қалай жұмыс істейді',
  navDelivery: 'Жеткізу',
  navRestaurants: 'Мейрамханаларға',
  navDocs: 'Құжаттар',
  badge: 'JETKIZ · Щучинск қаласында тағам жеткізу',
  title: 'Қала мейрамханаларынан тағамға тапсырыс беріңіз',
  description:
    'JETKIZ мейрамхананы таңдауға, тапсырыс рәсімдеуге, жеткізу немесе алып кетуді таңдауға және тапсырыс мәртебесін бақылауға көмектеседі.',
  cta: 'Тапсырыс беру',
  partnerCta: 'Мейрамхананы қосу',
};

const legalItems: Array<{ key: LegalKey; title: string }> = [
  { key: 'offer', title: 'Публичная оферта / пользовательское соглашение' },
  { key: 'refund', title: 'Возврат и отмена заказа' },
  { key: 'privacy', title: 'Политика конфиденциальности' },
  { key: 'delivery', title: 'Доставка и самовывоз' },
  { key: 'licenses', title: 'Лицензии и разрешения' },
];

const services = [
  {
    title: 'Онлайн-заказ еды',
    price: 'Цена: по меню ресторана',
    text: 'Клиент выбирает ресторан, добавляет блюда в корзину и оформляет заказ через сервис JETKIZ.',
  },
  {
    title: 'Доставка курьером',
    price: 'Цена: отображается до подтверждения заказа',
    text: 'Стоимость доставки зависит от зоны обслуживания, адреса и условий заказа. Итоговая сумма показывается заранее.',
  },
  {
    title: 'Самовывоз',
    price: 'Цена: бесплатно, если ресторан поддерживает самовывоз',
    text: 'Клиент может самостоятельно забрать заказ из ресторана после подтверждения готовности.',
  },
  {
    title: 'Сервисный сбор',
    price: 'Цена: если применяется, отображается до оплаты',
    text: 'Сервисный сбор может применяться за использование платформы и всегда показывается до подтверждения заказа.',
  },
];

const appSteps = [
  {
    number: '01',
    title: 'Выберите ресторан',
    text: 'Откройте приложение и выберите ресторан из доступного списка.',
    image: '/brand/client-home.png',
  },
  {
    number: '02',
    title: 'Соберите корзину',
    text: 'Добавьте блюда, измените количество и проверьте итоговую сумму.',
    image: '/brand/client-cart.png',
  },
  {
    number: '03',
    title: 'Оформите заказ',
    text: 'Выберите доставку или самовывоз, проверьте адрес и подтвердите заказ.',
    image: '/brand/client-checkout.png',
  },
  {
    number: '04',
    title: 'Следите за статусом',
    text: 'После оформления ресторан начнёт приготовление, а статус будет виден в приложении.',
    image: '/brand/client-order-success.png',
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#489F2A] sm:text-[13px]">
      {children}
    </p>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-black/10 bg-white px-4 text-center text-[12px] font-black leading-4 text-black shadow-sm sm:min-h-[42px] sm:px-5 sm:text-[13px]">
      {children}
    </span>
  );
}

function LegalText({ type }: { type: LegalKey }) {
  if (type === 'offer') {
    return (
      <div className="space-y-4">
        <p>
          Настоящая публичная оферта определяет условия использования сервиса
          JETKIZ, включая сайт, мобильное приложение и иные цифровые каналы
          сервиса.
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
          JETKIZ предоставляет цифровой сервис для выбора ресторана, оформления
          заказа, передачи заказа ресторану, организации доставки или
          самовывоза, а также отображения статуса заказа.
        </p>
        <p>
          Стоимость заказа формируется из стоимости блюд по меню ресторана,
          стоимости доставки, скидок, возможного сервисного сбора и иных
          параметров, отображаемых до подтверждения заказа.
        </p>
        <p>
          Заказ считается оформленным после подтверждения пользователем данных
          заказа. Если доступна онлайн-оплата, заказ подтверждается после
          успешного завершения платежа.
        </p>
        <p>
          JETKIZ вправе отказать в оформлении или исполнении заказа, если
          ресторан недоступен, товар отсутствует, адрес находится вне зоны
          обслуживания, оплата не прошла или возникла техническая ошибка.
        </p>
        <p>
          Все обращения по заказам принимаются по телефону/WhatsApp:{' '}
          {company.phone}.
        </p>
      </div>
    );
  }

  if (type === 'refund') {
    return (
      <div className="space-y-4">
        <p>
          Пользователь может отменить заказ до начала приготовления, если
          ресторан ещё не принял заказ в работу.
        </p>
        <p>
          После начала приготовления отмена заказа рассматривается
          индивидуально, так как еда готовится под конкретный заказ.
        </p>
        <p>
          Если заказ был оплачен онлайн, а отмена подтверждена сервисом, возврат
          производится на карту, с которой была совершена оплата. Срок
          поступления денег зависит от банка клиента и платёжной организации.
        </p>
        <p>
          Возврат может быть произведён при технической ошибке оплаты,
          ошибочном списании, невозможности исполнения заказа, существенном
          нарушении состава заказа или иной подтверждённой проблеме.
        </p>
        <p>
          Для рассмотрения возврата пользователь должен предоставить номер
          заказа, номер телефона, описание ситуации и, при наличии, чек или
          подтверждение оплаты.
        </p>
        <p>Обращения принимаются по телефону/WhatsApp: {company.phone}.</p>
      </div>
    );
  }

  if (type === 'privacy') {
    return (
      <div className="space-y-4">
        <p>
          JETKIZ обрабатывает данные, необходимые для работы сервиса: номер
          телефона, имя, адрес доставки, состав заказа, историю заказов, статус
          оплаты и технические данные приложения.
        </p>
        <p>
          Данные используются для регистрации пользователя, оформления и
          исполнения заказов, связи с пользователем, обработки оплат, поддержки,
          улучшения качества сервиса и предотвращения мошенничества.
        </p>
        <p>
          Полные данные банковских карт JETKIZ не хранит. При онлайн-оплате
          платёжные данные обрабатываются на стороне платёжной организации или
          банка-эквайера.
        </p>
        <p>
          Передача данных осуществляется через защищённое соединение. Доступ к
          данным ограничивается только лицами и системами, которым он необходим
          для работы сервиса.
        </p>
        <p>
          Пользователь может обратиться по вопросам обработки данных по
          телефону/WhatsApp: {company.phone}.
        </p>
      </div>
    );
  }

  if (type === 'delivery') {
    return (
      <div className="space-y-4">
        <p>
          Доставка осуществляется в городе Щучинск и доступных зонах
          обслуживания сервиса JETKIZ.
        </p>
        <p>
          Срок доставки зависит от времени приготовления ресторана, расстояния,
          загруженности курьеров, погодных условий и других факторов.
        </p>
        <p>
          Если выбран самовывоз, пользователь самостоятельно забирает заказ из
          ресторана после подтверждения готовности заказа.
        </p>
        <p>
          Пользователь обязан быть доступен по указанному номеру телефона во
          время исполнения заказа.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p>
        Деятельность {company.name} по предоставлению онлайн-сервиса заказа и
        доставки еды не относится к лицензируемым видам деятельности.
      </p>
      <p>
        При изменении законодательства или требований регулирующих органов
        информация на сайте будет обновлена.
      </p>
    </div>
  );
}

export default function PromoPage() {
  const [locale, setLocale] = useState<Locale>('ru');
  const [openLegal, setOpenLegal] = useState<LegalKey | null>(null);

  const t = locale === 'ru' ? ru : kk;

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-white text-black">
      <section className="relative left-1/2 min-h-[860px] w-screen -translate-x-1/2 overflow-hidden bg-black md:min-h-screen">
        <img
          src="/brand/jetkiz-burabay-hero.png"
          alt="JETKIZ доставка еды"
          className="absolute inset-0 h-full w-full object-cover object-[38%_center] md:object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/58 via-black/18 to-white/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-transparent to-black/34" />

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
                className="flex h-full items-center justify-center rounded-full px-4 text-center transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navHow}
              </a>
              <a
                href="#delivery"
                className="flex h-full items-center justify-center rounded-full px-4 text-center transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navDelivery}
              </a>
              <a
                href="#restaurants"
                className="flex h-full items-center justify-center rounded-full px-4 text-center transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navRestaurants}
              </a>
              <a
                href="#docs"
                className="flex h-full items-center justify-center rounded-full px-4 text-center transition hover:bg-[#489F2A] hover:text-white"
              >
                {t.navDocs}
              </a>
            </nav>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLocale((current) => (current === 'ru' ? 'kk' : 'ru'))}
                className="h-[48px] w-[82px] rounded-full bg-white/92 text-[12px] font-black text-black shadow-2xl backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white sm:w-[86px] sm:text-[13px] md:h-[56px] md:w-[106px] md:text-[14px]"
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
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#489F2A] sm:text-[13px]">
            {t.badge}
          </p>

          <h1 className="text-[38px] font-black leading-[0.94] tracking-[-0.055em] text-black sm:text-[46px] md:text-[56px]">
            {t.title}
          </h1>

          <p className="mt-5 text-[16px] font-semibold leading-7 text-black/70 md:mt-6 md:text-[18px] md:leading-8">
            {t.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-3 md:mt-8 md:flex-nowrap">
            <a
              href="#how"
              className="flex h-[60px] w-full items-center justify-center rounded-full bg-[#489F2A] px-5 text-[16px] font-black text-white shadow-[0_18px_45px_rgba(72,159,42,0.38)] transition hover:-translate-y-0.5 hover:bg-[#3f8f24] sm:w-[210px]"
            >
              {t.cta}
            </a>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex h-[60px] w-full items-center justify-center rounded-full bg-[#DFDFDF]/80 px-5 text-[15px] font-black text-black transition hover:-translate-y-0.5 hover:bg-white sm:w-[240px]"
            >
              {t.partnerCta}
            </a>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-black/10 pt-5">
            <div>
              <div className="text-[20px] font-black sm:text-[24px]">2 мин</div>
              <div className="mt-2 text-[11px] font-bold leading-[15px] text-black/55">
                оформить заказ
              </div>
            </div>
            <div>
              <div className="text-[20px] font-black sm:text-[24px]">24/7</div>
              <div className="mt-2 text-[11px] font-bold leading-[15px] text-black/55">
                удобно с телефона
              </div>
            </div>
            <div>
              <div className="text-[20px] font-black sm:text-[24px]">JETKIZ</div>
              <div className="mt-2 text-[11px] font-bold leading-[15px] text-black/55">
                локальный сервис
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="relative overflow-hidden bg-white px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <SectionLabel>Как работает JETKIZ</SectionLabel>
              <h2 className="max-w-[760px] text-[44px] font-black leading-[0.92] tracking-[-0.06em] sm:text-[54px] md:text-[82px]">
                Заказ еды без лишних звонков
              </h2>
            </div>

            <p className="max-w-[660px] text-[17px] font-semibold leading-8 text-black/62 sm:text-[20px] md:leading-9 lg:ml-auto">
              Клиент видит меню, цену, доставку, самовывоз и итоговую сумму до
              подтверждения заказа. Статус заказа отображается в приложении.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-4">
            {appSteps.map((step, index) => (
              <article
                key={step.number}
                className={[
                  'group overflow-hidden rounded-[30px] border border-black/10 bg-[#F7F7F7] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-2 sm:rounded-[38px] sm:p-5',
                  index === 1 ? 'lg:mt-16' : '',
                  index === 2 ? 'lg:mt-6' : '',
                  index === 3 ? 'lg:mt-24' : '',
                ].join(' ')}
              >
                <div className="relative h-[390px] overflow-hidden rounded-[26px] bg-white sm:h-[460px] md:h-[500px]">
                  <div className="absolute left-5 top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#489F2A] text-[13px] font-black text-white shadow-xl">
                    {step.number}
                  </div>

                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.035]"
                  />
                </div>

                <h3 className="mt-6 text-[25px] font-black leading-none tracking-[-0.045em] sm:text-[27px]">
                  {step.title}
                </h3>

                <p className="mt-4 text-[15px] font-semibold leading-7 text-black/58">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="services"
        className="bg-[#F4F4F4] px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <div className="rounded-[34px] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.1)] sm:rounded-[48px] sm:p-8 md:p-12">
              <SectionLabel>Услуги и цены</SectionLabel>
              <h2 className="max-w-[820px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] sm:text-[50px] md:text-[76px]">
                Что получает покупатель
              </h2>
              <p className="mt-7 text-[17px] font-semibold leading-8 text-black/64 sm:text-[19px] md:text-[20px] md:leading-9">
                JETKIZ помогает оформить заказ еды, выбрать способ получения и
                видеть итоговую сумму до подтверждения. Если онлайн-оплата
                доступна, платёж проходит через защищённый платёжный шлюз.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Badge>Меню ресторанов</Badge>
                <Badge>Доставка</Badge>
                <Badge>Самовывоз</Badge>
                <Badge>Статус заказа</Badge>
              </div>
            </div>

            <div className="grid gap-5">
              {services.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.06)] sm:rounded-[34px] sm:p-7"
                >
                  <h3 className="text-[27px] font-black leading-none tracking-[-0.04em] sm:text-[30px]">
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
        id="delivery"
        className="bg-black px-4 py-20 text-white sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <SectionLabel>Доставка и самовывоз</SectionLabel>
              <h2 className="max-w-[860px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] sm:text-[54px] md:text-[82px]">
                Получайте заказ так, как удобно
              </h2>
              <p className="mt-7 max-w-[880px] text-[17px] font-semibold leading-8 text-white/68 sm:text-[19px] md:text-[20px] md:leading-9">
                Заказ можно получить курьерской доставкой или самовывозом, если
                ресторан поддерживает такой способ. Время зависит от
                приготовления, расстояния и загруженности сервиса.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white p-6 text-black shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:rounded-[42px] sm:p-8">
              <h3 className="text-[32px] font-black leading-[0.96] tracking-[-0.05em] sm:text-[36px]">
                Оплата и безопасность
              </h3>

              <div className="mt-7 flex flex-wrap gap-3">
                <Badge>Банковская карта</Badge>
                <Badge>Visa</Badge>
                <Badge>Mastercard</Badge>
                <Badge>3D Secure</Badge>
                <Badge>HTTPS / SSL</Badge>
              </div>

              <div className="mt-8 space-y-4 text-[15px] font-semibold leading-7 text-black/66 sm:text-[16px]">
                <p>
                  Если онлайн-оплата доступна, оплата банковской картой проходит
                  через защищённый платёжный шлюз. JETKIZ не хранит полные
                  данные банковских карт.
                </p>
                <p>
                  После оплаты клиенту рекомендуется сохранить электронный чек,
                  подтверждение транзакции и номер заказа.
                </p>
                <p>
                  При ошибке оплаты заказ может не быть подтверждён до успешного
                  завершения платежа.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="restaurants"
        className="bg-white px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-[1540px]">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="relative min-h-[560px] overflow-hidden rounded-[34px] bg-black shadow-[0_34px_110px_rgba(0,0,0,0.26)] sm:min-h-[680px] sm:rounded-[48px] lg:min-h-[760px]">
              <img
                src="/brand/restaurant-partner-handoff.png"
                alt="Ресторан передаёт заказ курьеру JETKIZ"
                className="absolute inset-0 h-full w-full object-cover object-center sm:object-right"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/44" />
            </div>

            <div className="rounded-[34px] bg-[#F4F4F4] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.08)] sm:rounded-[48px] sm:p-8 md:p-12">
              <SectionLabel>JETKIZ для ресторанов</SectionLabel>
              <h2 className="max-w-[800px] text-[42px] font-black leading-[0.92] tracking-[-0.06em] sm:text-[50px] md:text-[76px]">
                Принимайте заказы онлайн
              </h2>
              <p className="mt-7 text-[17px] font-semibold leading-8 text-black/64 sm:text-[19px] md:text-[20px] md:leading-9">
                Ресторан получает заказ в системе, готовит блюда и передаёт их
                курьеру или клиенту при самовывозе. JETKIZ помогает вести заказ
                по статусам и упрощает работу с клиентами.
              </p>

              <div className="mt-8 grid gap-4">
                {[
                  'Онлайн-заказы из приложения',
                  'Доставка или самовывоз',
                  'Статусы заказа в системе',
                  'Поддержка ресторанов-партнёров',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] bg-white px-5 py-4 text-[16px] font-black text-black shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex h-[62px] w-full items-center justify-center rounded-full bg-[#489F2A] px-8 text-[16px] font-black text-white shadow-[0_22px_55px_rgba(72,159,42,0.34)] transition hover:-translate-y-1 hover:bg-[#3f8f24] sm:w-auto"
              >
                Подключить ресторан
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="docs"
        className="bg-[#F4F4F4] px-4 py-20 text-black sm:px-6 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-[1180px]">
          <SectionLabel>Документы и правила</SectionLabel>
          <h2 className="text-[42px] font-black leading-[0.92] tracking-[-0.06em] sm:text-[54px] md:text-[76px]">
            Информация для пользователей
          </h2>
          <p className="mt-6 max-w-[860px] text-[17px] font-semibold leading-8 text-black/64 sm:text-[19px]">
            Эти разделы размещены для прозрачности работы сервиса: правила
            заказа, возврата, доставки, оплаты и обработки данных.
          </p>

          <div className="mt-10 grid gap-4">
            {legalItems.map((item) => {
              const isOpen = openLegal === item.key;

              return (
                <article
                  key={item.key}
                  className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.07)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenLegal(isOpen ? null : item.key)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7 sm:py-6"
                  >
                    <span className="text-[20px] font-black leading-6 tracking-[-0.03em] text-black sm:text-[24px]">
                      {item.title}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#489F2A] text-[24px] font-black text-white">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-black/10 px-5 py-6 text-[15px] font-semibold leading-7 text-black/68 sm:px-7 sm:text-[16px] sm:leading-8">
                      <LegalText type={item.key} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-[30px] bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.07)] sm:p-8">
            <h3 className="text-[30px] font-black tracking-[-0.04em]">
              Реквизиты и контакты
            </h3>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] bg-[#F4F4F4] p-5">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40">
                  Компания
                </p>
                <p className="mt-2 text-[20px] font-black">{company.name}</p>
              </div>

              <div className="rounded-[22px] bg-[#F4F4F4] p-5">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40">
                  БИН
                </p>
                <p className="mt-2 text-[20px] font-black">{company.bin}</p>
              </div>

              <div className="rounded-[22px] bg-[#F4F4F4] p-5 md:col-span-2">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40">
                  Адрес
                </p>
                <p className="mt-2 text-[20px] font-black leading-8">
                  {company.address}
                </p>
              </div>

              <div className="rounded-[22px] bg-[#F4F4F4] p-5 md:col-span-2">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-black/40">
                  Телефон / WhatsApp
                </p>
                <p className="mt-2 text-[20px] font-black">{company.phone}</p>
              </div>
            </div>
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

              <h2 className="mt-7 text-[30px] font-black leading-none tracking-[-0.04em]">
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
                  HTTPS / SSL
                </span>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-[15px] font-black uppercase tracking-[0.18em] text-white/40">
                  Контакты
                </h3>

                <div className="mt-5 space-y-3 text-[15px] font-semibold leading-6 text-white/68">
                  <p>{company.name}</p>
                  <p>БИН: {company.bin}</p>
                  <p>{company.address}</p>
                  <p>Телефон / WhatsApp: {company.phone}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-black uppercase tracking-[0.18em] text-white/40">
                  Разделы
                </h3>

                <nav className="mt-5 grid gap-3 text-[15px] font-semibold text-white/68">
                  <a href="#how" className="transition hover:text-white">
                    Как работает
                  </a>
                  <a href="#services" className="transition hover:text-white">
                    Услуги и цены
                  </a>
                  <a href="#delivery" className="transition hover:text-white">
                    Доставка и оплата
                  </a>
                  <a href="#restaurants" className="transition hover:text-white">
                    Ресторанам
                  </a>
                  <a href="#docs" className="transition hover:text-white">
                    Документы
                  </a>
                  <a href="#docs" className="transition hover:text-white">
                    Возврат и отмена
                  </a>
                  <a href="#docs" className="transition hover:text-white">
                    Политика конфиденциальности
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