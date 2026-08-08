"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronDown,
  Clock3,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type OrderRow = {
  id: string;
  number?: number | null;
  createdAt: string;
  status: string;
  total: number;
  phone?: string | null;
  deliveryType?: string | null;
  fulfillmentType?: string | null;
  orderType?: string | null;
  isPickup?: boolean | null;
  restaurant?: { id: string; nameRu?: string | null; nameKk?: string | null };
  courier?: {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
};

function isPickupOrder(order: OrderRow) {
  if (typeof order.isPickup === "boolean") return order.isPickup;
  const type = (order.deliveryType ?? order.fulfillmentType ?? order.orderType ?? "").toUpperCase();
  return ["PICKUP", "SELF_PICKUP", "TAKEAWAY", "SELF", "Самовывоз"].includes(type);
}

type StatusFilter = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";

const ACTIVE_STATUSES = [
  "CREATED",
  "NEW",
  "PENDING",
  "ACCEPTED",
  "COOKING",
  "PREPARING",
  "READY",
  "COURIER_ASSIGNED",
  "ASSIGNED",
  "ON_THE_WAY",
  "IN_DELIVERY",
  "PICKED_UP",
];
const DELIVERED_STATUSES = ["DELIVERED", "COMPLETED"];
const CANCELLED_STATUSES = ["CANCELLED", "CANCELED", "REJECTED"];

function formatRestaurant(order: OrderRow) {
  return order.restaurant?.nameRu ?? order.restaurant?.nameKk ?? "Ресторан не указан";
}

function formatCourier(order: OrderRow) {
  if (!order.courier) return "Не назначен";
  return `${order.courier.firstName ?? ""} ${order.courier.lastName ?? ""}`.trim() || "Курьер";
}

function formatMoney(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: value, time: "" };
  return {
    day: date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
    time: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
}

function statusUi(status?: string) {
  const value = (status ?? "").toUpperCase();
  if (DELIVERED_STATUSES.includes(value))
    return { label: "Доставлен", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (CANCELLED_STATUSES.includes(value))
    return { label: "Отменён", className: "bg-rose-50 text-rose-700", dot: "bg-rose-500" };
  if (["ON_THE_WAY", "IN_DELIVERY", "PICKED_UP"].includes(value))
    return { label: "В пути", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
  if (["READY", "COURIER_ASSIGNED", "ASSIGNED"].includes(value))
    return { label: "Готов к выдаче", className: "bg-violet-50 text-violet-700", dot: "bg-violet-500" };
  if (["COOKING", "PREPARING", "ACCEPTED"].includes(value))
    return { label: "Готовится", className: "bg-orange-50 text-orange-700", dot: "bg-orange-500" };
  if (["CREATED", "NEW", "PENDING"].includes(value))
    return { label: "Новый", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  return { label: status || "Без статуса", className: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };
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
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  async function load(silent = false) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = (await apiFetch("/orders?limit=200")) as OrderRow[] | { items?: OrderRow[]; data?: OrderRow[] };
      setRows(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const delivered = rows.filter((o) => DELIVERED_STATUSES.includes(o.status?.toUpperCase()));
    const active = rows.filter((o) => ACTIVE_STATUSES.includes(o.status?.toUpperCase()));
    const cancelled = rows.filter((o) => CANCELLED_STATUSES.includes(o.status?.toUpperCase()));
    return {
      total: rows.length,
      active: active.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      revenue: delivered.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((order) => {
      const status = order.status?.toUpperCase();
      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && ACTIVE_STATUSES.includes(status)) ||
        (filter === "DELIVERED" && DELIVERED_STATUSES.includes(status)) ||
        (filter === "CANCELLED" && CANCELLED_STATUSES.includes(status));
      if (!matchesFilter) return false;
      if (!needle) return true;
      return [order.number, order.phone, formatRestaurant(order), formatCourier(order), statusUi(order.status).label]
        .some((value) => String(value ?? "").toLowerCase().includes(needle));
    });
  }, [rows, query, filter]);

  if (loading) {
    return <div className="min-h-screen bg-[#f6f7f9] p-4 sm:p-6"><div className="h-40 animate-pulse rounded-3xl bg-white" /></div>;
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
          <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Обновляем" : "Обновить"}
          </button>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Metric icon={<PackageSearch className="h-5 w-5" />} label="Всего" value={String(stats.total)} accent="bg-slate-100 text-slate-700" />
          <Metric icon={<Clock3 className="h-5 w-5" />} label="В работе" value={String(stats.active)} accent="bg-orange-50 text-orange-600" />
          <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Доставлено" value={String(stats.delivered)} accent="bg-emerald-50 text-emerald-600" />
          <Metric icon={<XCircle className="h-5 w-5" />} label="Отменено" value={String(stats.cancelled)} accent="bg-rose-50 text-rose-600" />
          <div className="col-span-2 xl:col-span-1"><Metric icon={<span className="text-base font-black">₸</span>} label="Выручка" value={formatMoney(stats.revenue)} accent="bg-blue-50 text-blue-600" /></div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Номер заказа, телефон, ресторан или курьер" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#f05a2a]/50 focus:bg-white focus:ring-4 focus:ring-[#f05a2a]/10" />
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {([
                ["ALL", "Все", stats.total], ["ACTIVE", "В работе", stats.active], ["DELIVERED", "Доставлены", stats.delivered], ["CANCELLED", "Отменены", stats.cancelled],
              ] as [StatusFilter, string, number][]).map(([value, label, count]) => (
                <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${filter === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label} <span className="ml-1 text-slate-400">{count}</span></button>
              ))}
            </div>
          </div>

          {error && <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-5 py-3.5">Заказ</th><th className="px-4 py-3.5">Время</th><th className="px-4 py-3.5">Получение</th><th className="px-4 py-3.5">Ресторан</th><th className="px-4 py-3.5">Курьер</th><th className="px-4 py-3.5">Статус</th><th className="px-4 py-3.5 text-right">Сумма</th><th className="w-14 px-4 py-3.5" />
              </tr></thead>
              <tbody>
                {filtered.map((order) => {
                  const date = formatOrderDate(order.createdAt);
                  const ui = statusUi(order.status);
                  const pickup = isPickupOrder(order);
                  return <tr key={order.id} onClick={() => router.push(`/layout-20/orders/${order.id}`)} className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-[#fffaf7]">
                    <td className="px-5 py-4"><div className="text-base font-black tracking-tight text-slate-950">{order.number != null ? `#${order.number}` : "Без номера"}</div>{order.phone && <div className="mt-0.5 text-xs text-slate-400">{order.phone}</div>}</td>
                    <td className="px-4 py-4"><div className="text-sm font-semibold text-slate-700">{date.time}</div><div className="text-xs text-slate-400">{date.day}</div></td>
                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${pickup ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{pickup ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}{pickup ? "Самовывоз" : "Доставка"}</span></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Store className="h-4 w-4" /></span><span className="max-w-[220px] truncate text-sm font-semibold text-slate-800">{formatRestaurant(order)}</span></div></td>
                    <td className="px-4 py-4">{pickup ? <span className="text-sm font-medium text-slate-400">Не требуется</span> : <div className="flex items-center gap-2.5"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${order.courier ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}><Bike className="h-4 w-4" /></span><span className={`max-w-[190px] truncate text-sm font-medium ${order.courier ? "text-slate-700" : "text-slate-400"}`}>{formatCourier(order)}</span></div>}</td>
                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${ui.className}`}><span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />{ui.label}</span></td>
                    <td className="px-4 py-4 text-right text-sm font-black text-slate-950">{formatMoney(order.total)}</td>
                    <td className="px-4 py-4"><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#f05a2a]" /></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          {!filtered.length && <div className="flex flex-col items-center px-6 py-16 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><PackageSearch className="h-6 w-6" /></div><div className="font-bold text-slate-900">Заказы не найдены</div><div className="mt-1 text-sm text-slate-500">Измените поиск или выберите другой статус</div></div>}
          <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500"><span>Показано: <b className="text-slate-700">{filtered.length}</b></span><span className="inline-flex items-center gap-1">Сначала новые <ChevronDown className="h-3.5 w-3.5" /></span></footer>
        </section>
      </div>
    </main>
  );
}
