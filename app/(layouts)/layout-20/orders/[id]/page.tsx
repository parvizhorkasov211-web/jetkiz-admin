"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  Store,
  ShoppingBag,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type OrderItem = { id: string; title: string; price: number; quantity: number };
type CourierShort = {
  userId: string; firstName: string; lastName: string; isOnline?: boolean;
  user?: { phone?: string };
};
type OrderDetails = {
  id: string; number?: number | null; status: string;
  subtotal: number; deliveryFee: number; total: number;
  phone: string; comment?: string | null; leaveAtDoor?: boolean;
  paymentMethod?: string; paymentStatus?: string; createdAt: string;
  deliveryType?: string | null; fulfillmentType?: string | null; orderType?: string | null;
  isPickup?: boolean | null; address?: string | null; deliveryAddress?: string | null;
  restaurant?: { id: string; nameRu: string }; items?: OrderItem[];
  courierId?: string | null; courierFee?: number; assignedAt?: string | null;
  pickedUpAt?: string | null; deliveredAt?: string | null;
  courier?: { userId: string; firstName: string; lastName: string; isOnline?: boolean; user?: { phone?: string } } | null;
};

function isPickupOrder(order: OrderDetails) {
  if (typeof order.isPickup === "boolean") return order.isPickup;
  const type = (order.deliveryType ?? order.fulfillmentType ?? order.orderType ?? "").toUpperCase();
  return ["PICKUP", "SELF_PICKUP", "TAKEAWAY", "SELF", "Самовывоз"].includes(type);
}

const DELIVERED = ["DELIVERED", "COMPLETED"];
const CANCELLED = ["CANCELLED", "CANCELED", "REJECTED"];

function money(value?: number | null) { return `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`; }
function dateTime(value?: string | null) {
  if (!value) return "Ожидается";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function courierName(c?: OrderDetails["courier"] | CourierShort | null) {
  if (!c) return "Курьер не назначен";
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Курьер";
}
function paymentMethod(value?: string) {
  if (value?.toUpperCase() === "CASH") return "Наличные";
  if (value?.toUpperCase() === "CARD") return "Банковская карта";
  return value || "Не указан";
}
function paymentState(value?: string) {
  if (value?.toUpperCase() === "PAID") return "Оплачено";
  if (value?.toUpperCase() === "PENDING") return "Ожидает оплаты";
  if (value?.toUpperCase() === "FAILED") return "Ошибка оплаты";
  return value || "Не указан";
}
function statusUi(status?: string) {
  const value = status?.toUpperCase() ?? "";
  if (DELIVERED.includes(value)) return { label: "Доставлен", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (CANCELLED.includes(value)) return { label: "Отменён", cls: "bg-rose-50 text-rose-700", dot: "bg-rose-500" };
  if (["ON_THE_WAY", "IN_DELIVERY", "PICKED_UP"].includes(value)) return { label: "В пути", cls: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
  if (["READY", "COURIER_ASSIGNED", "ASSIGNED"].includes(value)) return { label: "Готов к выдаче", cls: "bg-violet-50 text-violet-700", dot: "bg-violet-500" };
  if (["COOKING", "PREPARING", "ACCEPTED"].includes(value)) return { label: "Готовится", cls: "bg-orange-50 text-orange-700", dot: "bg-orange-500" };
  return { label: "Новый", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)] ${className}`}>
    <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-black tracking-tight text-slate-950">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}</div>
    {children}
  </section>;
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [couriers, setCouriers] = useState<CourierShort[]>([]);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      setLoading(true); setError(null);
      const [currentOrder, courierData] = await Promise.all([
        apiFetch(`/orders/${id}`) as Promise<OrderDetails>,
        apiFetch("/couriers?page=1&limit=300") as Promise<{ items?: CourierShort[] }>,
      ]);
      setOrder(currentOrder); setCouriers(courierData?.items ?? []); setSelectedCourier(currentOrder.courierId ?? "");
    } catch (error: unknown) { setError(error instanceof Error ? error.message : "Не удалось загрузить заказ"); }
    finally { setLoading(false); }
  }
  // Загрузка должна повторяться только при переходе к другому заказу.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [id]);

  async function refreshOrder() {
    const current = (await apiFetch(`/orders/${id}`)) as OrderDetails;
    setOrder(current); setSelectedCourier(current.courierId ?? "");
  }
  async function perform(action: () => Promise<unknown>, fallback: string) {
    try { setWorking(true); setError(null); await action(); await refreshOrder(); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : fallback); }
    finally { setWorking(false); }
  }
  const assign = () => perform(() => apiFetch(`/orders/${id}/assign-courier`, { method: "PATCH", body: JSON.stringify({ courierUserId: selectedCourier }) }), "Не удалось назначить курьера");
  const autoAssign = () => perform(() => apiFetch(`/orders/${id}/auto-assign`, { method: "PATCH" }), "Не удалось подобрать курьера");
  const unassign = () => perform(() => apiFetch(`/orders/${id}/assign-courier`, { method: "PATCH", body: JSON.stringify({ courierUserId: null }) }), "Не удалось снять курьера");

  const itemTotal = useMemo(() => (order?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0), [order?.items]);

  if (loading) return <main className="min-h-screen bg-[#f6f7f9] p-6"><div className="h-48 animate-pulse rounded-3xl bg-white" /></main>;
  if (!order) return <main className="min-h-screen bg-[#f6f7f9] p-6"><div className="rounded-2xl border border-rose-200 bg-white p-6"><h1 className="font-bold text-rose-700">Заказ не загрузился</h1><p className="mt-2 text-sm text-slate-600">{error}</p><button onClick={() => router.back()} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Вернуться</button></div></main>;

  const ui = statusUi(order.status);
  const pickup = isPickupOrder(order);
  const timeline = pickup ? [
    { label: "Заказ создан", time: order.createdAt, done: true },
    { label: "Заказ готов к самовывозу", time: null, done: ["READY", ...DELIVERED].includes(order.status?.toUpperCase()) },
    { label: "Заказ выдан клиенту", time: order.deliveredAt, done: Boolean(order.deliveredAt) },
  ] : [
    { label: "Заказ создан", time: order.createdAt, done: true },
    { label: "Курьер назначен", time: order.assignedAt, done: Boolean(order.assignedAt) },
    { label: "Заказ забран", time: order.pickedUpAt, done: Boolean(order.pickedUpAt) },
    { label: "Заказ доставлен", time: order.deliveredAt, done: Boolean(order.deliveredAt) },
  ];

  return <main className="min-h-screen bg-[#f6f7f9] p-4 text-slate-950 sm:p-6 xl:p-8">
    <div className="mx-auto max-w-[1600px]">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"><ArrowLeft className="h-4 w-4" /> К списку заказов</button>

      <header className="mb-5 rounded-2xl bg-slate-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${ui.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />{ui.label}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${pickup ? "bg-violet-400/15 text-violet-200" : "bg-blue-400/15 text-blue-200"}`}>{pickup ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}{pickup ? "Самовывоз" : "Доставка"}</span><span className="text-xs text-slate-400">{dateTime(order.createdAt)}</span></div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Заказ {order.number != null ? `#${order.number}` : "без номера"}</h1><p className="mt-2 text-sm text-slate-400">{order.restaurant?.nameRu || "Ресторан не указан"}</p></div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3"><div className="text-[11px] text-slate-400">Сумма</div><div className="mt-0.5 text-lg font-black">{money(order.total)}</div></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3"><div className="text-[11px] text-slate-400">Оплата</div><div className="mt-0.5 text-sm font-bold">{paymentState(order.paymentStatus)}</div></div>
            <button onClick={() => void load()} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 sm:col-auto"><RefreshCw className="h-4 w-4" /> Обновить</button>
          </div>
        </div>
      </header>

      {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <div className="space-y-5">
          <Panel title="Состав заказа" subtitle={`${order.items?.length ?? 0} позиций`}>
            <div className="divide-y divide-slate-100">
              {(order.items ?? []).map((item) => <div key={item.id} className="flex items-center gap-4 px-5 py-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-orange-600">{item.quantity}×</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-slate-900">{item.title}</div><div className="mt-0.5 text-xs text-slate-400">{money(item.price)} за единицу</div></div><div className="text-sm font-black text-slate-950">{money(item.price * item.quantity)}</div></div>)}
              {!order.items?.length && <div className="px-5 py-10 text-center text-sm text-slate-400">В заказе нет позиций</div>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-4"><span className="text-sm font-semibold text-slate-500">Сумма блюд</span><span className="text-lg font-black">{money(itemTotal)}</span></div>
          </Panel>

          <Panel title={pickup ? "Клиент и самовывоз" : "Клиент и доставка"}>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Phone className="h-4 w-4" /> Телефон клиента</div><div className="mt-2 text-sm font-bold text-slate-900">{order.phone || "Не указан"}</div></div>
              <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400">{pickup ? <ShoppingBag className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} Способ получения</div><div className="mt-2 text-sm font-bold text-slate-900">{pickup ? "Самовывоз из ресторана" : order.leaveAtDoor ? "Доставка — оставить у двери" : "Доставка — передать лично"}</div>{!pickup && (order.deliveryAddress || order.address) && <div className="mt-1 text-xs text-slate-500">{order.deliveryAddress || order.address}</div>}</div>
              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2"><div className="text-xs font-semibold text-slate-400">Комментарий клиента</div><div className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">{order.comment || "Комментарий не оставлен"}</div></div>
            </div>
          </Panel>

          <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4"><div><h2 className="text-base font-black">Финансы и оплата</h2><p className="mt-0.5 text-xs text-slate-500">Подробная разбивка суммы заказа</p></div><ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" /></summary>
            <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {[["Блюда", money(order.subtotal)], ["Доставка", money(order.deliveryFee)], ["Итого", money(order.total)], ["Начисление курьеру", money(order.courierFee)], ["Способ оплаты", paymentMethod(order.paymentMethod)], ["Статус оплаты", paymentState(order.paymentStatus)]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-medium text-slate-400">{label}</div><div className="mt-1 text-sm font-black text-slate-900">{value}</div></div>)}
            </div>
          </details>

          <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4"><div><h2 className="text-base font-black">Служебные действия</h2><p className="mt-0.5 text-xs text-slate-500">Доступны только администраторам</p></div><ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" /></summary>
            <div className="border-t border-slate-100 p-5 text-sm text-slate-500">Принудительное изменение статуса скрыто в служебном разделе и не отвлекает от работы с заказом.</div>
          </details>
        </div>

        <aside className="space-y-5">
          {pickup ? <Panel title="Самовывоз" subtitle="Курьер для этого заказа не требуется">
            <div className="p-5"><div className="flex items-center gap-3 rounded-xl bg-violet-50 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><ShoppingBag className="h-5 w-5" /></div><div><div className="text-sm font-black text-slate-900">Клиент заберёт заказ сам</div><div className="mt-0.5 text-xs text-slate-500">Выбор курьера отключён</div></div></div></div>
          </Panel> : <Panel title="Курьер" subtitle={order.courier?.isOnline ? "Сейчас онлайн" : order.courier ? "Сейчас офлайн" : "Ожидает назначения"}>
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${order.courier ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500"}`}><Bike className="h-5 w-5" /></div><div className="min-w-0"><div className="truncate text-sm font-black text-slate-900">{courierName(order.courier)}</div>{order.courier?.user?.phone && <div className="mt-0.5 text-xs text-slate-400">{order.courier.user.phone}</div>}</div></div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">Выбрать курьера</label>
              <select value={selectedCourier} onChange={(e) => setSelectedCourier(e.target.value)} disabled={working} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400"><option value="">Выберите из списка</option>{couriers.map((c) => <option key={c.userId} value={c.userId}>{c.isOnline ? "Онлайн — " : "Офлайн — "}{courierName(c)}</option>)}</select>
              <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={assign} disabled={working || !selectedCourier} className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">Назначить</button><button onClick={autoAssign} disabled={working} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f05a2a] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" /> Подобрать</button></div>
              {order.courierId && <button onClick={unassign} disabled={working} className="mt-2 w-full rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-40">Снять курьера</button>}
            </div>
          </Panel>}

          <Panel title="История заказа" subtitle="Основные этапы выполнения">
            <div className="p-5">
              {timeline.map((event, index) => <div key={event.label} className="relative flex gap-3 pb-6 last:pb-0">{index < timeline.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-px ${event.done ? "bg-slate-300" : "bg-slate-100"}`} />}<span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${event.done ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-300"}`}>{event.done ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}</span><div><div className={`text-sm font-bold ${event.done ? "text-slate-900" : "text-slate-400"}`}>{event.label}</div><div className="mt-0.5 text-xs text-slate-400">{dateTime(event.time)}</div></div></div>)}
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4"><Store className="h-4 w-4 text-orange-500" /><div className="mt-3 text-[11px] font-semibold text-slate-400">Ресторан</div><div className="mt-1 truncate text-sm font-black">{order.restaurant?.nameRu || "Не указан"}</div></div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4"><CreditCard className="h-4 w-4 text-blue-500" /><div className="mt-3 text-[11px] font-semibold text-slate-400">Оплата</div><div className="mt-1 truncate text-sm font-black">{paymentMethod(order.paymentMethod)}</div></div>
          </div>
        </aside>
      </div>
    </div>
  </main>;
}
