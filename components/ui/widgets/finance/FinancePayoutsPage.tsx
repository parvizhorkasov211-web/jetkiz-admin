'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type FinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type Scope = 'pending' | 'assigned' | 'paid' | 'all';
type PayoutKind = 'restaurant' | 'courier';

type PaidByAdmin = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
} | null;

type PayoutHistory = {
  id: string;
  periodFrom: string;
  periodTo: string;
  ordersCount: number;
  payoutAmount: number;
  status: string;
  paidAt: string | null;
  note: string | null;
  paymentReference?: string | null;
  paymentComment?: string | null;
  paidByAdmin?: PaidByAdmin;
  createdAt: string;
};

type PeriodInfo = {
  key?: FinancePeriod;
  start: string;
  end: string;
};

type RestaurantSummary = {
  period: PeriodInfo;
  restaurants: Array<{
    restaurant: {
      id: string;
      nameRu: string;
      nameKk: string;
      number: number;
    };
    deliveredOrdersCount: number;
    grossSubtotal: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
    lastDeliveredAt: string | null;
    lastPaidAt: string | null;
    payouts: PayoutHistory[];
  }>;
};

type CourierSummary = {
  period: PeriodInfo;
  couriers: Array<{
    courier: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      phone?: string | null;
    };
    deliveredOrdersCount: number;
    courierFeeGrossAmount: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
    lastDeliveredAt: string | null;
    lastPaidAt: string | null;
    payouts?: PayoutHistory[];
  }>;
};

type DisplayRow = {
  id: string;
  name: string;
  subtitle: string;
  orders: number;
  gross: number;
  commission: number;
  accrued: number;
  pending: number;
  assigned: number;
  paid: number;
  lastDeliveredAt: string | null;
  lastPaidAt: string | null;
  payouts: PayoutHistory[];
};

type CreateTarget = {
  id: string;
  name: string;
  amount: number;
} | null;

type PayTarget = {
  payoutId: string;
  name: string;
  amount: number;
} | null;

const PERIODS: Array<{ value: FinancePeriod; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'custom', label: 'Свой период' },
];

const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: 'all', label: 'Все начисления' },
  { value: 'pending', label: 'К выплате' },
  { value: 'assigned', label: 'Сформированы' },
  { value: 'paid', label: 'Выплачены' },
];

function money(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString('ru-RU')} ₸`;
}

function dateOnly(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function dateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

function adminName(admin: PaidByAdmin) {
  if (!admin) return '—';
  const name = `${admin.lastName ?? ''} ${admin.firstName ?? ''}`.trim();
  return name || admin.email || admin.phone || '—';
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function statusLabel(status: string) {
  if (status === 'PAID') return 'Выплачено';
  if (status === 'PENDING') return 'Ожидает оплаты';
  if (status === 'CANCELED') return 'Отменено';
  return status;
}

function buildQuery(period: FinancePeriod, from: string, to: string) {
  const params = new URLSearchParams({ period });
  if (period === 'custom') {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
  }
  return params;
}

function adaptRows(kind: PayoutKind, data: RestaurantSummary | CourierSummary | null): DisplayRow[] {
  if (!data) return [];

  if (kind === 'restaurant') {
    return (data as RestaurantSummary).restaurants.map((row) => ({
      id: row.restaurant.id,
      name: row.restaurant.nameRu || row.restaurant.nameKk || `Ресторан №${row.restaurant.number}`,
      subtitle: `Ресторан №${row.restaurant.number}`,
      orders: row.deliveredOrdersCount,
      gross: row.grossSubtotal,
      commission: row.commissionAmount,
      accrued: row.accruedPayoutAmount,
      pending: row.pendingPayoutAmount,
      assigned: row.unpaidButAssignedAmount,
      paid: row.paidPayoutAmount,
      lastDeliveredAt: row.lastDeliveredAt,
      lastPaidAt: row.lastPaidAt,
      payouts: row.payouts ?? [],
    }));
  }

  return (data as CourierSummary).couriers.map((row) => {
    const fullName = `${row.courier.lastName ?? ''} ${row.courier.firstName ?? ''}`.trim();
    return {
      id: row.courier.userId,
      name: fullName || 'Курьер',
      subtitle: row.courier.phone || 'Телефон не указан',
      orders: row.deliveredOrdersCount,
      gross: row.courierFeeGrossAmount,
      commission: row.commissionAmount,
      accrued: row.accruedPayoutAmount,
      pending: row.pendingPayoutAmount,
      assigned: row.unpaidButAssignedAmount,
      paid: row.paidPayoutAmount,
      lastDeliveredAt: row.lastDeliveredAt,
      lastPaidAt: row.lastPaidAt,
      payouts: row.payouts ?? [],
    };
  });
}

export function FinancePayoutsPage({ kind }: { kind: PayoutKind }) {
  const isRestaurant = kind === 'restaurant';
  const [period, setPeriod] = useState<FinancePeriod>('today');
  const [scope, setScope] = useState<Scope>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<RestaurantSummary | CourierSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget>(null);
  const [payTarget, setPayTarget] = useState<PayTarget>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentComment, setPaymentComment] = useState('');
  const requestVersion = useRef(0);

  const endpointBase = isRestaurant ? 'restaurant-payouts' : 'courier-payouts';

  const load = async () => {
    if (period === 'custom' && (!from || !to)) {
      setData(null);
      setLoading(false);
      setError('Укажите начало и конец периода');
      return;
    }

    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setError(null);
      const params = buildQuery(period, from, to);
      const response = await apiFetch(
        `/finance/${endpointBase}/summary?${params.toString()}`,
        { cache: 'no-store' },
      );
      if (version !== requestVersion.current) return;
      setData(response as RestaurantSummary | CourierSummary);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setData(null);
      setError(errorMessage(error, 'Не удалось загрузить выплаты'));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, kind]);

  const rows = useMemo(() => {
    const source = adaptRows(kind, data);
    if (scope === 'pending') return source.filter((row) => row.pending > 0);
    if (scope === 'assigned') return source.filter((row) => row.assigned > 0);
    if (scope === 'paid') return source.filter((row) => row.paid > 0);
    return source.filter((row) => row.accrued > 0);
  }, [kind, data, scope]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          orders: acc.orders + row.orders,
          gross: acc.gross + row.gross,
          commission: acc.commission + row.commission,
          pending: acc.pending + row.pending,
          assigned: acc.assigned + row.assigned,
          paid: acc.paid + row.paid,
          accrued: acc.accrued + row.accrued,
        }),
        { orders: 0, gross: 0, commission: 0, pending: 0, assigned: 0, paid: 0, accrued: 0 },
      ),
    [rows],
  );

  const scopeAmount =
    scope === 'pending'
      ? totals.pending
      : scope === 'assigned'
        ? totals.assigned
        : scope === 'paid'
          ? totals.paid
          : totals.accrued;

  const confirmCreate = async () => {
    if (!createTarget || !data?.period?.start || !data?.period?.end) return;
    try {
      setSubmitting(createTarget.id);
      setError(null);
      const body = isRestaurant
        ? {
            restaurantId: createTarget.id,
            periodFrom: data.period.start,
            periodTo: data.period.end,
            note: null,
          }
        : {
            courierUserId: createTarget.id,
            periodFrom: data.period.start,
            periodTo: data.period.end,
            note: null,
          };

      await apiFetch(`/finance/${endpointBase}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setCreateTarget(null);
      await load();
    } catch (error) {
      setError(errorMessage(error, 'Не удалось сформировать выплату'));
    } finally {
      setSubmitting(null);
    }
  };

  const confirmPay = async () => {
    if (!payTarget) return;
    const reference = paymentReference.trim();
    if (!reference) {
      setError('Укажите номер банковской операции или платёжного документа');
      return;
    }

    try {
      setSubmitting(payTarget.payoutId);
      setError(null);
      await apiFetch(`/finance/${endpointBase}/${payTarget.payoutId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentReference: reference,
          paymentComment: paymentComment.trim() || null,
        }),
      });
      setPayTarget(null);
      setPaymentReference('');
      setPaymentComment('');
      await load();
    } catch (error) {
      setError(errorMessage(error, 'Не удалось подтвердить выплату'));
    } finally {
      setSubmitting(null);
    }
  };

  const exportExcel = async () => {
    try {
      setError(null);
      const params = buildQuery(period, from, to);
      params.set('scope', scope);
      const response = await fetch(
        `/api/proxy/finance/${endpointBase}/export?${params.toString()}`,
        { method: 'GET', credentials: 'include', cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`Не удалось выгрузить Excel (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${isRestaurant ? 'restaurant' : 'courier'}-payouts-${period}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(errorMessage(error, 'Не удалось выгрузить Excel'));
    }
  };

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              {isRestaurant ? 'Выплаты ресторанам' : 'Выплаты курьерам'}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
              Суммы формируются только из доставленных финансово допустимых заказов.
              Перед отметкой «Выплачено» backend повторно сверяет состав и сумму выплаты.
            </p>
            {data?.period ? (
              <div className="mt-2 text-xs text-gray-500">
                Фактический период: {dateOnly(data.period.start)} — {dateOnly(data.period.end)}
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
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as Scope)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {SCOPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Обновить
            </button>
            <button
              type="button"
              onClick={() => void exportExcel()}
              className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Выгрузить Excel
            </button>
          </div>
        </div>

        {period === 'custom' ? (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            <label className="text-xs font-medium text-gray-600">
              С даты
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              По дату
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label={isRestaurant ? 'Ресторанов' : 'Курьеров'} value={String(rows.length)} />
        <Metric label="Доставленных заказов" value={String(totals.orders)} />
        <Metric label={isRestaurant ? 'Сумма блюд' : 'База курьеров'} value={money(totals.gross)} />
        <Metric label="Комиссия JETKIZ" value={money(totals.commission)} />
        <Metric label="По выбранному фильтру" value={money(scopeAmount)} emphasis />
        <Metric label="Уже выплачено" value={money(totals.paid)} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm font-semibold text-gray-800">Нет данных за выбранный период</div>
            <div className="mt-1 text-xs text-gray-500">Измените период или фильтр выплат.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{isRestaurant ? 'Ресторан' : 'Курьер'}</th>
                  <th className="px-4 py-3 text-right font-semibold">Заказы</th>
                  <th className="px-4 py-3 text-right font-semibold">Начислено</th>
                  <th className="px-4 py-3 text-right font-semibold">К выплате</th>
                  <th className="px-4 py-3 text-right font-semibold">Сформировано</th>
                  <th className="px-4 py-3 text-right font-semibold">Выплачено</th>
                  <th className="px-4 py-3 text-right font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    expanded={expandedId === row.id}
                    submitting={submitting === row.id}
                    onToggle={() => setExpandedId((current) => (current === row.id ? null : row.id))}
                    onCreate={() => setCreateTarget({ id: row.id, name: row.name, amount: row.pending })}
                    onPay={(payout) => {
                      setPayTarget({ payoutId: payout.id, name: row.name, amount: payout.payoutAmount });
                      setPaymentReference('');
                      setPaymentComment('');
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createTarget ? (
        <Modal title="Сформировать выплату" onClose={() => submitting ? undefined : setCreateTarget(null)}>
          <p className="text-sm text-gray-600">
            {createTarget.name}: в новую выплату попадут только ещё не привязанные доставленные заказы выбранного периода.
          </p>
          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
            <div className="text-xs text-gray-500">Ориентировочно доступно сейчас</div>
            <div className="mt-1 text-2xl font-semibold text-gray-950">{money(createTarget.amount)}</div>
          </div>
          <ModalActions
            busy={Boolean(submitting)}
            onCancel={() => setCreateTarget(null)}
            onConfirm={() => void confirmCreate()}
            confirmLabel="Сформировать"
          />
        </Modal>
      ) : null}

      {payTarget ? (
        <Modal title="Подтвердить фактическую выплату" onClose={() => submitting ? undefined : setPayTarget(null)}>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm font-medium text-gray-800">{payTarget.name}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-950">{money(payTarget.amount)}</div>
          </div>
          <label className="mt-4 block text-sm font-medium text-gray-700">
            Номер банковской операции / платёжного документа
            <input
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              maxLength={200}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              placeholder="Обязательное поле"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-gray-700">
            Комментарий
            <textarea
              value={paymentComment}
              onChange={(event) => setPaymentComment(event.target.value)}
              className="mt-2 min-h-20 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              placeholder="Необязательно"
            />
          </label>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            Нажимайте «Подтвердить выплату» только после фактического перевода денег. Повторное использование номера банковской операции backend отклонит.
          </div>
          <ModalActions
            busy={Boolean(submitting)}
            onCancel={() => setPayTarget(null)}
            onConfirm={() => void confirmPay()}
            confirmLabel="Подтвердить выплату"
          />
        </Modal>
      ) : null}
    </div>
  );
}

function Row({
  row,
  expanded,
  submitting,
  onToggle,
  onCreate,
  onPay,
}: {
  row: DisplayRow;
  expanded: boolean;
  submitting: boolean;
  onToggle: () => void;
  onCreate: () => void;
  onPay: (payout: PayoutHistory) => void;
}) {
  return (
    <>
      <tr className="border-t border-gray-100 align-top">
        <td className="px-4 py-3">
          <div className="font-semibold text-gray-900">{row.name}</div>
          <div className="mt-0.5 text-xs text-gray-500">{row.subtitle}</div>
          <button type="button" onClick={onToggle} className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            {expanded ? 'Скрыть историю' : `История выплат (${row.payouts.length})`}
          </button>
        </td>
        <td className="px-4 py-3 text-right text-gray-700">{row.orders}</td>
        <td className="px-4 py-3 text-right font-medium text-gray-900">{money(row.accrued)}</td>
        <td className="px-4 py-3 text-right font-semibold text-orange-600">{money(row.pending)}</td>
        <td className="px-4 py-3 text-right text-gray-700">{money(row.assigned)}</td>
        <td className="px-4 py-3 text-right font-medium text-emerald-700">{money(row.paid)}</td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onCreate}
            disabled={submitting || row.pending <= 0}
            className="rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Сформировать выплату
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-gray-100 bg-gray-50/70">
          <td colSpan={7} className="px-4 py-4">
            {row.payouts.length === 0 ? (
              <div className="text-xs text-gray-500">Выплат ещё нет.</div>
            ) : (
              <div className="space-y-2">
                {row.payouts.map((payout) => (
                  <div key={payout.id} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto] md:items-center">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">
                        {dateOnly(payout.periodFrom)} — {dateOnly(payout.periodTo)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{payout.ordersCount} заказов</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Сумма</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{money(payout.payoutAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Статус</div>
                      <div className="mt-1 text-xs font-semibold text-gray-800">{statusLabel(payout.status)}</div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {payout.status === 'PAID' ? (
                        <>
                          <div>{dateTime(payout.paidAt)}</div>
                          <div className="mt-1">Операция: {payout.paymentReference || '—'}</div>
                          <div className="mt-1">Подтвердил: {adminName(payout.paidByAdmin ?? null)}</div>
                        </>
                      ) : (
                        <div>Создано: {dateTime(payout.createdAt)}</div>
                      )}
                    </div>
                    <div className="text-right">
                      {payout.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => onPay(payout)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Отметить выплаченной
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${emphasis ? 'text-orange-600' : 'text-gray-950'}`}>{value}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void | undefined }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  busy,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
        Отмена
      </button>
      <button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? 'Подождите…' : confirmLabel}
      </button>
    </div>
  );
}
