'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type FinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'year' | 'custom';

type FinanceOverview = {
  period?: { start?: string; end?: string };
  summary?: Record<string, unknown>;
  byDay?: Array<Record<string, unknown>>;
  restaurants?: {
    totals?: Record<string, unknown>;
    rows?: Array<Record<string, unknown>>;
  };
  couriers?: {
    totals?: Record<string, unknown>;
    rows?: Array<Record<string, unknown>>;
  };
  orders?: {
    rows?: Array<Record<string, unknown>>;
  };
  problemOrders?: {
    count?: number;
    rows?: Array<Record<string, unknown>>;
  };
};

const PERIODS: Array<{ value: FinancePeriod; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'custom', label: 'Свой период' },
];

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function money(value: unknown): string {
  return `${Math.round(n(value)).toLocaleString('ru-RU')} ₸`;
}

function dateOnly(value: unknown): string {
  const raw = text(value);
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function dateTime(value: unknown): string {
  const raw = text(value);
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Не удалось загрузить финансовые данные';
}

function orderNumber(row: Record<string, unknown>) {
  const number = n(row.number);
  return number > 0 ? `№${number}` : 'Заказ';
}

function restaurantName(row: Record<string, unknown>) {
  const restaurant = (row.restaurant ?? {}) as Record<string, unknown>;
  return text(restaurant.nameRu) || text(restaurant.nameKk) || 'Ресторан';
}

function courierName(row: Record<string, unknown>) {
  const courier = (row.courier ?? {}) as Record<string, unknown>;
  const full = `${text(courier.lastName)} ${text(courier.firstName)}`.trim();
  return full || 'Курьер';
}

function translateReason(reason: string) {
  const exact: Record<string, string> = {
    'DELIVERED order has no deliveredAt': 'Доставленный заказ не имеет времени доставки',
    'delivered order is not financially eligible': 'Заказ больше нельзя учитывать в новой выплате',
    'delivered order payment was refunded': 'Оплата доставленного заказа возвращена клиенту',
    'refund happened after restaurant payout was paid': 'Возврат произошёл после выплаты ресторану',
    'refund happened after courier payout was paid': 'Возврат произошёл после выплаты курьеру',
    'total does not match subtotal + deliveryFee - discounts': 'Итог заказа не сходится с товарами, доставкой и скидками',
    'restaurant commission exceeds subtotal': 'Комиссия ресторана больше стоимости товаров',
    'restaurant payout snapshot is inconsistent': 'Сумма к выплате ресторану не сходится',
    'courier payout snapshot is inconsistent': 'Сумма к выплате курьеру не сходится',
  };
  return exact[reason] ?? reason;
}

function reasons(row: Record<string, unknown>) {
  const list = Array.isArray(row.reasons) ? row.reasons : [];
  return list.map((item) => translateReason(String(item)));
}

export function FinanceOverviewPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<FinancePeriod>('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = async () => {
    if (period === 'custom' && (!from || !to)) {
      setData(null);
      setError('Укажите обе даты для своего периода');
      setLoading(false);
      return;
    }

    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        params.set('from', from);
        params.set('to', to);
      }
      const result = await apiFetch(`/finance/admin/overview?${params.toString()}`, {
        cache: 'no-store',
      });
      if (version !== requestVersion.current) return;
      setData(result as FinanceOverview);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setData(null);
      setError(errorMessage(error));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to]);

  const summary = data?.summary ?? {};
  const restaurantRows = data?.restaurants?.rows ?? [];
  const courierRows = data?.couriers?.rows ?? [];
  const orderRows = data?.orders?.rows ?? [];
  const problemRows = data?.problemOrders?.rows ?? [];
  const dayRows = data?.byDay ?? [];

  const economics = useMemo(() => {
    const customerTurnover = n(summary.customerTurnover ?? summary.netCollected);
    const restaurantPayout = n(summary.restaurantPayoutAmount);
    const courierPayout = n(summary.courierPayoutAmount);
    const platformResult = n(
      summary.platformResult ??
        summary.reconciledPlatformResult ??
        customerTurnover - restaurantPayout - courierPayout,
    );
    return {
      orders: n(summary.deliveredOrdersCount),
      customerTurnover,
      subtotal: n(summary.foodSubtotal),
      delivery: n(summary.clientDeliveryFee),
      promo: n(summary.platformPromoCost ?? summary.discountsTotal),
      restaurantCommission: n(summary.restaurantCommissionAmount),
      restaurantPayout,
      courierGross: n(summary.courierFeeGrossAmount),
      courierCommission: n(summary.courierCommissionAmount),
      courierPayout,
      platformResult,
      reconciliationDelta: n(summary.reconciliationDelta),
    };
  }, [summary]);

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Финансы JETKIZ</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
              Контроль денег от оплаты клиента до обязательств перед рестораном и курьером.
              Скидки показываются как расход JETKIZ, а возвраты вынесены в отдельные проблемы.
            </p>
            {data?.period ? (
              <div className="mt-2 text-xs text-gray-500">
                {dateOnly(data.period.start)} — {dateOnly(data.period.end)}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as FinancePeriod)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {PERIODS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Обновить
            </button>
            <button
              type="button"
              onClick={() => router.push('/layout-20/payouts/restaurants')}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Выплаты ресторанам
            </button>
            <button
              type="button"
              onClick={() => router.push('/layout-20/payouts/couriers')}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Выплаты курьерам
            </button>
            <button
              type="button"
              onClick={() => router.push('/layout-20/finance')}
              className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Тарифы и комиссии
            </button>
          </div>
        </div>

        {period === 'custom' ? (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            <DateField label="С даты" value={from} onChange={setFrom} />
            <DateField label="По дату" value={to} onChange={setTo} />
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Загрузка финансов…</div>
      ) : data ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
            <Metric label="Доставлено" value={String(economics.orders)} />
            <Metric label="Получено от клиентов" value={money(economics.customerTurnover)} />
            <Metric label="Скидки за счёт JETKIZ" value={money(economics.promo)} tone={economics.promo > 0 ? 'orange' : 'default'} />
            <Metric label="Ресторану начислено" value={money(economics.restaurantPayout)} />
            <Metric label="Курьеру начислено" value={money(economics.courierPayout)} />
            <Metric label="Комиссия ресторанов" value={money(economics.restaurantCommission)} />
            <Metric label="Комиссия курьеров" value={money(economics.courierCommission)} />
            <Metric
              label="Результат JETKIZ"
              value={money(economics.platformResult)}
              tone={economics.platformResult < 0 ? 'red' : 'green'}
            />
          </section>

          {economics.reconciliationDelta !== 0 ? (
            <section className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900">
              <div className="font-semibold">Финансовое расхождение: {money(economics.reconciliationDelta)}</div>
              <div className="mt-1 text-sm">
                Сумма по формуле комиссий не совпала с фактическими деньгами клиента минус обязательства.
                Не проводите выплаты по проблемным заказам до проверки.
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              Контрольное равенство сходится: деньги клиента − ресторану − курьеру = результат JETKIZ.
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-2">
            <Panel title="Движение денег по дням" subtitle="Фактический результат после скидок">
              <DayTable rows={dayRows} />
            </Panel>
            <Panel
              title="Финансовые исключения"
              subtitle="Возвраты и несогласованные суммы требуют ручной проверки"
              right={
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${problemRows.length ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {problemRows.length ? `${problemRows.length} требуют внимания` : 'Проблем нет'}
                </span>
              }
            >
              <Problems rows={problemRows} />
            </Panel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Panel title="Рестораны" subtitle="Начисления и невыплаченные обязательства">
              <EntityTable kind="restaurant" rows={restaurantRows} />
            </Panel>
            <Panel title="Курьеры" subtitle="Начисления и невыплаченные обязательства">
              <EntityTable kind="courier" rows={courierRows} />
            </Panel>
          </section>

          <Panel title="Последние доставленные заказы" subtitle="Экономика каждого заказа должна сходиться отдельно">
            <Orders rows={orderRows} />
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'red' | 'orange' }) {
  const toneClass =
    tone === 'green'
      ? 'text-emerald-700'
      : tone === 'red'
        ? 'text-red-700'
        : tone === 'orange'
          ? 'text-orange-700'
          : 'text-gray-950';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs leading-4 text-gray-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children, right }: { title: string; subtitle: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">{subtitle}</p>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DayTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <Empty text="Нет данных по дням" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr><th className="px-2 py-2 text-left">Дата</th><th className="px-2 py-2 text-right">Заказы</th><th className="px-2 py-2 text-right">От клиентов</th><th className="px-2 py-2 text-right">JETKIZ</th></tr>
        </thead>
        <tbody>
          {rows.slice(-14).map((row, index) => {
            const result = n(row.platformResult ?? row.platformGrossRevenue);
            return (
              <tr key={`${text(row.date)}-${index}`} className="border-t border-gray-100">
                <td className="px-2 py-2">{dateOnly(row.date)}</td>
                <td className="px-2 py-2 text-right">{n(row.deliveredOrdersCount ?? row.ordersCount)}</td>
                <td className="px-2 py-2 text-right">{money(row.total ?? row.customerTurnover)}</td>
                <td className={`px-2 py-2 text-right font-semibold ${result < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{money(result)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Problems({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <Empty text="Финансовых исключений за период не найдено" />;
  return (
    <div className="max-h-[420px] space-y-2 overflow-auto">
      {rows.map((row, index) => (
        <div key={`${text(row.id)}-${index}`} className="rounded-xl border border-red-100 bg-red-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">{orderNumber(row)} · {restaurantName(row)}</div>
            <div className="text-xs text-gray-500">{dateTime(row.deliveredAt)}</div>
          </div>
          <div className="mt-2 space-y-1">
            {reasons(row).map((reason, reasonIndex) => (
              <div key={`${reason}-${reasonIndex}`} className="text-xs leading-5 text-red-800">• {reason}</div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span>Клиент: {money(row.total)}</span>
            <span>Ресторан: {money(row.restaurantPayoutAmount)}</span>
            <span>Курьер: {money(row.courierFee)}</span>
            <span>Оплата: {text(row.paymentStatus) || '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityTable({ kind, rows }: { kind: 'restaurant' | 'courier'; rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <Empty text="Нет начислений за период" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs text-gray-500"><tr><th className="px-2 py-2 text-left">{kind === 'restaurant' ? 'Ресторан' : 'Курьер'}</th><th className="px-2 py-2 text-right">Заказы</th><th className="px-2 py-2 text-right">Начислено</th><th className="px-2 py-2 text-right">К выплате</th></tr></thead>
        <tbody>
          {rows.slice(0, 20).map((row, index) => {
            const entity = (kind === 'restaurant' ? row.restaurant : row.courier) as Record<string, unknown> | undefined;
            const name = kind === 'restaurant'
              ? text(entity?.nameRu) || text(entity?.nameKk) || 'Ресторан'
              : `${text(entity?.lastName)} ${text(entity?.firstName)}`.trim() || 'Курьер';
            return (
              <tr key={`${text(entity?.id ?? entity?.userId)}-${index}`} className="border-t border-gray-100">
                <td className="px-2 py-2 font-medium text-gray-900">{name}</td>
                <td className="px-2 py-2 text-right">{n(row.deliveredOrdersCount)}</td>
                <td className="px-2 py-2 text-right">{money(row.accruedPayoutAmount)}</td>
                <td className="px-2 py-2 text-right font-semibold text-orange-600">{money(row.pendingPayoutAmount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Orders({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <Empty text="Нет доставленных заказов за период" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr><th className="px-3 py-2 text-left">Заказ</th><th className="px-3 py-2 text-left">Ресторан</th><th className="px-3 py-2 text-left">Курьер</th><th className="px-3 py-2 text-right">Клиент</th><th className="px-3 py-2 text-right">Скидки</th><th className="px-3 py-2 text-right">Ресторану</th><th className="px-3 py-2 text-right">Курьеру</th><th className="px-3 py-2 text-right">JETKIZ</th></tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, index) => {
            const result = n(row.platformResult ?? row.platformGrossRevenue);
            return (
              <tr key={`${text(row.id)}-${index}`} className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-900">{orderNumber(row)}</td>
                <td className="px-3 py-2">{restaurantName(row)}</td>
                <td className="px-3 py-2">{courierName(row)}</td>
                <td className="px-3 py-2 text-right">{money(row.total)}</td>
                <td className="px-3 py-2 text-right text-orange-700">{money(n(row.discountAmount) + n(row.deliveryDiscountAmount))}</td>
                <td className="px-3 py-2 text-right">{money(row.restaurantPayoutAmount)}</td>
                <td className="px-3 py-2 text-right">{money(row.courierFee)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${result < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{money(result)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-gray-600">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </label>
  );
}

function Empty({ text: value }: { text: string }) {
  return <div className="py-8 text-center text-sm text-gray-500">{value}</div>;
}
