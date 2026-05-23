'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

type FinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'year' | 'custom';
type FinanceTab = 'overview' | 'restaurants' | 'couriers' | 'orders' | 'payouts' | 'problems' | 'settings';
type PayoutKind = 'restaurant' | 'courier';
type PayoutScope = 'all' | 'pending' | 'assigned' | 'paid';

type AnyRecord = Record<string, any>;

type FinanceConfig = {
  clientDeliveryFeeDefault: number;
  clientDeliveryFeeWeather: number;
  courierPayoutDefault: number;
  courierPayoutWeather: number;
  weatherEnabled: boolean;
};

type NormalizedSummary = {
  ordersCount: number;
  customerTurnover: number;
  foodSubtotal: number;
  clientDeliveryFee: number;
  discountsTotal: number;
  restaurantCommissionAmount: number;
  restaurantPayoutAmount: number;
  courierPayoutAmount: number;
  deliveryMargin: number;
  platformRestaurantRevenue: number;
  platformDeliveryRevenue: number;
  platformGrossRevenue: number;
  paidRestaurantPayoutAmount: number;
  paidCourierPayoutAmount: number;
  pendingRestaurantPayoutAmount: number;
  pendingCourierPayoutAmount: number;
};

type NormalizedRestaurantRow = {
  id: string;
  name: string;
  number: number | null;
  deliveredOrdersCount: number;
  foodSubtotal: number;
  commissionAmount: number;
  payoutAmount: number;
  pendingPayoutAmount: number;
  assignedPayoutAmount: number;
  paidPayoutAmount: number;
  lastDeliveredAt: string | null;
  lastPaidAt: string | null;
  raw: AnyRecord;
};

type NormalizedCourierRow = {
  id: string;
  name: string;
  phone: string | null;
  deliveredOrdersCount: number;
  grossAmount: number;
  commissionAmount: number;
  payoutAmount: number;
  pendingPayoutAmount: number;
  assignedPayoutAmount: number;
  paidPayoutAmount: number;
  lastDeliveredAt: string | null;
  lastPaidAt: string | null;
  raw: AnyRecord;
};

type NormalizedOrderRow = {
  id: string;
  number: number | null;
  createdAt: string | null;
  deliveredAt: string | null;
  restaurantName: string | null;
  courierName: string | null;
  status: string | null;
  foodSubtotal: number;
  deliveryFee: number;
  discountsTotal: number;
  total: number;
  restaurantCommissionAmount: number;
  restaurantPayoutAmount: number;
  courierPayoutAmount: number;
  deliveryMargin: number;
  platformGrossRevenue: number;
};

type NormalizedProblemRow = NormalizedOrderRow & {
  reason: string;
};

type NormalizedDayRow = {
  date: string;
  ordersCount: number;
  customerTurnover: number;
  foodSubtotal: number;
  deliveryFee: number;
  restaurantCommissionAmount: number;
  restaurantPayoutAmount: number;
  courierPayoutAmount: number;
  deliveryMargin: number;
  platformGrossRevenue: number;
};

type PayoutRow = {
  id: string;
  kind: PayoutKind;
  entityId: string;
  entityName: string;
  phone?: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  ordersCount: number;
  grossAmount: number;
  commissionAmount: number;
  payoutAmount: number;
  status: string;
  paidAt: string | null;
  paymentReference: string | null;
  paymentComment: string | null;
  note: string | null;
  paidByAdminName: string | null;
  createdAt: string | null;
};

type PaymentModalState = {
  kind: PayoutKind;
  payoutId: string;
  entityName: string;
  amount: number;
} | null;

type EditPayoutModalState = {
  payout: PayoutRow;
} | null;

type CreatePayoutModalState = {
  kind: PayoutKind;
  entityId: string;
  entityName: string;
  amount: number;
} | null;

const PERIOD_OPTIONS: Array<{ key: FinancePeriod; label: string }> = [
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'custom', label: 'Свой период' },
];

const TABS: Array<{ key: FinanceTab; label: string }> = [
  { key: 'overview', label: 'Обзор' },
  { key: 'restaurants', label: 'Рестораны' },
  { key: 'couriers', label: 'Курьеры' },
  { key: 'orders', label: 'Заказы' },
  { key: 'payouts', label: 'Выплаты' },
  { key: 'problems', label: 'Проблемы' },
  { key: 'settings', label: 'Настройки тарифов' },
];

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function nullableStr(value: unknown): string | null {
  const result = str(value);
  return result ? result : null;
}

function arr<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function get(source: any, keys: string[]): any {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function getNested(source: any, path: string[]): any {
  let current = source;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function formatMoney(value: number): string {
  return `${Math.round(num(value)).toLocaleString('ru-RU')} ₸`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

function dateInputFromIso(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function datetimeLocalFromIso(value: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function normalizeSummary(overview: any, restaurantSummary: any, courierSummary: any): NormalizedSummary {
  const summary = overview?.summary ?? overview ?? {};
  const totals = overview?.totals ?? {};
  const restaurantTotals = restaurantSummary?.totals ?? {};
  const courierTotals = courierSummary?.totals ?? {};

  const ordersCount = num(
    get(summary, ['ordersCount', 'deliveredOrdersCount', 'ordersDeliveredToday', 'ordersToday']) ??
      get(totals, ['ordersCount', 'deliveredOrdersCount']) ??
      get(restaurantTotals, ['deliveredOrdersCount'])
  );
  const foodSubtotal = num(
    get(summary, ['foodSubtotal', 'subtotal', 'subtotalToday']) ??
      get(totals, ['foodSubtotal', 'subtotal']) ??
      get(restaurantTotals, ['grossSubtotal'])
  );
  const clientDeliveryFee = num(
    get(summary, ['clientDeliveryFee', 'deliveryFee', 'deliveryFeesToday']) ??
      get(totals, ['clientDeliveryFee', 'deliveryFee'])
  );
  const discountsTotal = num(
    get(summary, ['discountsTotal']) ??
      num(get(summary, ['discountAmount', 'discountsToday'])) +
        num(get(summary, ['deliveryDiscountAmount', 'deliveryDiscountsToday']))
  );
  const customerTurnover = num(
    get(summary, ['customerTurnover', 'netCollectedToday', 'total']) ??
      get(totals, ['customerTurnover', 'total'])
  );
  const restaurantCommissionAmount = num(
    get(summary, ['restaurantCommissionAmount', 'restaurantCommissionToday']) ??
      get(totals, ['restaurantCommissionAmount']) ??
      get(restaurantTotals, ['commissionAmount'])
  );
  const restaurantPayoutAmount = num(
    get(summary, ['restaurantPayoutAmount', 'restaurantPayoutsToday']) ??
      get(totals, ['restaurantPayoutAmount']) ??
      get(restaurantTotals, ['accruedPayoutAmount'])
  );
  const courierPayoutAmount = num(
    get(summary, ['courierPayoutAmount', 'courierPayoutsToday', 'courierFee']) ??
      get(totals, ['courierPayoutAmount']) ??
      get(courierTotals, ['accruedPayoutAmount'])
  );
  const platformRestaurantRevenue = num(
    get(summary, ['platformRestaurantRevenue']) ?? restaurantCommissionAmount
  );
  const platformDeliveryRevenue = num(
    get(summary, ['platformDeliveryRevenue']) ?? clientDeliveryFee - courierPayoutAmount
  );
  const platformGrossRevenue = num(
    get(summary, ['platformGrossRevenue']) ?? platformRestaurantRevenue + platformDeliveryRevenue
  );

  return {
    ordersCount,
    customerTurnover,
    foodSubtotal,
    clientDeliveryFee,
    discountsTotal,
    restaurantCommissionAmount,
    restaurantPayoutAmount,
    courierPayoutAmount,
    deliveryMargin: platformDeliveryRevenue,
    platformRestaurantRevenue,
    platformDeliveryRevenue,
    platformGrossRevenue,
    paidRestaurantPayoutAmount: num(get(summary, ['paidRestaurantPayoutAmount']) ?? get(restaurantTotals, ['paidPayoutAmount'])),
    paidCourierPayoutAmount: num(get(summary, ['paidCourierPayoutAmount']) ?? get(courierTotals, ['paidPayoutAmount'])),
    pendingRestaurantPayoutAmount: num(get(summary, ['pendingRestaurantPayoutAmount']) ?? get(restaurantTotals, ['pendingPayoutAmount'])),
    pendingCourierPayoutAmount: num(get(summary, ['pendingCourierPayoutAmount']) ?? get(courierTotals, ['pendingPayoutAmount'])),
  };
}

function normalizeRestaurants(payload: any): NormalizedRestaurantRow[] {
  const rows = arr(payload?.restaurants ?? payload?.rows ?? payload?.data ?? payload);
  return rows.map((row: any) => {
    const restaurant = row.restaurant ?? {};
    const name =
      nullableStr(row.restaurantName) ??
      nullableStr(restaurant.nameRu) ??
      nullableStr(restaurant.nameKk) ??
      nullableStr(row.nameRu) ??
      nullableStr(row.nameKk) ??
      'Ресторан';

    return {
      id: str(row.restaurantId ?? restaurant.id ?? row.id),
      name,
      number: row.number != null || restaurant.number != null ? num(row.number ?? restaurant.number) : null,
      deliveredOrdersCount: num(get(row, ['deliveredOrdersCount', 'ordersCount'])),
      foodSubtotal: num(get(row, ['foodSubtotal', 'grossSubtotal', 'subtotal'])),
      commissionAmount: num(get(row, ['commissionAmount', 'restaurantCommissionAmount'])),
      payoutAmount: num(get(row, ['accruedPayoutAmount', 'payoutAmount', 'restaurantPayoutAmount'])),
      pendingPayoutAmount: num(get(row, ['pendingPayoutAmount'])),
      assignedPayoutAmount: num(get(row, ['unpaidButAssignedAmount', 'assignedPayoutAmount'])),
      paidPayoutAmount: num(get(row, ['paidPayoutAmount'])),
      lastDeliveredAt: nullableStr(row.lastDeliveredAt),
      lastPaidAt: nullableStr(row.lastPaidAt),
      raw: row,
    };
  });
}

function normalizeCouriers(payload: any): NormalizedCourierRow[] {
  const rows = arr(payload?.couriers ?? payload?.rows ?? payload?.data ?? payload);
  return rows.map((row: any) => {
    const courier = row.courier ?? {};
    const fullName = [str(courier.lastName), str(courier.firstName)].filter(Boolean).join(' ');
    const name = nullableStr(row.courierName) ?? (fullName || null) ?? nullableStr(row.name) ?? 'Курьер';

    return {
      id: str(row.courierUserId ?? courier.userId ?? row.userId ?? row.id),
      name,
      phone: nullableStr(row.phone) ?? nullableStr(courier.phone),
      deliveredOrdersCount: num(get(row, ['deliveredOrdersCount', 'ordersCount'])),
      grossAmount: num(get(row, ['courierFeeGrossAmount', 'grossAmount'])),
      commissionAmount: num(get(row, ['commissionAmount', 'courierCommissionAmount'])),
      payoutAmount: num(get(row, ['accruedPayoutAmount', 'payoutAmount', 'courierPayoutAmount'])),
      pendingPayoutAmount: num(get(row, ['pendingPayoutAmount'])),
      assignedPayoutAmount: num(get(row, ['unpaidButAssignedAmount', 'assignedPayoutAmount'])),
      paidPayoutAmount: num(get(row, ['paidPayoutAmount'])),
      lastDeliveredAt: nullableStr(row.lastDeliveredAt),
      lastPaidAt: nullableStr(row.lastPaidAt),
      raw: row,
    };
  });
}

function normalizeOrders(payload: any): NormalizedOrderRow[] {
  const rows = arr(payload?.orders ?? payload?.rows ?? payload?.data ?? payload);
  return rows.map((row: any) => {
    const restaurant = row.restaurant ?? {};
    const courier = row.courier ?? {};
    const restaurantName =
      nullableStr(row.restaurantName) ?? nullableStr(restaurant.nameRu) ?? nullableStr(restaurant.nameKk);
    const courierFullName = [str(courier.lastName), str(courier.firstName)].filter(Boolean).join(' ');
    const courierName = nullableStr(row.courierName) ?? (courierFullName || null);
    const foodSubtotal = num(get(row, ['foodSubtotal', 'subtotal']));
    const deliveryFee = num(get(row, ['deliveryFee', 'clientDeliveryFee']));
    const discountsTotal = num(
      get(row, ['discountsTotal']) ??
        num(get(row, ['discountAmount'])) + num(get(row, ['deliveryDiscountAmount']))
    );
    const total = num(get(row, ['customerTurnover', 'total']));
    const restaurantCommissionAmount = num(get(row, ['restaurantCommissionAmount']));
    const restaurantPayoutAmount = num(get(row, ['restaurantPayoutAmount']));
    const courierPayoutAmount = num(get(row, ['courierPayoutAmount', 'courierFee']));
    const deliveryMargin = num(get(row, ['deliveryMargin']) ?? deliveryFee - courierPayoutAmount);
    const platformGrossRevenue = num(
      get(row, ['platformGrossRevenue']) ?? restaurantCommissionAmount + deliveryMargin
    );

    return {
      id: str(row.id ?? crypto.randomUUID()),
      number: row.number != null ? num(row.number) : null,
      createdAt: nullableStr(row.createdAt),
      deliveredAt: nullableStr(row.deliveredAt),
      restaurantName,
      courierName,
      status: nullableStr(row.status),
      foodSubtotal,
      deliveryFee,
      discountsTotal,
      total,
      restaurantCommissionAmount,
      restaurantPayoutAmount,
      courierPayoutAmount,
      deliveryMargin,
      platformGrossRevenue,
    };
  });
}

function normalizeProblems(payload: any): NormalizedProblemRow[] {
  const rows = arr(payload?.problemOrders ?? payload?.problems ?? payload?.orders ?? payload?.rows ?? payload?.data ?? payload);
  return rows.map((row: any) => {
    const normalized = normalizeOrders([row])[0];
    return {
      ...normalized,
      reason:
        nullableStr(row.reason) ??
        nullableStr(row.problem) ??
        nullableStr(row.message) ??
        (arr(row.reasons).join(', ') || 'Проверить финансовые значения'),
    };
  });
}

function normalizeByDay(payload: any): NormalizedDayRow[] {
  const rows = arr(payload?.byDay ?? payload?.days ?? payload?.rows ?? payload?.data ?? payload);
  return rows.map((row: any) => {
    const deliveryFee = num(get(row, ['deliveryFee', 'clientDeliveryFee']));
    const courierPayoutAmount = num(get(row, ['courierPayoutAmount', 'courierFee']));
    const restaurantCommissionAmount = num(get(row, ['restaurantCommissionAmount']));
    const platformGrossRevenue = num(
      get(row, ['platformGrossRevenue']) ?? restaurantCommissionAmount + deliveryFee - courierPayoutAmount
    );

    return {
      date: str(row.date ?? row.day ?? row.period ?? ''),
      ordersCount: num(get(row, ['ordersCount', 'deliveredOrdersCount'])),
      customerTurnover: num(get(row, ['customerTurnover', 'total'])),
      foodSubtotal: num(get(row, ['foodSubtotal', 'subtotal'])),
      deliveryFee,
      restaurantCommissionAmount,
      restaurantPayoutAmount: num(get(row, ['restaurantPayoutAmount'])),
      courierPayoutAmount,
      deliveryMargin: num(get(row, ['deliveryMargin']) ?? deliveryFee - courierPayoutAmount),
      platformGrossRevenue,
    };
  });
}

function normalizeRestaurantPayouts(payload: any): PayoutRow[] {
  return arr(payload).map((row: any) => {
    const restaurant = row.restaurant ?? {};
    const paidByAdmin = row.paidByAdmin ?? {};
    const paidByName = [str(paidByAdmin.lastName), str(paidByAdmin.firstName)].filter(Boolean).join(' ');

    return {
      id: str(row.id),
      kind: 'restaurant',
      entityId: str(row.restaurantId ?? restaurant.id),
      entityName:
        nullableStr(restaurant.nameRu) ?? nullableStr(restaurant.nameKk) ?? nullableStr(row.restaurantName) ?? 'Ресторан',
      periodFrom: nullableStr(row.periodFrom),
      periodTo: nullableStr(row.periodTo),
      ordersCount: num(row.ordersCount),
      grossAmount: num(row.grossSubtotal ?? row.grossAmount),
      commissionAmount: num(row.commissionAmount),
      payoutAmount: num(row.payoutAmount),
      status: str(row.status || 'PENDING'),
      paidAt: nullableStr(row.paidAt),
      paymentReference: nullableStr(row.paymentReference),
      paymentComment: nullableStr(row.paymentComment),
      note: nullableStr(row.note),
      paidByAdminName: paidByName || nullableStr(paidByAdmin.email) || nullableStr(paidByAdmin.phone),
      createdAt: nullableStr(row.createdAt),
    };
  });
}

function normalizeCourierPayouts(payload: any): PayoutRow[] {
  return arr(payload).map((row: any) => {
    const courier = row.courier ?? {};
    const paidByAdmin = row.paidByAdmin ?? {};
    const courierName = [str(courier.lastName), str(courier.firstName)].filter(Boolean).join(' ');
    const paidByName = [str(paidByAdmin.lastName), str(paidByAdmin.firstName)].filter(Boolean).join(' ');

    return {
      id: str(row.id),
      kind: 'courier',
      entityId: str(row.courierUserId ?? courier.userId),
      entityName: courierName || nullableStr(row.courierName) || 'Курьер',
      phone: nullableStr(row.phone) ?? nullableStr(getNested(courier, ['user', 'phone'])) ?? nullableStr(courier.phone),
      periodFrom: nullableStr(row.periodFrom),
      periodTo: nullableStr(row.periodTo),
      ordersCount: num(row.ordersCount),
      grossAmount: num(row.grossAmount ?? row.courierFeeGrossAmount),
      commissionAmount: num(row.commissionAmount),
      payoutAmount: num(row.payoutAmount),
      status: str(row.status || 'PENDING'),
      paidAt: nullableStr(row.paidAt),
      paymentReference: nullableStr(row.paymentReference),
      paymentComment: nullableStr(row.paymentComment),
      note: nullableStr(row.note),
      paidByAdminName: paidByName || nullableStr(paidByAdmin.email) || nullableStr(paidByAdmin.phone),
      createdAt: nullableStr(row.createdAt),
    };
  });
}

function normalizeConfig(payload: any): FinanceConfig {
  const cfg = payload?.config ?? payload ?? {};
  return {
    clientDeliveryFeeDefault: num(cfg.clientDeliveryFeeDefault),
    clientDeliveryFeeWeather: num(cfg.clientDeliveryFeeWeather),
    courierPayoutDefault: num(cfg.courierPayoutDefault),
    courierPayoutWeather: num(cfg.courierPayoutWeather),
    weatherEnabled: Boolean(cfg.weatherEnabled),
  };
}

type CardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: 'default' | 'green' | 'red' | 'orange' | 'blue' | 'violet';
};

function Card({ title, value, subtitle, tone = 'default' }: CardProps) {
  const tones = {
    default: 'text-gray-900 bg-white border-gray-200',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    red: 'text-red-700 bg-red-50 border-red-100',
    orange: 'text-orange-700 bg-orange-50 border-orange-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    violet: 'text-violet-700 bg-violet-50 border-violet-100',
  } as const;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-[12px] font-bold uppercase tracking-wide opacity-70">{title}</div>
      <div className="mt-2 text-[28px] font-black leading-none">{value}</div>
      {subtitle ? <div className="mt-2 text-[12px] leading-5 opacity-70">{subtitle}</div> : null}
    </div>
  );
}

function Section({ title, subtitle, children, rightSlot }: { title: string; subtitle?: string; children: ReactNode; rightSlot?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[22px] font-black text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-5 text-gray-500">{subtitle}</p> : null}
        </div>
        {rightSlot}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-[14px] text-gray-500">
        {text}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isPaid = status === 'PAID';
  const isCanceled = status === 'CANCELED';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-bold ${
        isPaid
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
          : isCanceled
            ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
            : 'bg-orange-50 text-orange-700 ring-1 ring-orange-100'
      }`}
    >
      {status}
    </span>
  );
}

function DataTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">{children}</div>;
}

export default function FinancePage() {
  const [period, setPeriod] = useState<FinancePeriod>('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [payoutScope, setPayoutScope] = useState<PayoutScope>('all');

  const [overviewRaw, setOverviewRaw] = useState<any>(null);
  const [restaurantSummaryRaw, setRestaurantSummaryRaw] = useState<any>(null);
  const [courierSummaryRaw, setCourierSummaryRaw] = useState<any>(null);
  const [ordersRaw, setOrdersRaw] = useState<any>(null);
  const [problemsRaw, setProblemsRaw] = useState<any>(null);
  const [byDayRaw, setByDayRaw] = useState<any>(null);
  const [restaurantPayoutsRaw, setRestaurantPayoutsRaw] = useState<any[]>([]);
  const [courierPayoutsRaw, setCourierPayoutsRaw] = useState<any[]>([]);
  const [config, setConfig] = useState<FinanceConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [clientDeliveryFeeDefault, setClientDeliveryFeeDefault] = useState('');
  const [clientDeliveryFeeWeather, setClientDeliveryFeeWeather] = useState('');
  const [courierPayoutDefault, setCourierPayoutDefault] = useState('');
  const [courierPayoutWeather, setCourierPayoutWeather] = useState('');
  const [weatherEnabled, setWeatherEnabled] = useState(false);

  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentComment, setPaymentComment] = useState('');
  const [paymentPaidAt, setPaymentPaidAt] = useState('');
  const [editPayoutModal, setEditPayoutModal] = useState<EditPayoutModalState>(null);
  const [editPayoutNote, setEditPayoutNote] = useState('');
  const [editPaymentReference, setEditPaymentReference] = useState('');
  const [editPaymentComment, setEditPaymentComment] = useState('');
  const [editPaymentPaidAt, setEditPaymentPaidAt] = useState('');
  const [createPayoutModal, setCreatePayoutModal] = useState<CreatePayoutModalState>(null);
  const [createPayoutNote, setCreatePayoutNote] = useState('');

  const buildPeriodQuery = (selectedPeriod: FinancePeriod = period) => {
    const params = new URLSearchParams();
    params.set('period', selectedPeriod);
    if (selectedPeriod === 'custom') {
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
    }
    return params.toString();
  };

  const periodSuffix = useMemo(() => `?${buildPeriodQuery(period)}`, [period, fromDate, toDate]);

  const summary = useMemo(
    () => normalizeSummary(overviewRaw, restaurantSummaryRaw, courierSummaryRaw),
    [overviewRaw, restaurantSummaryRaw, courierSummaryRaw]
  );
  const restaurants = useMemo(() => normalizeRestaurants(restaurantSummaryRaw), [restaurantSummaryRaw]);
  const couriers = useMemo(() => normalizeCouriers(courierSummaryRaw), [courierSummaryRaw]);
  const orders = useMemo(() => normalizeOrders(ordersRaw), [ordersRaw]);
  const problems = useMemo(() => normalizeProblems(problemsRaw), [problemsRaw]);
  const byDay = useMemo(() => normalizeByDay(byDayRaw), [byDayRaw]);
  const restaurantPayouts = useMemo(() => normalizeRestaurantPayouts(restaurantPayoutsRaw), [restaurantPayoutsRaw]);
  const courierPayouts = useMemo(() => normalizeCourierPayouts(courierPayoutsRaw), [courierPayoutsRaw]);
  const allPayouts = useMemo(() => {
    const rows = [...restaurantPayouts, ...courierPayouts];
    return rows
      .filter((row) => {
        if (payoutScope === 'all') return true;
        if (payoutScope === 'paid') return row.status === 'PAID';
        if (payoutScope === 'pending') return row.status !== 'PAID';
        if (payoutScope === 'assigned') return row.status !== 'PAID';
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a.paidAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.paidAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      });
  }, [restaurantPayouts, courierPayouts, payoutScope]);

  const periodStartIso = useMemo(() => {
    const periodInfo = overviewRaw?.period ?? restaurantSummaryRaw?.period ?? courierSummaryRaw?.period;
    return nullableStr(periodInfo?.start);
  }, [overviewRaw, restaurantSummaryRaw, courierSummaryRaw]);

  const periodEndIso = useMemo(() => {
    const periodInfo = overviewRaw?.period ?? restaurantSummaryRaw?.period ?? courierSummaryRaw?.period;
    return nullableStr(periodInfo?.end);
  }, [overviewRaw, restaurantSummaryRaw, courierSummaryRaw]);

  async function fetchOptional(path: string): Promise<any> {
    try {
      return await apiFetch(path, { method: 'GET', cache: 'no-store' });
    } catch {
      return null;
    }
  }

  async function loadFinance() {
    if (period === 'custom' && (!fromDate || !toDate)) {
      setError('Для своего периода выбери даты “с” и “по”.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotice(null);
      const suffix = `?${buildPeriodQuery(period)}`;

      const [overview, restaurantSummary, courierSummary, ordersReport, problemsReport, byDayReport, restaurantPayoutList, courierPayoutList, tariffConfig] =
        await Promise.all([
          fetchOptional(`/finance/admin/overview${suffix}`),
          fetchOptional(`/finance/restaurant-payouts/summary${suffix}`),
          fetchOptional(`/finance/courier-payouts/summary${suffix}`),
          fetchOptional(`/finance/admin/orders${suffix}`),
          fetchOptional(`/finance/admin/problems${suffix}`),
          fetchOptional(`/finance/admin/by-day${suffix}`),
          fetchOptional(`/finance/restaurant-payouts${suffix}`),
          fetchOptional(`/finance/courier-payouts${suffix}`),
          fetchOptional('/restaurants/finance/config'),
        ]);

      setOverviewRaw(overview);
      setRestaurantSummaryRaw(restaurantSummary);
      setCourierSummaryRaw(courierSummary);
      setOrdersRaw(ordersReport);
      setProblemsRaw(problemsReport);
      setByDayRaw(byDayReport);
      setRestaurantPayoutsRaw(arr(restaurantPayoutList));
      setCourierPayoutsRaw(arr(courierPayoutList));

      if (tariffConfig) {
        const normalized = normalizeConfig(tariffConfig);
        setConfig(normalized);
        setClientDeliveryFeeDefault(String(normalized.clientDeliveryFeeDefault));
        setClientDeliveryFeeWeather(String(normalized.clientDeliveryFeeWeather));
        setCourierPayoutDefault(String(normalized.courierPayoutDefault));
        setCourierPayoutWeather(String(normalized.courierPayoutWeather));
        setWeatherEnabled(normalized.weatherEnabled);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить финансы');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (period !== 'custom') {
      void loadFinance();
    }
  }, [period]);

  function parseMoneyInput(value: string, label: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`${label}: укажи число 0 или больше`);
    }
    return Math.round(parsed);
  }

  async function saveTariffs() {
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const payload = {
        clientDeliveryFeeDefault: parseMoneyInput(clientDeliveryFeeDefault, 'Доставка'),
        clientDeliveryFeeWeather: parseMoneyInput(clientDeliveryFeeWeather, 'Доставка в режиме'),
        courierPayoutDefault: parseMoneyInput(courierPayoutDefault, 'Выплата курьеру'),
        courierPayoutWeather: parseMoneyInput(courierPayoutWeather, 'Выплата курьеру в режиме'),
        weatherEnabled,
      };
      const result = await apiFetch('/restaurants/finance/config', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const normalized = normalizeConfig(result);
      setConfig(normalized);
      setNotice('Настройки тарифов сохранены.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить тарифы');
    } finally {
      setSaving(false);
    }
  }

  function openCreatePayout(kind: PayoutKind, entityId: string, entityName: string, amount: number) {
    setCreatePayoutModal({ kind, entityId, entityName, amount });
    setCreatePayoutNote('');
  }

  async function createPayout() {
    if (!createPayoutModal) return;
    if (!periodStartIso || !periodEndIso) {
      setError('Нет периода для формирования выплаты. Обнови страницу.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const endpoint =
        createPayoutModal.kind === 'restaurant'
          ? '/finance/restaurant-payouts'
          : '/finance/courier-payouts';
      const body =
        createPayoutModal.kind === 'restaurant'
          ? {
              restaurantId: createPayoutModal.entityId,
              periodFrom: periodStartIso,
              periodTo: periodEndIso,
              note: createPayoutNote || null,
            }
          : {
              courierUserId: createPayoutModal.entityId,
              periodFrom: periodStartIso,
              periodTo: periodEndIso,
              note: createPayoutNote || null,
            };

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setCreatePayoutModal(null);
      setNotice('Выплата сформирована. Теперь её можно отметить как оплаченную.');
      await loadFinance();
      setActiveTab('payouts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сформировать выплату');
    } finally {
      setSaving(false);
    }
  }

  function openPaymentModal(row: PayoutRow) {
    setPaymentModal({ kind: row.kind, payoutId: row.id, entityName: row.entityName, amount: row.payoutAmount });
    setPaymentReference(row.paymentReference ?? '');
    setPaymentComment(row.paymentComment ?? '');
    setPaymentPaidAt(datetimeLocalFromIso(row.paidAt ?? new Date()));
  }

  function openEditPayout(row: PayoutRow) {
    setEditPayoutModal({ payout: row });
    setEditPayoutNote(row.note ?? '');
    setEditPaymentReference(row.paymentReference ?? '');
    setEditPaymentComment(row.paymentComment ?? '');
    setEditPaymentPaidAt(datetimeLocalFromIso(row.paidAt));
  }

  async function markPayoutPaid() {
    if (!paymentModal) return;
    if (!paymentReference.trim()) {
      setError('Укажи номер платежа / reference.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const endpoint =
        paymentModal.kind === 'restaurant'
          ? `/finance/restaurant-payouts/${paymentModal.payoutId}/pay`
          : `/finance/courier-payouts/${paymentModal.payoutId}/pay`;
      await apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentReference: paymentReference.trim(),
          paymentComment: paymentComment.trim() || null,
          paidAt: paymentPaidAt ? new Date(paymentPaidAt).toISOString() : null,
        }),
      });
      setPaymentModal(null);
      setNotice('Выплата отмечена как оплаченная. Номер платежа, комментарий, дата и админ сохранены.');
      await loadFinance();
      setActiveTab('payouts');
      setPayoutScope('paid');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить выплату как оплаченную');
    } finally {
      setSaving(false);
    }
  }

  async function updatePayout() {
    if (!editPayoutModal) return;

    const row = editPayoutModal.payout;

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const endpoint =
        row.kind === 'restaurant'
          ? `/finance/restaurant-payouts/${row.id}`
          : `/finance/courier-payouts/${row.id}`;

      await apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({
          note: editPayoutNote.trim() || null,
          paymentReference: editPaymentReference.trim() || null,
          paymentComment: editPaymentComment.trim() || null,
          paidAt: row.status === 'PAID' && editPaymentPaidAt ? new Date(editPaymentPaidAt).toISOString() : undefined,
        }),
      });

      setEditPayoutModal(null);
      setNotice('Выплата обновлена. Номер платежа, дата, комментарий и примечание сохранены.');
      await loadFinance();
      setActiveTab('payouts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить выплату');
    } finally {
      setSaving(false);
    }
  }

  function exportExcel(kind: PayoutKind, scope: PayoutScope) {
    const endpoint = kind === 'restaurant' ? '/finance/restaurant-payouts/export' : '/finance/courier-payouts/export';
    const params = new URLSearchParams(buildPeriodQuery(period));
    params.set('scope', scope);
    window.open(`/api/proxy${endpoint}?${params.toString()}`, '_blank');
  }

  const periodLabel = PERIOD_OPTIONS.find((item) => item.key === period)?.label ?? 'Период';

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-5 text-gray-900">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] font-black leading-tight">Финансы</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Реальная отчётность: прибыль, выплаты ресторанам и курьерам, номера платежей, комментарии и история оплат.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadFinance()}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold shadow-sm hover:bg-gray-50"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={() => exportExcel('restaurant', 'all')}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold shadow-sm hover:bg-gray-50"
          >
            Excel рестораны
          </button>
          <button
            type="button"
            onClick={() => exportExcel('courier', 'all')}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold shadow-sm hover:bg-gray-50"
          >
            Excel курьеры
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 text-[13px] font-bold text-gray-500">Период отчёта</div>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPeriod(item.key)}
                  className={`rounded-2xl px-4 py-2.5 text-[14px] font-bold transition-all ${
                    period === item.key
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-[12px] font-bold text-gray-500">С даты</label>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold text-gray-500">По дату</label>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-violet-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPeriod('custom');
                setTimeout(() => void loadFinance(), 0);
              }}
              className="rounded-2xl bg-gray-900 px-4 py-2.5 text-[14px] font-bold text-white hover:bg-black"
            >
              Показать
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl px-4 py-2.5 text-[14px] font-bold ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] font-semibold text-red-700">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[14px] font-semibold text-emerald-700">{notice}</div> : null}
      {loading ? <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 text-[14px] text-gray-500">Загрузка финансов...</div> : null}

      {activeTab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Прибыль платформы" value={formatMoney(summary.platformGrossRevenue)} subtitle="Комиссия ресторанов + доставка - выплаты курьерам" tone="green" />
            <Card title="Оборот клиентов" value={formatMoney(summary.customerTurnover)} subtitle="Сумма total по доставленным заказам" tone="blue" />
            <Card title="К выплате ресторанам" value={formatMoney(summary.pendingRestaurantPayoutAmount)} subtitle="Delivered без restaurant payout" tone="orange" />
            <Card title="К выплате курьерам" value={formatMoney(summary.pendingCourierPayoutAmount)} subtitle="Delivered без courier payout" tone="orange" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Прибыль с ресторанов" value={formatMoney(summary.platformRestaurantRevenue)} subtitle="Комиссия сервиса с ресторанов" tone="violet" />
            <Card title="Маржа доставки" value={formatMoney(summary.platformDeliveryRevenue)} subtitle="Доставка клиентов - выплата курьерам" tone={summary.platformDeliveryRevenue >= 0 ? 'green' : 'red'} />
            <Card title="Выплачено ресторанам" value={formatMoney(summary.paidRestaurantPayoutAmount)} subtitle="Payout со статусом PAID" tone="green" />
            <Card title="Выплачено курьерам" value={formatMoney(summary.paidCourierPayoutAmount)} subtitle="Payout со статусом PAID" tone="green" />
          </div>
          <Section title="Детализация по дням" subtitle={`Период: ${periodLabel}. Сегодня считается с 00:00 до текущего момента.`}>
            <DataTable>
              <table className="min-w-full text-left text-[14px]">
                <thead className="bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Дата</th>
                    <th className="px-3 py-3">Заказы</th>
                    <th className="px-3 py-3">Оборот</th>
                    <th className="px-3 py-3">Сумма блюд</th>
                    <th className="px-3 py-3">Доставка</th>
                    <th className="px-3 py-3">Комиссия ресторанов</th>
                    <th className="px-3 py-3">Ресторанам</th>
                    <th className="px-3 py-3">Курьерам</th>
                    <th className="px-3 py-3">Прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.length === 0 ? <EmptyRow colSpan={9} text="Нет детализации по дням" /> : null}
                  {byDay.map((row) => (
                    <tr key={row.date} className="border-t border-gray-100">
                      <td className="px-3 py-3 font-bold">{row.date}</td>
                      <td className="px-3 py-3">{row.ordersCount}</td>
                      <td className="px-3 py-3">{formatMoney(row.customerTurnover)}</td>
                      <td className="px-3 py-3">{formatMoney(row.foodSubtotal)}</td>
                      <td className="px-3 py-3">{formatMoney(row.deliveryFee)}</td>
                      <td className="px-3 py-3 text-violet-700">{formatMoney(row.restaurantCommissionAmount)}</td>
                      <td className="px-3 py-3 text-orange-700">{formatMoney(row.restaurantPayoutAmount)}</td>
                      <td className="px-3 py-3 text-orange-700">{formatMoney(row.courierPayoutAmount)}</td>
                      <td className="px-3 py-3 font-black text-emerald-700">{formatMoney(row.platformGrossRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </Section>
        </div>
      ) : null}

      {activeTab === 'restaurants' ? (
        <Section title="Отчёт по ресторанам" subtitle="Сколько начислено, сколько уже в payout, сколько оплачено.">
          <DataTable>
            <table className="min-w-full text-left text-[14px]">
              <thead className="bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">Ресторан</th>
                  <th className="px-3 py-3">Заказы</th>
                  <th className="px-3 py-3">Сумма блюд</th>
                  <th className="px-3 py-3">Комиссия</th>
                  <th className="px-3 py-3">Начислено</th>
                  <th className="px-3 py-3">К выплате</th>
                  <th className="px-3 py-3">В payout</th>
                  <th className="px-3 py-3">Выплачено</th>
                  <th className="px-3 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.length === 0 ? <EmptyRow colSpan={9} text="Нет ресторанов в отчёте" /> : null}
                {restaurants.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-bold">{row.name}<div className="text-[12px] text-gray-400">№{row.number ?? '—'}</div></td>
                    <td className="px-3 py-3">{row.deliveredOrdersCount}</td>
                    <td className="px-3 py-3">{formatMoney(row.foodSubtotal)}</td>
                    <td className="px-3 py-3 text-violet-700">{formatMoney(row.commissionAmount)}</td>
                    <td className="px-3 py-3">{formatMoney(row.payoutAmount)}</td>
                    <td className="px-3 py-3 font-black text-orange-700">{formatMoney(row.pendingPayoutAmount)}</td>
                    <td className="px-3 py-3 text-blue-700">{formatMoney(row.assignedPayoutAmount)}</td>
                    <td className="px-3 py-3 text-emerald-700">{formatMoney(row.paidPayoutAmount)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={row.pendingPayoutAmount <= 0 || saving}
                        onClick={() => openCreatePayout('restaurant', row.id, row.name, row.pendingPayoutAmount)}
                        className="rounded-xl bg-gray-900 px-3 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Сформировать выплату
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </Section>
      ) : null}

      {activeTab === 'couriers' ? (
        <Section title="Отчёт по курьерам" subtitle="Начисления, удержания и фактические выплаты курьерам.">
          <DataTable>
            <table className="min-w-full text-left text-[14px]">
              <thead className="bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">Курьер</th>
                  <th className="px-3 py-3">Заказы</th>
                  <th className="px-3 py-3">Gross</th>
                  <th className="px-3 py-3">Комиссия</th>
                  <th className="px-3 py-3">Начислено</th>
                  <th className="px-3 py-3">К выплате</th>
                  <th className="px-3 py-3">В payout</th>
                  <th className="px-3 py-3">Выплачено</th>
                  <th className="px-3 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {couriers.length === 0 ? <EmptyRow colSpan={9} text="Нет курьеров в отчёте" /> : null}
                {couriers.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-bold">{row.name}<div className="text-[12px] text-gray-400">{row.phone ?? 'телефон не указан'}</div></td>
                    <td className="px-3 py-3">{row.deliveredOrdersCount}</td>
                    <td className="px-3 py-3">{formatMoney(row.grossAmount)}</td>
                    <td className="px-3 py-3 text-violet-700">{formatMoney(row.commissionAmount)}</td>
                    <td className="px-3 py-3">{formatMoney(row.payoutAmount)}</td>
                    <td className="px-3 py-3 font-black text-orange-700">{formatMoney(row.pendingPayoutAmount)}</td>
                    <td className="px-3 py-3 text-blue-700">{formatMoney(row.assignedPayoutAmount)}</td>
                    <td className="px-3 py-3 text-emerald-700">{formatMoney(row.paidPayoutAmount)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={row.pendingPayoutAmount <= 0 || saving}
                        onClick={() => openCreatePayout('courier', row.id, row.name, row.pendingPayoutAmount)}
                        className="rounded-xl bg-gray-900 px-3 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Сформировать выплату
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </Section>
      ) : null}

      {activeTab === 'orders' ? (
        <Section title="Отчёт по заказам" subtitle="По каждому заказу видно, откуда берётся прибыль.">
          <DataTable>
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">№</th>
                  <th className="px-3 py-3">Доставлен</th>
                  <th className="px-3 py-3">Ресторан</th>
                  <th className="px-3 py-3">Курьер</th>
                  <th className="px-3 py-3">Блюда</th>
                  <th className="px-3 py-3">Доставка</th>
                  <th className="px-3 py-3">Итого</th>
                  <th className="px-3 py-3">Комиссия ресторана</th>
                  <th className="px-3 py-3">Ресторану</th>
                  <th className="px-3 py-3">Курьеру</th>
                  <th className="px-3 py-3">Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? <EmptyRow colSpan={11} text="Нет заказов в отчёте" /> : null}
                {orders.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-bold">{row.number ?? '—'}</td>
                    <td className="px-3 py-3">{formatDate(row.deliveredAt)}</td>
                    <td className="px-3 py-3">{row.restaurantName ?? '—'}</td>
                    <td className="px-3 py-3">{row.courierName ?? '—'}</td>
                    <td className="px-3 py-3">{formatMoney(row.foodSubtotal)}</td>
                    <td className="px-3 py-3">{formatMoney(row.deliveryFee)}</td>
                    <td className="px-3 py-3">{formatMoney(row.total)}</td>
                    <td className="px-3 py-3 text-violet-700">{formatMoney(row.restaurantCommissionAmount)}</td>
                    <td className="px-3 py-3 text-orange-700">{formatMoney(row.restaurantPayoutAmount)}</td>
                    <td className="px-3 py-3 text-orange-700">{formatMoney(row.courierPayoutAmount)}</td>
                    <td className="px-3 py-3 font-black text-emerald-700">{formatMoney(row.platformGrossRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </Section>
      ) : null}

      {activeTab === 'payouts' ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[22px] font-black">Выплаты ресторанам и курьерам</h2>
                <p className="mt-1 text-[13px] text-gray-500">
                  Показаны выплаты за выбранный период. Можно редактировать номер платежа, дату оплаты, комментарий и примечание.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'assigned', 'paid'] as PayoutScope[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setPayoutScope(scope)}
                    className={`rounded-2xl px-4 py-2 text-[13px] font-bold ${
                      payoutScope === scope ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    {scope === 'all' ? 'Все' : scope === 'paid' ? 'Оплаченные' : scope === 'pending' ? 'Не оплаченные' : 'Назначенные'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DataTable>
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">Тип</th>
                  <th className="px-3 py-3">Получатель</th>
                  <th className="px-3 py-3">Период</th>
                  <th className="px-3 py-3">Создана</th>
                  <th className="px-3 py-3">Заказы</th>
                  <th className="px-3 py-3">Сумма</th>
                  <th className="px-3 py-3">Статус</th>
                  <th className="px-3 py-3">Номер платежа</th>
                  <th className="px-3 py-3">Дата оплаты</th>
                  <th className="px-3 py-3">Комментарий</th>
                  <th className="px-3 py-3">Примечание</th>
                  <th className="px-3 py-3">Кто провёл</th>
                  <th className="px-3 py-3">Действие</th>
                </tr>
              </thead>
              <tbody>
                {allPayouts.length === 0 ? <EmptyRow colSpan={12} text="Выплат за выбранный период нет" /> : null}
                {allPayouts.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-bold">{row.kind === 'restaurant' ? 'Ресторан' : 'Курьер'}</td>
                    <td className="px-3 py-3 font-bold">{row.entityName}<div className="text-[12px] text-gray-400">{row.phone ?? row.entityId}</div></td>
                    <td className="px-3 py-3">{formatDateOnly(row.periodFrom)} — {formatDateOnly(row.periodTo)}</td>
                    <td className="px-3 py-3">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-3">{row.ordersCount}</td>
                    <td className="px-3 py-3 font-black text-orange-700">{formatMoney(row.payoutAmount)}</td>
                    <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-3 font-semibold">{row.paymentReference ?? '—'}</td>
                    <td className="px-3 py-3">{formatDate(row.paidAt)}</td>
                    <td className="px-3 py-3 max-w-[220px] whitespace-normal text-gray-600">{row.paymentComment ?? '—'}</td>
                    <td className="px-3 py-3 max-w-[220px] whitespace-normal text-gray-600">{row.note ?? '—'}</td>
                    <td className="px-3 py-3">{row.paidByAdminName ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPayout(row)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50"
                        >
                          Редактировать
                        </button>
                        {row.status === 'PAID' ? (
                          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">Оплачено</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(row)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-emerald-700"
                          >
                            Провести оплату
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </div>
      ) : null}

      {activeTab === 'problems' ? (
        <Section title="Проблемные заказы" subtitle="Заказы, где финансовый snapshot требует проверки.">
          <DataTable>
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">№</th>
                  <th className="px-3 py-3">Причина</th>
                  <th className="px-3 py-3">Ресторан</th>
                  <th className="px-3 py-3">Итого</th>
                  <th className="px-3 py-3">Ресторану</th>
                  <th className="px-3 py-3">Курьеру</th>
                  <th className="px-3 py-3">Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {problems.length === 0 ? <EmptyRow colSpan={7} text="Проблемных заказов нет" /> : null}
                {problems.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-bold">{row.number ?? '—'}</td>
                    <td className="px-3 py-3 text-red-700 font-semibold">{row.reason}</td>
                    <td className="px-3 py-3">{row.restaurantName ?? '—'}</td>
                    <td className="px-3 py-3">{formatMoney(row.total)}</td>
                    <td className="px-3 py-3">{formatMoney(row.restaurantPayoutAmount)}</td>
                    <td className="px-3 py-3">{formatMoney(row.courierPayoutAmount)}</td>
                    <td className="px-3 py-3 font-black">{formatMoney(row.platformGrossRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </Section>
      ) : null}

      {activeTab === 'settings' ? (
        <Section title="Настройки тарифов" subtitle="Старый блок настроек доставки и выплаты курьеру сохранён.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <label className="block rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <span className="text-[13px] font-bold text-gray-600">Доставка клиенту</span>
              <input value={clientDeliveryFeeDefault} onChange={(event) => setClientDeliveryFeeDefault(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2" />
            </label>
            <label className="block rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <span className="text-[13px] font-bold text-gray-600">Доставка в режиме</span>
              <input value={clientDeliveryFeeWeather} onChange={(event) => setClientDeliveryFeeWeather(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2" />
            </label>
            <label className="block rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <span className="text-[13px] font-bold text-gray-600">Выплата курьеру</span>
              <input value={courierPayoutDefault} onChange={(event) => setCourierPayoutDefault(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2" />
            </label>
            <label className="block rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <span className="text-[13px] font-bold text-gray-600">Выплата курьеру в режиме</span>
              <input value={courierPayoutWeather} onChange={(event) => setCourierPayoutWeather(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-center gap-3 text-[14px] font-bold text-gray-700">
              <input type="checkbox" checked={weatherEnabled} onChange={(event) => setWeatherEnabled(event.target.checked)} />
              Включить режим повышенного тарифа
            </label>
            <button type="button" disabled={saving} onClick={() => void saveTariffs()} className="rounded-2xl bg-gray-900 px-5 py-2.5 text-[14px] font-bold text-white disabled:bg-gray-300">
              {saving ? 'Сохранение...' : 'Сохранить тарифы'}
            </button>
          </div>
          {config ? <div className="mt-3 text-[12px] text-gray-400">Текущие настройки загружены.</div> : null}
        </Section>
      ) : null}

      {createPayoutModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[560px] rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-[24px] font-black">Сформировать выплату</h3>
            <p className="mt-2 text-[14px] text-gray-500">
              {createPayoutModal.kind === 'restaurant' ? 'Ресторан' : 'Курьер'}: <b>{createPayoutModal.entityName}</b>
            </p>
            <p className="mt-1 text-[14px] text-gray-500">Сумма к выплате: <b>{formatMoney(createPayoutModal.amount)}</b></p>
            <p className="mt-1 text-[14px] text-gray-500">Период: <b>{formatDate(periodStartIso)} — {formatDate(periodEndIso)}</b></p>
            <label className="mt-4 block">
              <span className="text-[13px] font-bold text-gray-600">Комментарий к выплате</span>
              <textarea value={createPayoutNote} onChange={(event) => setCreatePayoutNote(event.target.value)} className="mt-2 min-h-[90px] w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreatePayoutModal(null)} className="rounded-2xl border border-gray-200 px-4 py-2 text-[14px] font-bold">Отмена</button>
              <button type="button" disabled={saving} onClick={() => void createPayout()} className="rounded-2xl bg-gray-900 px-4 py-2 text-[14px] font-bold text-white disabled:bg-gray-300">Сформировать</button>
            </div>
          </div>
        </div>
      ) : null}

      {editPayoutModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[620px] rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-[24px] font-black">Редактировать выплату</h3>
            <p className="mt-2 text-[14px] text-gray-500">
              {editPayoutModal.payout.kind === 'restaurant' ? 'Ресторан' : 'Курьер'}: <b>{editPayoutModal.payout.entityName}</b>
            </p>
            <p className="mt-1 text-[14px] text-gray-500">Сумма: <b>{formatMoney(editPayoutModal.payout.payoutAmount)}</b></p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-bold text-gray-600">Номер платежа / reference</span>
                <input value={editPaymentReference} onChange={(event) => setEditPaymentReference(event.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" placeholder="Например: KASPI-2026-000123" />
              </label>
              <label className="block">
                <span className="text-[13px] font-bold text-gray-600">Дата и время оплаты</span>
                <input
                  type="datetime-local"
                  value={editPaymentPaidAt}
                  disabled={editPayoutModal.payout.status !== 'PAID'}
                  onChange={(event) => setEditPaymentPaidAt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400 disabled:bg-gray-100 disabled:text-gray-400"
                />
                {editPayoutModal.payout.status !== 'PAID' ? <span className="mt-1 block text-[11px] text-gray-400">Дата оплаты доступна после проведения оплаты.</span> : null}
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-[13px] font-bold text-gray-600">Комментарий к оплате</span>
              <textarea value={editPaymentComment} onChange={(event) => setEditPaymentComment(event.target.value)} className="mt-2 min-h-[90px] w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" />
            </label>
            <label className="mt-4 block">
              <span className="text-[13px] font-bold text-gray-600">Примечание к выплате</span>
              <textarea value={editPayoutNote} onChange={(event) => setEditPayoutNote(event.target.value)} className="mt-2 min-h-[90px] w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditPayoutModal(null)} className="rounded-2xl border border-gray-200 px-4 py-2 text-[14px] font-bold">Отмена</button>
              <button type="button" disabled={saving} onClick={() => void updatePayout()} className="rounded-2xl bg-gray-900 px-4 py-2 text-[14px] font-bold text-white disabled:bg-gray-300">Сохранить изменения</button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[560px] rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-[24px] font-black">Провести оплату</h3>
            <p className="mt-2 text-[14px] text-gray-500">
              {paymentModal.kind === 'restaurant' ? 'Ресторан' : 'Курьер'}: <b>{paymentModal.entityName}</b>
            </p>
            <p className="mt-1 text-[14px] text-gray-500">Сумма: <b>{formatMoney(paymentModal.amount)}</b></p>
            <label className="mt-4 block">
              <span className="text-[13px] font-bold text-gray-600">Номер платежа / reference *</span>
              <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" placeholder="Например: KASPI-2026-000123" />
            </label>
            <label className="mt-4 block">
              <span className="text-[13px] font-bold text-gray-600">Дата и время оплаты</span>
              <input type="datetime-local" value={paymentPaidAt} onChange={(event) => setPaymentPaidAt(event.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" />
            </label>
            <label className="mt-4 block">
              <span className="text-[13px] font-bold text-gray-600">Комментарий</span>
              <textarea value={paymentComment} onChange={(event) => setPaymentComment(event.target.value)} className="mt-2 min-h-[90px] w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:border-violet-400" placeholder="Кто и как оплатил, примечание для отчётности" />
            </label>
            <div className="mt-5 rounded-2xl bg-blue-50 p-3 text-[13px] leading-5 text-blue-700">
              Дата оплаты и администратор сохраняются backend-ом автоматически. В таблице потом будут видны номер платежа, дата, комментарий и кто провёл оплату.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPaymentModal(null)} className="rounded-2xl border border-gray-200 px-4 py-2 text-[14px] font-bold">Отмена</button>
              <button type="button" disabled={saving} onClick={() => void markPayoutPaid()} className="rounded-2xl bg-emerald-600 px-4 py-2 text-[14px] font-bold text-white disabled:bg-gray-300">Подтвердить оплату</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
