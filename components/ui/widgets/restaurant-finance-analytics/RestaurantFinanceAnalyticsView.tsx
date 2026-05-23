"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
  Clock,
  Receipt,
  Percent,
  Building2,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

import {
  formatInteger,
  formatMoney,
} from "@/components/ui/widgets/restaurant-analytics/restaurant-analytics.mappers";

import { RestaurantAnalyticsEmptyState } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsEmptyState";
import { RestaurantAnalyticsErrorState } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsErrorState";
import { RestaurantAnalyticsSkeleton } from "@/components/ui/widgets/restaurant-analytics/RestaurantAnalyticsSkeleton";

type FinanceStatus = "all" | "PENDING" | "PAID" | "FAILED" | "CANCELED";

type FinanceSummary = {
  grossRevenue: number;
  payoutAmount: number;
  commissionAmount: number;
  ordersCount: number;
  payoutsCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
};

type PayoutRow = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: string;
  ordersCount: number;
  grossRevenue: number;
  payoutAmount: number;
  commissionAmount: number;
  periodFrom: string;
  periodTo: string;
  createdAt: string;
};

const statuses: Array<{ value: FinanceStatus; label: string }> = [
  { value: "all", label: "Все статусы" },
  { value: "PENDING", label: "Ожидает" },
  { value: "PAID", label: "Оплачено" },
  { value: "FAILED", label: "Ошибка" },
  { value: "CANCELED", label: "Отменено" },
];

const limits = [10, 20, 50, 100];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (!isRecord(value)) return [];

  for (const key of ["items", "data", "result", "payouts", "rows"]) {
    const item = value[key];
    if (Array.isArray(item)) return item;
  }

  return [];
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function formatDate(value: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ru-RU");
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Ожидает",
    PAID: "Оплачено",
    FAILED: "Ошибка",
    CANCELED: "Отменено",
  };

 return map[status] ?? (status || "—");
}

function getStatusClassName(status: string): string {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  if (status === "PENDING") return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
  if (status === "FAILED") return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  if (status === "CANCELED") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function mapPayout(value: unknown): PayoutRow {
  const data = asRecord(value);
  const restaurant = asRecord(data.restaurant);

  const restaurantId = asString(
    data.restaurantId ?? restaurant.id ?? data.restaurant_id,
  );

  const restaurantName = asString(
    data.restaurantNameRu ??
      data.restaurantName ??
      restaurant.nameRu ??
      restaurant.name ??
      restaurant.title,
    "Ресторан",
  );

  const grossRevenue = asNumber(
    data.grossRevenue ?? data.revenue ?? data.totalRevenue ?? data.ordersAmount,
  );

  const payoutAmount = asNumber(
    data.payoutAmount ?? data.amount ?? data.totalPayout ?? data.netAmount,
  );

  const commissionAmount = asNumber(
    data.commissionAmount ?? data.commission ?? data.platformCommission,
  );

  return {
    id: asString(data.id),
    restaurantId,
    restaurantName,
    status: asString(data.status, "PENDING"),
    ordersCount: asNumber(data.ordersCount ?? data.orders),
    grossRevenue,
    payoutAmount,
    commissionAmount,
    periodFrom: asString(data.periodFrom ?? data.from),
    periodTo: asString(data.periodTo ?? data.to),
    createdAt: asString(data.createdAt),
  };
}

function mapPayouts(value: unknown): PayoutRow[] {
  return toArray(value)
    .map(mapPayout)
    .filter((item) => item.id || item.restaurantId);
}

function mapSummary(value: unknown, payouts: PayoutRow[]): FinanceSummary {
  const data = asRecord(value);

  const grossRevenue = asNumber(
    data.grossRevenue ?? data.revenue ?? data.totalRevenue,
    payouts.reduce((sum, item) => sum + item.grossRevenue, 0),
  );

  const payoutAmount = asNumber(
    data.payoutAmount ?? data.totalPayout ?? data.totalPayoutAmount,
    payouts.reduce((sum, item) => sum + item.payoutAmount, 0),
  );

  const commissionAmount = asNumber(
    data.commissionAmount ?? data.totalCommission ?? data.totalCommissionAmount,
    payouts.reduce((sum, item) => sum + item.commissionAmount, 0),
  );

  const ordersCount = asNumber(
    data.ordersCount ?? data.totalOrders,
    payouts.reduce((sum, item) => sum + item.ordersCount, 0),
  );

  const payoutsCount = asNumber(data.payoutsCount ?? data.count, payouts.length);

  const paidCount = asNumber(
    data.paidCount,
    payouts.filter((item) => item.status === "PAID").length,
  );

  const pendingCount = asNumber(
    data.pendingCount,
    payouts.filter((item) => item.status === "PENDING").length,
  );

  const failedCount = asNumber(
    data.failedCount,
    payouts.filter((item) => item.status === "FAILED").length,
  );

  return {
    grossRevenue,
    payoutAmount,
    commissionAmount,
    ordersCount,
    payoutsCount,
    paidCount,
    pendingCount,
    failedCount,
  };
}

export function RestaurantFinanceAnalyticsView() {
  const [status, setStatus] = useState<FinanceStatus>("all");
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<FinanceSummary>({
    grossRevenue: 0,
    payoutAmount: 0,
    commissionAmount: 0,
    ordersCount: 0,
    payoutsCount: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });

  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    query.set("limit", String(limit));

    if (status !== "all") {
      query.set("status", status);
    }

    const [summaryRes, payoutsRes] = await Promise.allSettled([
      apiFetch("/finance/summary"),
      apiFetch(`/finance/restaurant-payouts?${query.toString()}`),
    ]);

    let mappedPayouts: PayoutRow[] = [];

    if (payoutsRes.status === "fulfilled") {
      mappedPayouts = mapPayouts(payoutsRes.value);
      setPayouts(mappedPayouts);
    } else {
      setPayouts([]);
    }

    if (summaryRes.status === "fulfilled") {
      setSummary(mapSummary(summaryRes.value, mappedPayouts));
    } else {
      setSummary(mapSummary({}, mappedPayouts));
    }

    if (summaryRes.status === "rejected" && payoutsRes.status === "rejected") {
      setError("Backend не вернул финансовую аналитику ресторанов.");
    }

    setLoading(false);
  }, [limit, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPayouts = useMemo(() => {
    const query = normalizeSearch(search);

    if (!query) return payouts;

    return payouts.filter((item) =>
      [
        item.restaurantName,
        item.restaurantId,
        item.id,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [payouts, search]);

  const filteredSummary = useMemo(() => {
    return mapSummary({}, filteredPayouts);
  }, [filteredPayouts]);

  function exportCsv() {
    const rows = [
      [
        "id",
        "restaurantId",
        "restaurantName",
        "status",
        "ordersCount",
        "grossRevenue",
        "payoutAmount",
        "commissionAmount",
        "periodFrom",
        "periodTo",
        "createdAt",
      ],
      ...filteredPayouts.map((item) => [
        item.id,
        item.restaurantId,
        item.restaurantName,
        item.status,
        item.ordersCount,
        item.grossRevenue,
        item.payoutAmount,
        item.commissionAmount,
        item.periodFrom,
        item.periodTo,
        item.createdAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `restaurant-finance-${status}-${limit}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading && payouts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <FinanceHeader
          status={status}
          limit={limit}
          loading={loading}
          onStatusChange={setStatus}
          onLimitChange={setLimit}
          onRefresh={loadData}
          onExport={exportCsv}
        />

        <RestaurantAnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <FinanceHeader
        status={status}
        limit={limit}
        loading={loading}
        onStatusChange={setStatus}
        onLimitChange={setLimit}
        onRefresh={loadData}
        onExport={exportCsv}
      />

      <div className="space-y-6 p-6">
        {error ? (
          <RestaurantAnalyticsErrorState message={error} onRetry={loadData} />
        ) : null}

        <FinanceHero
          summary={summary}
          filteredSummary={filteredSummary}
          filteredCount={filteredPayouts.length}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FinanceMetricCard
            title="К выплате"
            value={formatMoney(filteredSummary.payoutAmount)}
            description="Сумма выплат ресторанам"
            icon={Wallet}
            tone="success"
          />

          <FinanceMetricCard
            title="Комиссия"
            value={formatMoney(filteredSummary.commissionAmount)}
            description="Доход платформы"
            icon={Percent}
          />

          <FinanceMetricCard
            title="Gross revenue"
            value={formatMoney(filteredSummary.grossRevenue)}
            description="Оборот по заказам"
            icon={Receipt}
          />

          <FinanceMetricCard
            title="Заказы"
            value={formatInteger(filteredSummary.ordersCount)}
            description="Заказы в payout выборке"
            icon={Building2}
          />

          <FinanceMetricCard
            title="Payout записей"
            value={formatInteger(filteredPayouts.length)}
            description={`Загружено: ${formatInteger(payouts.length)}`}
            icon={Receipt}
          />

          <FinanceMetricCard
            title="Оплачено"
            value={formatInteger(filteredPayouts.filter((i) => i.status === "PAID").length)}
            description="PAID"
            icon={CheckCircle2}
            tone="success"
          />

          <FinanceMetricCard
            title="Ожидает"
            value={formatInteger(filteredPayouts.filter((i) => i.status === "PENDING").length)}
            description="PENDING"
            icon={Clock}
            tone="warning"
          />

          <FinanceMetricCard
            title="Ошибки"
            value={formatInteger(filteredPayouts.filter((i) => i.status === "FAILED").length)}
            description="FAILED"
            icon={XCircle}
            tone="danger"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Поиск ресторана / выплаты
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  disabled={loading}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Название ресторана, ID, статус..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Найдено
              </label>

              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                {formatInteger(filteredPayouts.length)} из{" "}
                {formatInteger(payouts.length)}
              </div>
            </div>
          </div>
        </div>

        <PayoutsTable payouts={filteredPayouts} />
      </div>
    </div>
  );
}

function FinanceHeader({
  status,
  limit,
  loading,
  onStatusChange,
  onLimitChange,
  onRefresh,
  onExport,
}: {
  status: FinanceStatus;
  limit: number;
  loading: boolean;
  onStatusChange: (value: FinanceStatus) => void;
  onLimitChange: (value: number) => void;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <Link
            href="/layout-20/restaurants/analytics"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 transition hover:text-violet-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Рестораны
          </Link>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Finance Center
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Финансы ресторанов
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Выплаты ресторанам, комиссия платформы, статусы выплат и экспорт.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          disabled={loading}
          onChange={(event) => onStatusChange(event.target.value as FinanceStatus)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={limit}
          disabled={loading}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {limits.map((item) => (
            <option key={item} value={item}>
              {item} записей
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
      </div>
    </div>
  );
}

function FinanceHero({
  summary,
  filteredSummary,
  filteredCount,
}: {
  summary: FinanceSummary;
  filteredSummary: FinanceSummary;
  filteredCount: number;
}) {
  const commissionRate =
    filteredSummary.grossRevenue > 0
      ? (filteredSummary.commissionAmount / filteredSummary.grossRevenue) * 100
      : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-violet-800 p-6 text-white shadow-sm">
      <div className="absolute right-[-90px] top-[-90px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-[-90px] left-[-90px] h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/15">
            <Wallet className="h-4 w-4" />
            Restaurant Finance
          </div>

          <div className="mt-5 text-sm text-emerald-100">
            К выплате ресторанам
          </div>

          <div className="mt-2 text-5xl font-black tracking-tight">
            {formatMoney(filteredSummary.payoutAmount)}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <HeroMiniStat label="Комиссия" value={formatMoney(filteredSummary.commissionAmount)} />
            <HeroMiniStat label="Gross" value={formatMoney(filteredSummary.grossRevenue)} />
            <HeroMiniStat label="Rate" value={`${commissionRate.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`} />
            <HeroMiniStat label="Payouts" value={formatInteger(filteredCount)} />
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
          <div className="text-sm font-semibold text-emerald-100">
            Общая выборка backend
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-100">Всего к выплате</span>
              <b>{formatMoney(summary.payoutAmount)}</b>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-100">Комиссия</span>
              <b>{formatMoney(summary.commissionAmount)}</b>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-100">Заказы</span>
              <b>{formatInteger(summary.ordersCount)}</b>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-100">Payout записей</span>
              <b>{formatInteger(summary.payoutsCount)}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
      <div className="text-xs font-medium text-emerald-100">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function FinanceMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Wallet;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const styles = {
    default: "bg-violet-50 text-violet-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-orange-50 text-orange-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-2 text-xs text-slate-500">{description}</div>
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PayoutsTable({ payouts }: { payouts: PayoutRow[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-950">Выплаты ресторанам</h2>
        <p className="mt-1 text-sm text-slate-500">
          Payout, комиссия, оборот, период и статус выплаты.
        </p>
      </div>

      <div className="overflow-x-auto">
        {payouts.length === 0 ? (
          <div className="p-5">
            <RestaurantAnalyticsEmptyState
              title="Выплат нет"
              description="Backend не вернул payout записи для выбранного фильтра."
            />
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Ресторан</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Период</th>
                <th className="px-5 py-4">Заказы</th>
                <th className="px-5 py-4">Gross revenue</th>
                <th className="px-5 py-4">Комиссия</th>
                <th className="px-5 py-4">К выплате</th>
                <th className="px-5 py-4">Создано</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {payouts.map((item) => (
                <tr key={item.id || `${item.restaurantId}-${item.periodFrom}`} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-950">
                      {item.restaurantName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.restaurantId || item.id}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClassName(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(item.periodFrom)} — {formatDate(item.periodTo)}
                  </td>

                  <td className="px-5 py-4">
                    {formatInteger(item.ordersCount)}
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {formatMoney(item.grossRevenue)}
                  </td>

                  <td className="px-5 py-4">
                    {formatMoney(item.commissionAmount)}
                  </td>

                  <td className="px-5 py-4 font-bold text-emerald-700">
                    {formatMoney(item.payoutAmount)}
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(item.createdAt)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    {item.restaurantId ? (
                      <Link
                        href={`/layout-20/restaurants/${item.restaurantId}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ресторан
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}