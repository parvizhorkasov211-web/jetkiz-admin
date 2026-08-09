"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock3,
  PackageSearch,
  RefreshCw,
  Search,
  Store,
  XCircle,
} from "lucide-react";
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
  if (Number.isNaN(d.getTime())) return { day: value, time: "" };
  return {
    day: d.toLocaleDateString("ru-RU", {
      timeZone: "Asia/Almaty",
      day: "2-digit",
      month: "short",
    }),
    time: d.toLocaleTimeString("ru-RU", {
      timeZone: "Asia/Almaty",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
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

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-lg font-bold tracking-tight text-slate-950">{value}</div>
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
      <div className="min-h-screen bg-[#f6f7f9] p-4 sm:p-6">
        <div className="h-40 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] p-4 text-slate-950 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f05a2a]">
              <span className="h-2 w-2 rounded-full bg-[#f05a2a]" /> Операционный центр
            </div>
            <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Заказы</h1>
            <p className="mt-1.5 text-sm text-slate-500">Все заказы и их текущий этап в одном рабочем списке</p>
          </div>
          <button
            onClick={() => void loadOrders(false)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Обновляем" : "Обновить"}
          </button>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Metric icon={<PackageSearch className="h-5 w-5" />} label="Всего" value={String(summary?.total ?? total)} accent="bg-slate-100 text-slate-700" />
          <Metric icon={<Clock3 className="h-5 w-5" />} label="В работе" value={String(summary?.active ?? 0)} accent="bg-orange-50 text-orange-600" />
          <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Доставлено" value={String(summary?.delivered ?? 0)} accent="bg-emerald-50 text-emerald-600" />
          <Metric icon={<XCircle className="h-5 w-5" />} label="Отменено" value={String(canceledTotal)} accent="bg-rose-50 text-rose-600" />
          <div className="col-span-2 xl:col-span-1">
            <Metric
              icon={<span className="text-base font-black">₸</span>}
              label="Доход сегодня"
              value={canReadFinance && platformRevenue != null ? formatMoney(platformRevenue) : "—"}
              accent="bg-blue-50 text-blue-600"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-lg">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Номер заказа, телефон или ресторан"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#f05a2a]/50 focus:bg-white focus:ring-4 focus:ring-[#f05a2a]/10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as "" | CanonicalOrderStatus);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {(q || status) && (
                <button onClick={() => { setQ(""); setDebouncedQ(""); setStatus(""); setPage(1); }} className="h-11 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:text-slate-900">Сбросить</button>
              )}
            </div>
          </div>

          {error && <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {financeError && canReadFinance && <div className="mx-4 mt-4 text-xs text-slate-400">Финансовая сводка временно недоступна · Средний чек: {formatMoney(averageOrder ?? 0)}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3.5">Заказ</th><th className="px-4 py-3.5">Время</th><th className="px-4 py-3.5">Тип</th><th className="px-4 py-3.5">Ресторан</th><th className="px-4 py-3.5">Курьер</th><th className="px-4 py-3.5">Статус</th><th className="px-4 py-3.5 text-right">Сумма</th><th className="w-14 px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const ui = getStatusUi(order.status);
                  const date = formatDate(order.createdAt);
                  return (
                    <tr key={order.id} onClick={() => router.push(`/layout-20/orders/${order.id}`)} className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-[#fffaf7]">
                      <td className="px-5 py-4"><div className="text-base font-black tracking-tight">{order.number != null ? `#${order.number}` : "Без номера"}</div>{order.phone && <div className="mt-0.5 text-xs text-slate-400">{order.phone}</div>}</td>
                      <td className="px-4 py-4"><div className="text-sm font-semibold text-slate-700">{date.time}</div><div className="text-xs text-slate-400">{date.day}</div></td>
                      <td className="px-4 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${order.fulfillmentType === "PICKUP" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{order.fulfillmentType === "PICKUP" ? "Самовывоз" : "Доставка"}</span></td>
                      <td className="px-4 py-4"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Store className="h-4 w-4" /></span><span className="max-w-[220px] truncate text-sm font-semibold text-slate-800">{formatRestaurant(order.restaurant)}</span></div></td>
                      <td className="px-4 py-4"><div className="flex items-center gap-2.5"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${order.courier ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}><Bike className="h-4 w-4" /></span><span className={`max-w-[190px] truncate text-sm font-medium ${order.courier ? "text-slate-700" : "text-slate-400"}`}>{formatCourier(order.courier)}</span></div></td>
                      <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${ui.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />{ui.label}</span></td>
                      <td className="px-4 py-4 text-right text-sm font-black">{formatMoney(order.total)}</td>
                      <td className="px-4 py-4"><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#f05a2a]" /></td>
                    </tr>
                  );
                })}
                {!rows.length ? (
                  <tr><td colSpan={8} className="px-6 py-16 text-center"><PackageSearch className="mx-auto mb-3 h-7 w-7 text-slate-300" /><div className="font-bold text-slate-900">Заказы не найдены</div><div className="mt-1 text-sm text-slate-500">Измените поиск или выберите другой статус</div></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <div className="text-xs text-slate-500">Показано <b className="text-slate-700">{rows.length}</b> из {total} · Страница {page} из {pageCount}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">← Назад</button>
              <button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Вперёд →</button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
