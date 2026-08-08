"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type OrderItem = {
  id: string;
  productId?: string;
  title: string;
  price: number;
  quantity: number;
};

type CourierShort = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  isOnline?: boolean;
  user?: { phone?: string | null };
};

type AddressDetails = {
  id: string;
  title?: string | null;
  address?: string | null;
  floor?: string | null;
  door?: string | null;
  entrance?: string | null;
  intercom?: string | null;
  contactPhone?: string | null;
  comment?: string | null;
};

type OrderDetails = {
  id: string;
  number?: number | null;
  status: CanonicalOrderStatus | string;
  fulfillmentType?: "DELIVERY" | "PICKUP" | string;

  subtotal: number;
  deliveryFee: number;
  discountAmount?: number | null;
  deliveryDiscountAmount?: number | null;
  total: number;

  phone: string;
  comment?: string | null;
  leaveAtDoor?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  promisedAt?: string | null;

  pricingSource?: string | null;
  courierBonusApplied?: number | null;
  courierFeeGross?: number | null;
  courierCommissionPctApplied?: number | null;
  courierCommissionAmount?: number | null;
  courierFee?: number | null;
  restaurantCommissionPctApplied?: number | null;
  restaurantCommissionAmount?: number | null;
  restaurantPayoutAmount?: number | null;
  restaurantPayoutId?: string | null;
  courierPayoutId?: string | null;

  restaurant?: {
    id: string;
    nameRu?: string | null;
    nameKk?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  user?: {
    id: string;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  address?: AddressDetails | null;
  items?: OrderItem[];

  courierId?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  courier?: {
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    isOnline?: boolean;
    user?: { phone?: string | null };
  } | null;
};

type CouriersListResponse = {
  items: CourierShort[];
  total?: number;
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

type HistoryActor = {
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type OrderTimelineItem = {
  id: string;
  kind: "ORDER_CREATED" | "STATUS_HISTORY" | "ADMIN_AUDIT" | string;
  createdAt: string;
  data?: {
    fromStatus?: string | null;
    toStatus?: string | null;
    reason?: string | null;
    action?: string;
    metadata?: Record<string, unknown> | null;
    changedByUser?: HistoryActor | null;
    changedByAdminUser?: { user?: HistoryActor | null } | null;
    adminUser?: { user?: HistoryActor | null } | null;
  };
};

type OrderHistoryResponse = {
  timeline?: OrderTimelineItem[];
  statusHistory?: unknown[];
  adminAudit?: unknown[];
};

const ASSIGNABLE_STATUSES = new Set(["ACCEPTED", "COOKING", "READY"]);

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

function formatCourier(c?: CourierShort | OrderDetails["courier"] | null) {
  if (!c) return "Не назначен";
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Курьер";
  const phone = c.user?.phone ? ` (${c.user.phone})` : "";
  return `${name}${phone}`;
}

function formatMoney(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ru-RU")} ₸`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusLabel(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "CREATED": return "Создан";
    case "ACCEPTED": return "Принят";
    case "COOKING": return "Готовится";
    case "READY": return "Готов";
    case "ON_THE_WAY": return "В пути";
    case "DELIVERED": return "Доставлен";
    case "CANCELED": return "Отменён";
    case "REJECTED": return "Отклонён";
    case "PAID": return "Legacy PAID";
    default: return status || "—";
  }
}

function getStatusUi(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "CREATED": return { label: "Создан", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
    case "ACCEPTED": return { label: "Принят", pill: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" };
    case "COOKING": return { label: "Готовится", pill: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" };
    case "READY": return { label: "Готов", pill: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" };
    case "ON_THE_WAY": return { label: "В пути", pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };
    case "DELIVERED": return { label: "Доставлен", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    case "CANCELED": return { label: "Отменён", pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" };
    case "REJECTED": return { label: "Отклонён", pill: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
    default: return { label: status || "—", pill: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  }
}

function paymentMethodLabel(value?: string) {
  if (!value) return "—";
  if (value.toUpperCase() === "CASH") return "Наличные";
  if (value.toUpperCase() === "CARD") return "Карта";
  return value;
}

function paymentStatusLabel(value?: string) {
  if (!value) return "—";
  switch (value.toUpperCase()) {
    case "PENDING": return "Ожидает";
    case "PAID": return "Оплачено";
    case "FAILED": return "Ошибка";
    default: return value;
  }
}

function getAllowedAdminStatuses(order: OrderDetails): CanonicalOrderStatus[] {
  const status = order.status.toUpperCase();
  const pickup = order.fulfillmentType === "PICKUP";

  switch (status) {
    case "CREATED":
      return ["ACCEPTED", "REJECTED", "CANCELED"];
    case "ACCEPTED":
      return ["COOKING", "CANCELED"];
    case "COOKING":
      return ["READY", "CANCELED"];
    case "READY":
      return pickup ? ["CANCELED"] : ["ON_THE_WAY", "CANCELED"];
    case "ON_THE_WAY":
      return pickup ? ["CANCELED"] : ["DELIVERED", "CANCELED"];
    default:
      return [];
  }
}

function actorLabel(item: OrderTimelineItem) {
  const data = item.data;
  const actor = data?.changedByAdminUser?.user ?? data?.adminUser?.user ?? data?.changedByUser;
  if (!actor) return "Система";
  const name = `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim();
  return name || actor.email || actor.phone || "Пользователь";
}

function timelineTitle(item: OrderTimelineItem) {
  if (item.kind === "ORDER_CREATED") return "Заказ создан";
  if (item.kind === "STATUS_HISTORY") {
    return `${statusLabel(item.data?.fromStatus)} → ${statusLabel(item.data?.toStatus)}`;
  }
  if (item.kind === "ADMIN_AUDIT") return item.data?.action || "Действие администратора";
  return item.kind;
}

function addressText(address?: AddressDetails | null) {
  if (!address) return "Адрес не указан";
  return address.address || address.title || "Адрес не указан";
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

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";
  const requestSeq = useRef(0);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [history, setHistory] = useState<OrderHistoryResponse | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [couriers, setCouriers] = useState<CourierShort[]>([]);

  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [courierListError, setCourierListError] = useState<string | null>(null);

  const [selectedCourierUserId, setSelectedCourierUserId] = useState("");
  const [nextStatus, setNextStatus] = useState<CanonicalOrderStatus | "">("");
  const [statusReason, setStatusReason] = useState("");

  const canAssignCourier = useMemo(() => hasPermission(session, "orders.assign_courier"), [session]);
  const canForceStatus = useMemo(() => hasPermission(session, "orders.force_status"), [session]);
  const canReadCouriers = useMemo(() => hasPermission(session, "couriers.read"), [session]);

  const isDelivery = order?.fulfillmentType !== "PICKUP";
  const canMutateCourier = Boolean(
    order &&
      isDelivery &&
      canAssignCourier &&
      ASSIGNABLE_STATUSES.has(order.status.toUpperCase()),
  );
  const canAutoAssign = Boolean(
    order &&
      isDelivery &&
      canAssignCourier &&
      order.status.toUpperCase() === "READY" &&
      !order.courierId,
  );

  const statusUi = useMemo(() => getStatusUi(order?.status), [order?.status]);
  const allowedStatuses = useMemo(() => (order ? getAllowedAdminStatuses(order) : []), [order]);

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

  const loadOrderAndHistory = useCallback(
    async (showSpinner = false) => {
      if (!id) return;
      const seq = ++requestSeq.current;
      if (showSpinner) setLoading(true);

      try {
        const orderData = await apiFetch<OrderDetails>(`/orders/${id}`);
        if (seq !== requestSeq.current) return;
        setOrder(orderData);
        setSelectedCourierUserId(orderData.courierId || "");
        setErr(null);

        try {
          const historyData = await apiFetch<OrderHistoryResponse>(`/orders/${id}/history`);
          if (seq === requestSeq.current) {
            setHistory(historyData);
            setHistoryError(null);
          }
        } catch (cause) {
          if (seq === requestSeq.current) {
            setHistory(null);
            setHistoryError(cause instanceof Error ? cause.message : "История недоступна");
          }
        }
      } catch (cause) {
        if (seq !== requestSeq.current) return;
        setErr(cause instanceof Error ? cause.message : "Ошибка загрузки заказа");
        if (!order) setOrder(null);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [id, order],
  );

  useEffect(() => {
    void loadOrderAndHistory(true);
    const timer = window.setInterval(() => {
      if (!mutating) void loadOrderAndHistory(false);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [loadOrderAndHistory, mutating]);

  useEffect(() => {
    if (!canReadCouriers || !isDelivery) {
      setCouriers([]);
      setCourierListError(null);
      return;
    }

    let alive = true;
    apiFetch<CouriersListResponse>("/couriers?page=1&limit=300&active=true")
      .then((data) => {
        if (!alive) return;
        setCouriers(Array.isArray(data?.items) ? data.items : []);
        setCourierListError(null);
      })
      .catch((cause) => {
        if (!alive) return;
        setCouriers([]);
        setCourierListError(cause instanceof Error ? cause.message : "Список курьеров недоступен");
      });

    return () => {
      alive = false;
    };
  }, [canReadCouriers, isDelivery]);

  async function runMutation(action: () => Promise<unknown>) {
    setMutating(true);
    setErr(null);
    try {
      await action();
      await loadOrderAndHistory(false);
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Операция не выполнена");
      await loadOrderAndHistory(false).catch(() => undefined);
    } finally {
      setMutating(false);
    }
  }

  async function assignCourier() {
    if (!selectedCourierUserId || !canMutateCourier || !canReadCouriers) return;
    await runMutation(() =>
      apiFetch(`/orders/${id}/assign-courier`, {
        method: "PATCH",
        body: JSON.stringify({ courierUserId: selectedCourierUserId }),
      }),
    );
  }

  async function autoAssign() {
    if (!canAutoAssign) return;
    await runMutation(() =>
      apiFetch("/dispatch/assign-best", {
        method: "PATCH",
        body: JSON.stringify({ orderId: id, reason: "admin_order_page_auto_assign" }),
      }),
    );
  }

  async function unassign() {
    if (!order?.courierId || !canMutateCourier) return;
    await runMutation(() =>
      apiFetch(`/orders/${id}/unassign-courier`, { method: "PATCH" }),
    );
  }

  async function forceStatus() {
    const reason = statusReason.trim();
    if (!nextStatus || !canForceStatus || mutating) return;
    if (reason.length < 3 || reason.length > 500) {
      setErr("Причина изменения статуса должна содержать от 3 до 500 символов");
      return;
    }

    await runMutation(() =>
      apiFetch(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason }),
      }),
    );
    setNextStatus("");
    setStatusReason("");
  }

  if (loading && !order) {
    return (
      <div className="p-6 bg-[#f5f7fb] min-h-screen">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-slate-900 text-lg font-semibold mb-2">Загрузка заказа</div>
          <div className="text-slate-500">Получаем заказ и историю изменений...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 bg-[#f5f7fb] min-h-screen">
        <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <div className="text-rose-700 text-lg font-semibold mb-2">Заказ не загружен</div>
          <div className="text-slate-700 mb-4">{err || "Заказ не найден"}</div>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white" onClick={() => router.back()}>
            Назад
          </button>
        </div>
      </div>
    );
  }

  const timeline = Array.isArray(history?.timeline) ? history!.timeline! : [];

  return (
    <div className="p-6 bg-[#f5f7fb] min-h-screen">
      <div className="max-w-none">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <button
              className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => router.back()}
            >
              ← Назад
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Заказ {order.number != null ? `#${order.number}` : ""}
              </h1>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${statusUi.pill}`}>
                <span className={`h-2 w-2 rounded-full ${statusUi.dot}`} />
                {statusUi.label}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                {order.fulfillmentType === "PICKUP" ? "Самовывоз" : "Доставка"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500 break-all">{order.id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Создан</div>
              <div className="text-sm font-bold text-slate-900">{formatDate(order.createdAt)}</div>
            </div>
            <button
              disabled={mutating}
              onClick={() => void loadOrderAndHistory(false)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 disabled:opacity-50"
            >
              Обновить
            </button>
          </div>
        </div>

        {err ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{err}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <StatCard title="Итого" value={formatMoney(order.total)} subtitle={`Subtotal: ${formatMoney(order.subtotal)}`} />
          <StatCard title="Оплата" value={paymentStatusLabel(order.paymentStatus)} subtitle={paymentMethodLabel(order.paymentMethod)} />
          <StatCard
            title="Курьеру NET"
            value={isDelivery ? formatMoney(order.courierFee ?? 0) : "—"}
            subtitle={isDelivery ? `Gross: ${formatMoney(order.courierFeeGross ?? 0)}` : "Для самовывоза курьер не используется"}
          />
          <StatCard title="Ресторану" value={formatMoney(order.restaurantPayoutAmount ?? 0)} subtitle={`Комиссия: ${formatMoney(order.restaurantCommissionAmount ?? 0)}`} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Доставка / самовывоз</h2>
            {isDelivery ? (
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500">Адрес:</span> <span className="font-bold text-slate-900">{addressText(order.address)}</span></div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Подъезд</div><div className="font-bold">{order.address?.entrance || "—"}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Этаж</div><div className="font-bold">{order.address?.floor || "—"}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Дверь</div><div className="font-bold">{order.address?.door || "—"}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Домофон</div><div className="font-bold">{order.address?.intercom || "—"}</div></div>
                </div>
                <div><span className="text-slate-500">Контакт:</span> <span className="font-semibold">{order.address?.contactPhone || order.phone || "—"}</span></div>
                <div><span className="text-slate-500">Комментарий к адресу:</span> <span className="font-semibold">{order.address?.comment || "—"}</span></div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl bg-blue-50 p-4 text-blue-800 font-semibold">
                  Самовывоз: назначение и dispatch курьера отключены.
                </div>
                <div><span className="text-slate-500">Ресторан:</span> <span className="font-bold">{order.restaurant?.nameRu || order.restaurant?.nameKk || "—"}</span></div>
                <div><span className="text-slate-500">Адрес ресторана:</span> <span className="font-semibold">{order.restaurant?.address || "—"}</span></div>
                <div><span className="text-slate-500">Телефон ресторана:</span> <span className="font-semibold">{order.restaurant?.phone || "—"}</span></div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Основная информация</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Клиент</div><div className="mt-1 text-sm font-bold">{`${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim() || "—"}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Телефон</div><div className="mt-1 text-sm font-bold">{order.phone || order.user?.phone || "—"}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Ресторан</div><div className="mt-1 text-sm font-bold">{order.restaurant?.nameRu || order.restaurant?.nameKk || "—"}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Оставить у двери</div><div className="mt-1 text-sm font-bold">{order.leaveAtDoor ? "Да" : "Нет"}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2"><div className="text-xs text-slate-500">Комментарий</div><div className="mt-1 text-sm font-bold whitespace-pre-wrap">{order.comment || "—"}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2"><div className="text-xs text-slate-500">Обещанное время</div><div className="mt-1 text-sm font-bold">{formatDate(order.promisedAt)}</div></div>
            </div>
          </div>
        </div>

        {isDelivery ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Курьер</h2>
                <p className="mt-1 text-sm text-slate-500">Назначение разрешено только для ACCEPTED / COOKING / READY</p>
              </div>
              <div className={`rounded-full px-3 py-2 text-xs font-semibold ${order.courier?.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {order.courier ? (order.courier.isOnline ? "Онлайн" : "Офлайн") : "Не назначен"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 mb-5">
              <div className="text-xs font-medium text-slate-500 mb-1">Текущий курьер</div>
              <div className="text-xl font-bold text-slate-900">{formatCourier(order.courier)}</div>
              <div className="mt-2 text-sm text-slate-500">Назначен: {formatDate(order.assignedAt)}</div>
            </div>

            {!canAssignCourier ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Нет права orders.assign_courier.</div>
            ) : !ASSIGNABLE_STATUSES.has(order.status.toUpperCase()) ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">В текущем статусе менять курьера нельзя.</div>
            ) : (
              <div className="space-y-4">
                {canReadCouriers ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Выбрать активного курьера</span>
                    <select
                      value={selectedCourierUserId}
                      onChange={(event) => setSelectedCourierUserId(event.target.value)}
                      disabled={mutating}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    >
                      <option value="">— выбрать курьера —</option>
                      {couriers.map((courier) => (
                        <option key={courier.userId} value={courier.userId}>
                          {`${courier.isOnline ? "Онлайн" : "Офлайн"} · ${formatCourier(courier)}`}
                        </option>
                      ))}
                    </select>
                    {courierListError ? <div className="mt-2 text-xs text-rose-600">{courierListError}</div> : null}
                  </label>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Ручной выбор скрыт: нет права couriers.read. Автоназначение может оставаться доступным.</div>
                )}

                <div className="flex flex-wrap gap-3">
                  {canReadCouriers ? (
                    <button
                      disabled={mutating || !selectedCourierUserId || !canMutateCourier}
                      onClick={() => void assignCourier()}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      Назначить
                    </button>
                  ) : null}
                  <button
                    disabled={mutating || !canAutoAssign}
                    onClick={() => void autoAssign()}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Автоназначить лучшего
                  </button>
                  <button
                    disabled={mutating || !order.courierId || !canMutateCourier}
                    onClick={() => void unassign()}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 disabled:opacity-40"
                  >
                    Снять курьера
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {canForceStatus && allowedStatuses.length > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Изменить статус администратором</h2>
            <p className="text-sm text-slate-500 mb-5">Backend сохранит причину, администратора, IP, request ID и историю изменения.</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_auto] lg:items-end">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Новый статус</span>
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as CanonicalOrderStatus | "")}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <option value="">— выбрать —</option>
                  {allowedStatuses.map((candidate) => <option key={candidate} value={candidate}>{statusLabel(candidate)}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Причина (обязательно)</span>
                <input
                  value={statusReason}
                  maxLength={500}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="Например: отмена по обращению клиента"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
              <button
                disabled={mutating || !nextStatus || statusReason.trim().length < 3}
                onClick={() => void forceStatus()}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Применить
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Финансовый snapshot заказа</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["Subtotal", formatMoney(order.subtotal)],
                ["Доставка клиенту", formatMoney(order.deliveryFee)],
                ["Скидка на товары", formatMoney(order.discountAmount ?? 0)],
                ["Скидка на доставку", formatMoney(order.deliveryDiscountAmount ?? 0)],
                ["Итого клиента", formatMoney(order.total)],
                ["Courier gross", formatMoney(order.courierFeeGross ?? 0)],
                ["Комиссия курьера", formatMoney(order.courierCommissionAmount ?? 0)],
                ["Courier NET", formatMoney(order.courierFee ?? 0)],
                ["Бонус курьера", formatMoney(order.courierBonusApplied ?? 0)],
                ["Комиссия ресторана", formatMoney(order.restaurantCommissionAmount ?? 0)],
                ["Выплата ресторану", formatMoney(order.restaurantPayoutAmount ?? 0)],
                ["Pricing source", order.pricingSource || "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">{label}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">История заказа</h2>
            {historyError ? <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{historyError}</div> : null}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {timeline.map((item) => (
                <div key={`${item.kind}:${item.id}`} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-bold text-slate-900">{timelineTitle(item)}</div>
                    <div className="text-xs text-slate-500">{formatDate(item.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{actorLabel(item)}</div>
                  {item.data?.reason ? <div className="mt-2 text-sm text-slate-700">Причина: {item.data.reason}</div> : null}
                  {!item.data?.reason && typeof item.data?.metadata?.reason === "string" ? (
                    <div className="mt-2 text-sm text-slate-700">Причина: {String(item.data.metadata.reason)}</div>
                  ) : null}
                </div>
              ))}
              {!timeline.length && !historyError ? <div className="text-sm text-slate-500">История пока пуста.</div> : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-bold text-slate-900">Позиции заказа</h2>
            <p className="mt-1 text-sm text-slate-500">Зафиксированные название, цена и количество на момент заказа</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Позиция</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Цена</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Кол-во</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Сумма строки</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-6 py-5"><div className="text-sm font-bold text-slate-900">{item.title}</div><div className="mt-1 text-xs text-slate-400">{item.productId || item.id}</div></td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-800">{formatMoney(item.price)}</td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-800">{item.quantity}</td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-900">{formatMoney(item.price * item.quantity)}</td>
                  </tr>
                ))}
                {!order.items?.length ? <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">Позиции не найдены</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
