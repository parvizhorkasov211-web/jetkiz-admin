"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type CanonicalOrderStatus =
  | "CREATED"
  | "ACCEPTED"
  | "COOKING"
  | "READY"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELED"
  | "REJECTED"
  | "PAID";

type OrderRow = {
  id: string;
  number?: number | null;
  createdAt: string;
  status: CanonicalOrderStatus | string;
  fulfillmentType?: "DELIVERY" | "PICKUP" | string;
  total: number;
  phone?: string | null;
  restaurant?: {
    id: string;
    nameRu?: string | null;
    nameKk?: string | null;
  };
  courier?: {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    isOnline?: boolean;
    user?: { phone?: string | null };
  } | null;
};

type OrdersResponse = {
  total: number;
  items: OrderRow[];
};

type OrdersSummary = {
  total: number;
  active: number;
  delivered: number;
  canceled: number;
  rejected: number;
  statusCounts: Record<string, number>;
};

type FinanceSummaryResponse = {
  summary?: {
    platformGrossRevenue?: number;
    avgOrderValue?: number;
    deliveredOrdersCount?: number;
  };
};

type SessionResponse = {
  authenticated?: boolean;
  admin?: {
    roleCodes?: string[];
    roles?: string[];
    permissionCodes?: string[];
    permissions?: string[];
  } | null;
};

const PAGE_SIZE = 50;
const STATUS_OPTIONS: Array<{ value: "" | CanonicalOrderStatus; label: string }> = [
  { value: "", label: "Все статусы" },
  { value: "CREATED", label: "Создан" },
  { value: "ACCEPTED", label: "Принят" },
  { value: "COOKING", label: "Готовится" },
  { value: "READY", label: "Готов" },
  { value: "ON_THE_WAY", label: "В пути" },
  { value: "DELIVERED", label: "Доставлен" },
  { value: "CANCELED", label: "Отменён" },
  { value: "REJECTED", label: "Отклонён" },
];

function formatCourier(c: OrderRow["courier"]) {
  if (!c) return "Не назначен";
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  const phone = c.user?.phone ? ` (${c.user.phone})` : "";
  return (name || "Курьер") + phone;
}

function formatRestaurant(r: OrderRow["restaurant"]) {
  if (!r) return "—";
  return (r.nameRu ?? r.nameKk ?? "—") as string;
}

function formatMoney(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusUi(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "CREATED":
      return { label: "Создан", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
    case "ACCEPTED":
      return { label: "Принят", pill: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" };
    case "COOKING":
      return { label: "Готовится", pill: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" };
    case "READY":
      return { label: "Готов", pill: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" };
    case "ON_THE_WAY":
      return { label: "В пути", pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };
    case "DELIVERED":
      return { label: "Доставлен", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    case "CANCELED":
      return { label: "Отменён", pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" };
    case "REJECTED":
      return { label: "Отклонён", pill: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
    case "PAID":
      return { label: "Legacy PAID", pill: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" };
    default:
      return { label: status || "—", pill: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  }
}

function hasPermission(session: SessionResponse | null, permission: string) {
  const admin = session?.admin;
  const roles = admin?.roleCodes ?? admin?.roles ?? [];
  const permissions = admin?.permissionCodes ?? admin?.permissions ?? [];
  return (
    roles.includes("SUPER_ADMIN") ||
    permissions.includes("admin.full_access") ||
    permissions.includes(permission)
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm min-h-[132px] flex flex-col justify-between">
      <div className="text-sm font-semibold text-slate-500">{title}</div>
      <div>
        <div className="text-3xl font-bold leading-none text-slate-950 mb-2">{value}</div>
        <div className="text-sm text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const requestSeq = useRef(0);

  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryResponse | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<"" | CanonicalOrderStatus>("");
  const [page, setPage] = useState(1);

  const canReadFinance = useMemo(() => hasPermission(session, "finance.read"), [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let alive = true;
    fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as SessionResponse) : null))
      .then((data) => {
        if (alive) setSession(data);
      })
      .catch(() => {
        if (alive) setSession(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loadOrders = useCallback(
    async (showSpinner = false) => {
      const seq = ++requestSeq.current;
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      if (status) params.set("status", status);

      try {
        const [ordersData, summaryData] = await Promise.all([
          apiFetch<OrdersResponse>(`/orders?${params.toString()}`),
          apiFetch<OrdersSummary>("/orders/admin/summary"),
        ]);
        if (seq !== requestSeq.current) return;

        setRows(Array.isArray(ordersData?.items) ? ordersData.items : []);
        setTotal(Number(ordersData?.total ?? 0));
        setSummary(summaryData);
      } catch (cause) {
        if (seq !== requestSeq.current) return;
        setError(cause instanceof Error ? cause.message : "Ошибка загрузки заказов");
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [page, debouncedQ, status],
  );

  useEffect(() => {
    void loadOrders(true);
    const timer = window.setInterval(() => void loadOrders(false), 10_000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (!canReadFinance) {
      setFinanceSummary(null);
      setFinanceError(null);
      return;
    }

    let alive = true;
    const loadFinance = async () => {
      try {
        const data = await apiFetch<FinanceSummaryResponse>("/finance/summary?period=today");
        if (!alive) return;
        setFinanceSummary(data);
        setFinanceError(null);
      } catch (cause) {
        if (!alive) return;
        setFinanceSummary(null);
        setFinanceError(cause instanceof Error ? cause.message : "Финансы недоступны");
      }
    };

    void loadFinance();
    const timer = window.setInterval(() => void loadFinance(), 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [canReadFinance]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const canceledTotal = (summary?.canceled ?? 0) + (summary?.rejected ?? 0);
  const platformRevenue = financeSummary?.summary?.platformGrossRevenue;
  const averageOrder = financeSummary?.summary?.avgOrderValue;

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-slate-900 text-lg font-semibold mb-2">Загрузка заказов</div>
          <div className="text-slate-500">Получаем актуальные данные с backend...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f7fb] min-h-screen">
      <div className="max-w-none">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Заказы</h1>
            <p className="mt-2 text-sm text-slate-500">
              Серверный поиск, актуальные статусы и автоматическое обновление каждые 10 секунд
            </p>
          </div>

          <button
            onClick={() => void loadOrders(false)}
            disabled={refreshing}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            {refreshing ? "Обновление..." : "Обновить"}
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <StatCard title="Всего заказов" value={String(summary?.total ?? total)} subtitle="Все заказы в системе" />
          <StatCard title="Активные" value={String(summary?.active ?? 0)} subtitle="CREATED → ON_THE_WAY" />
          <StatCard title="Доставлено" value={String(summary?.delivered ?? 0)} subtitle={`Отменено/отклонено: ${canceledTotal}`} />
          <StatCard
            title="Доход JETKIZ сегодня"
            value={canReadFinance && platformRevenue != null ? formatMoney(platformRevenue) : "—"}
            subtitle={
              canReadFinance
                ? financeError
                  ? "Финансовая сводка временно недоступна"
                  : `Средний чек: ${formatMoney(averageOrder ?? 0)}`
                : "Нет права finance.read"
            }
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Поиск</span>
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Номер, UUID, телефон или ресторан"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">Статус</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as "" | CanonicalOrderStatus);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => {
                setQ("");
                setDebouncedQ("");
                setStatus("");
                setPage(1);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Сброс
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Список заказов</h2>
              <p className="mt-1 text-sm text-slate-500">
                Найдено: {total}. Страница {page} из {pageCount}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">№</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Заказ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Тип</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Дата</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Статус</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Сумма</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ресторан</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Курьер</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((order) => {
                  const ui = getStatusUi(order.status);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/layout-20/orders/${order.id}`)}
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                      title="Открыть заказ"
                    >
                      <td className="px-6 py-5 align-top text-base font-bold text-blue-600">
                        {order.number != null ? `#${order.number}` : "—"}
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="max-w-[260px] truncate text-sm font-bold text-slate-900">
                          {formatRestaurant(order.restaurant)}
                        </div>
                        <div className="mt-1 max-w-[260px] truncate text-xs text-slate-400">{order.id}</div>
                        {order.phone ? <div className="mt-1 text-xs text-slate-500">{order.phone}</div> : null}
                      </td>
                      <td className="px-6 py-5 align-top">
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                          {order.fulfillmentType === "PICKUP" ? "Самовывоз" : "Доставка"}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-top text-sm font-semibold text-slate-800">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-5 align-top">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${ui.pill}`}>
                          <span className={`h-2 w-2 rounded-full ${ui.dot}`} />
                          {ui.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-top text-sm font-bold text-slate-900">{formatMoney(order.total)}</td>
                      <td className="px-6 py-5 align-top text-sm font-semibold text-slate-800">{formatRestaurant(order.restaurant)}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="text-sm font-semibold text-slate-800">{formatCourier(order.courier)}</div>
                        {!order.courier ? <div className="mt-1 text-xs text-slate-400">Не назначен</div> : null}
                      </td>
                    </tr>
                  );
                })}

                {!rows.length ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="text-xl font-bold text-slate-900 mb-2">Ничего не найдено</div>
                      <div className="text-sm text-slate-500">Измени поиск или фильтр статуса</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50/60">
            <div className="text-sm text-slate-500">
              Показано {rows.length} из {total}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                ← Назад
              </button>
              <button
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                Вперёд →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
