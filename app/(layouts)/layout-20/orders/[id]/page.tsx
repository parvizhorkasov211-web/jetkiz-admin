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

type DispatchPreview = {
  courier?: CourierShort | null;
  courierUserId?: string | null;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  score?: number | null;
  reason?: string | null;
};

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<void>;
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

function errorMessage(cause: unknown) {
  const raw = cause instanceof Error ? cause.message : "Операция не выполнена";
  const known: Record<string, string> = {
    "API connection failed": "Нет связи с backend. Проверьте, что сервер запущен.",
    "Database request failed": "Не удалось получить данные из базы. Проверьте миграции backend.",
    Forbidden: "Недостаточно прав для этого действия.",
    Unauthorized: "Сессия истекла. Войдите в админку заново.",
  };
  return known[raw] || raw;
}

function FinanceGroup({
  title,
  rows,
  totalLabel,
  total,
}: {
  title: string;
  rows: Array<[string, string]>;
  totalLabel: string;
  total: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-2 font-semibold text-slate-950">{title}</div>
      <div className="space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-1.5 text-slate-600">
            <span>{label}</span>
            <span className="shrink-0 font-medium text-slate-900">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-3 text-sm">
        <strong>{totalLabel}</strong>
        <strong className="shrink-0 text-base">{total}</strong>
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
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<DispatchPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [selectedCourierUserId, setSelectedCourierUserId] = useState("");
  const [nextStatus, setNextStatus] = useState<CanonicalOrderStatus | "">("");
  const [statusReason, setStatusReason] = useState("");

  const canAssignCourier = useMemo(() => hasPermission(session, "orders.assign_courier"), [session]);
  const canForceStatus = useMemo(() => hasPermission(session, "orders.force_status"), [session]);
  const canReadCouriers = useMemo(() => hasPermission(session, "couriers.read"), [session]);
  const canReadFinance = useMemo(() => hasPermission(session, "finance.read"), [session]);

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
            setHistoryError(errorMessage(cause));
          }
        }
      } catch (cause) {
        if (seq !== requestSeq.current) return;
        setErr(errorMessage(cause));
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [id],
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
        setCourierListError(errorMessage(cause));
      });

    return () => {
      alive = false;
    };
  }, [canReadCouriers, isDelivery]);

  async function runMutation(action: () => Promise<unknown>, successMessage: string) {
    setMutating(true);
    setErr(null);
    setSuccess(null);
    try {
      await action();
      await loadOrderAndHistory(false);
      setSuccess(successMessage);
      window.setTimeout(() => setSuccess(null), 4500);
    } catch (cause) {
      setErr(errorMessage(cause));
      await loadOrderAndHistory(false).catch(() => undefined);
    } finally {
      setMutating(false);
    }
  }

  async function assignCourier() {
    if (!selectedCourierUserId || !canMutateCourier || !canReadCouriers) return;
    if (selectedCourierUserId === order?.courierId) {
      setErr("Этот курьер уже назначен на заказ. Выберите другого курьера.");
      return;
    }
    await runMutation(() =>
      apiFetch(`/orders/${id}/assign-courier`, {
        method: "PATCH",
        body: JSON.stringify({ courierUserId: selectedCourierUserId }),
      }), "Курьер назначен",
    );
  }

  async function previewBestCourier() {
    if (!canAutoAssign) return;
    setPreviewLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<DispatchPreview>(`/dispatch/preview-best/${id}`);
      setPreview(data);
    } catch (cause) {
      setErr(errorMessage(cause));
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function autoAssign() {
    if (!canAutoAssign) return;
    await runMutation(() =>
      apiFetch("/dispatch/assign-best", {
        method: "PATCH",
        body: JSON.stringify({ orderId: id, reason: "admin_order_page_auto_assign" }),
      }), "Лучший курьер назначен",
    );
    setPreview(null);
  }

  async function unassign() {
    if (!order?.courierId || !canMutateCourier) return;
    setConfirmAction({
      title: "Снять курьера?",
      description: `Курьер ${formatCourier(order.courier)} будет снят с заказа.`,
      confirmLabel: "Снять курьера",
      danger: true,
      run: async () => {
        await runMutation(
          () => apiFetch(`/orders/${id}/unassign-courier`, { method: "PATCH" }),
          "Курьер снят с заказа",
        );
      },
    });
  }

  async function forceStatus() {
    const reason = statusReason.trim();
    if (!nextStatus || !canForceStatus || mutating) return;
    if (reason.length < 3 || reason.length > 500) {
      setErr("Причина изменения статуса должна содержать от 3 до 500 символов");
      return;
    }

    const targetStatus = nextStatus;
    setConfirmAction({
      title: `Изменить статус на «${statusLabel(targetStatus)}»?`,
      description: `Причина: ${reason}. Действие сохранится в журнале аудита.`,
      confirmLabel: targetStatus === "CANCELED" || targetStatus === "REJECTED" ? "Подтвердить отмену" : "Изменить статус",
      danger: targetStatus === "CANCELED" || targetStatus === "REJECTED",
      run: async () => {
        await runMutation(
          () => apiFetch(`/orders/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: targetStatus, reason }),
          }),
          `Статус изменён на «${statusLabel(targetStatus)}»`,
        );
        setNextStatus("");
        setStatusReason("");
      },
    });
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

  const timeline = Array.isArray(history?.timeline) ? history.timeline : [];
  const currentCourierId = order.courierId || order.courier?.userId || "";
  const previewCourier = preview?.courier ?? (preview ? {
    userId: preview.courierUserId || preview.userId || "",
    firstName: preview.firstName,
    lastName: preview.lastName,
  } : null);
  const courierDisabledReason = !canAssignCourier
    ? "Нет права на назначение курьеров"
    : !isDelivery
      ? "Для самовывоза курьер не нужен"
      : !ASSIGNABLE_STATUSES.has(order.status.toUpperCase())
        ? `В статусе «${statusLabel(order.status)}» менять курьера нельзя`
        : null;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 lg:p-5">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 shadow-sm hover:bg-slate-50" aria-label="Назад">←</button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">Заказ {order.number != null ? `#${order.number}` : ""}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusUi.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${statusUi.dot}`} />{statusUi.label}</span>
                <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700">{isDelivery ? "Доставка" : "Самовывоз"}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Создан {formatDate(order.createdAt)} · автообновление каждые 10 секунд</p>
            </div>
          </div>
          <button disabled={mutating} onClick={() => void loadOrderAndHistory(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">{mutating ? "Выполняется…" : "Обновить данные"}</button>
        </header>

        {err ? <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"><span>{err}</span><button onClick={() => setErr(null)} aria-label="Закрыть">×</button></div> : null}
        {success ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {success}</div> : null}

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Сумма заказа", formatMoney(order.total), `Товары ${formatMoney(order.subtotal)}`],
            ["Оплата", paymentStatusLabel(order.paymentStatus), paymentMethodLabel(order.paymentMethod)],
            ["К выплате курьеру", canReadFinance && isDelivery && order.courierId ? formatMoney(order.courierFee ?? 0) : "—", isDelivery ? order.courierId ? `После удержания ${formatMoney(order.courierCommissionAmount ?? 0)}` : "Расчёт после назначения" : "Не используется"],
            ["К выплате ресторану", canReadFinance ? formatMoney(order.restaurantPayoutAmount ?? 0) : "—", canReadFinance ? `После удержания ${formatMoney(order.restaurantCommissionAmount ?? 0)}` : "Данные скрыты"],
          ].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-xl font-bold text-slate-950">{value}</div><div className="mt-0.5 text-xs text-slate-500">{note}</div></div>)}
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,.75fr)]">
          <main className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="font-bold text-slate-950">Состав заказа</h2></div>
              <div className="divide-y divide-slate-100">
                {(order.items || []).map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm"><div className="font-semibold text-slate-900">{item.title}</div><div className="text-slate-500">{item.quantity} × {formatMoney(item.price)}</div><div className="min-w-24 text-right font-bold text-slate-950">{formatMoney(item.price * item.quantity)}</div></div>)}
                {!order.items?.length ? <div className="px-5 py-8 text-center text-sm text-slate-500">Позиции не найдены</div> : null}
              </div>
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-sm"><span className="mr-6 text-slate-500">Итого</span><strong className="min-w-24 text-right text-base">{formatMoney(order.total)}</strong></div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-950">Клиент и ресторан</h2>
                <div className="space-y-3 text-sm">
                  <div><div className="text-xs text-slate-500">Клиент</div><div className="font-semibold">{`${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim() || "Имя не указано"}</div></div>
                  <div><div className="text-xs text-slate-500">Телефон</div><div className="font-semibold">{order.phone || order.user?.phone || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Ресторан</div><div className="font-semibold">{order.restaurant?.nameRu || order.restaurant?.nameKk || "—"}</div><div className="text-xs text-slate-500">{order.restaurant?.phone || ""}</div></div>
                  <div><div className="text-xs text-slate-500">Комментарий</div><div className="whitespace-pre-wrap font-medium">{order.comment || "Нет комментария"}</div></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-950">{isDelivery ? "Адрес доставки" : "Получение в ресторане"}</h2>
                {isDelivery ? <div className="space-y-3 text-sm"><div className="font-semibold text-slate-950">{addressText(order.address)}</div><div className="grid grid-cols-4 gap-2">{[["Подъезд", order.address?.entrance], ["Этаж", order.address?.floor], ["Дверь", order.address?.door], ["Домофон", order.address?.intercom]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2"><div className="text-[11px] text-slate-500">{label}</div><div className="font-semibold">{value || "—"}</div></div>)}</div><div><span className="text-slate-500">Контакт: </span><span className="font-semibold">{order.address?.contactPhone || order.phone || "—"}</span></div><div><span className="text-slate-500">У двери: </span><span className="font-semibold">{order.leaveAtDoor ? "Да" : "Нет"}</span></div><div className="text-slate-600">{order.address?.comment || "Без комментария к адресу"}</div></div> : <div className="space-y-2 text-sm"><div className="font-semibold">{order.restaurant?.nameRu || order.restaurant?.nameKk || "—"}</div><div>{order.restaurant?.address || "Адрес не указан"}</div><div>{order.restaurant?.phone || "Телефон не указан"}</div><div className="rounded-lg bg-blue-50 p-3 text-blue-700">Курьер для самовывоза не назначается.</div></div>}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-950">Расчёт заказа</h2><span className="text-xs text-slate-500">Суммы зафиксированы  для этого заказа</span></div>
              <div className={`grid gap-3 ${canReadFinance ? "lg:grid-cols-3" : ""}`}>
                <FinanceGroup title="Платит клиент" rows={[
                  ["Товары", formatMoney(order.subtotal)],
                  ["Доставка", formatMoney(order.deliveryFee)],
                  ["Скидка на товары", `− ${formatMoney(order.discountAmount ?? 0)}`],
                  ["Скидка на доставку", `− ${formatMoney(order.deliveryDiscountAmount ?? 0)}`],
                ]} totalLabel="Итого к оплате" total={formatMoney(order.total)} />
                {canReadFinance ? <FinanceGroup title="Расчёт ресторана" rows={[
                  ["Выручка за товары", formatMoney(order.subtotal)],
                  [`Удержание JETKIZ${order.restaurantCommissionPctApplied != null ? ` — ${order.restaurantCommissionPctApplied}%` : ""}`, `− ${formatMoney(order.restaurantCommissionAmount ?? 0)}`],
                ]} totalLabel="К выплате ресторану" total={formatMoney(order.restaurantPayoutAmount ?? 0)} /> : null}
                {canReadFinance ? order.courierId ? <FinanceGroup title="Расчёт курьера" rows={[
                  ["Начислено за доставку", formatMoney(order.courierFeeGross ?? 0)],
                  [`Удержание JETKIZ${order.courierCommissionPctApplied != null ? ` — ${order.courierCommissionPctApplied}%` : ""}`, `− ${formatMoney(order.courierCommissionAmount ?? 0)}`],
                  ["Дополнительный бонус", `+ ${formatMoney(order.courierBonusApplied ?? 0)}`],
                ]} totalLabel="К выплате курьеру" total={formatMoney(order.courierFee ?? 0)} /> : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="font-semibold text-slate-950">Получает курьер</div><div className="mt-3 text-sm leading-5 text-slate-600">Курьер не назначен. Тариф, комиссия и итоговая выплата будут зафиксированы  после назначения.</div></div> : null}
              </div>
            </section>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 font-bold text-slate-950">Управление заказом</h2>
              <p className="mb-4 text-xs text-slate-500">Каждое действие записывается в историю</p>
              {canForceStatus && allowedStatuses.length > 0 ? <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{allowedStatuses.map((candidate) => <button key={candidate} onClick={() => setNextStatus(candidate)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${nextStatus === candidate ? candidate === "CANCELED" || candidate === "REJECTED" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{statusLabel(candidate)}</button>)}</div><textarea value={statusReason} maxLength={500} rows={2} onChange={(event) => setStatusReason(event.target.value)} placeholder="Причина изменения статуса — обязательно" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400" /><button disabled={mutating || !nextStatus || statusReason.trim().length < 3} onClick={() => void forceStatus()} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Применить изменение</button></div> : <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{!canForceStatus ? "Нет права на изменение статуса" : "Заказ находится в конечном статусе"}</div>}
            </section>

            {isDelivery ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-950">Курьер</h2><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${order.courier?.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{order.courier ? order.courier.isOnline ? "Онлайн" : "Офлайн" : "Не назначен"}</span></div>
              <div className="mb-3 rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Текущий курьер</div><div className="mt-0.5 font-semibold text-slate-950">{formatCourier(order.courier)}</div>{order.assignedAt ? <div className="mt-1 text-xs text-slate-500">Назначен {formatDate(order.assignedAt)}</div> : null}</div>
              {courierDisabledReason ? <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{courierDisabledReason}</div> : <div className="space-y-2.5">{canReadCouriers ? <><select value={selectedCourierUserId} onChange={(event) => { setSelectedCourierUserId(event.target.value); setErr(null); }} disabled={mutating} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Выберите курьера</option>{couriers.map((courier) => <option key={courier.userId} value={courier.userId}>{courier.isOnline ? "● Онлайн" : "○ Офлайн"} · {formatCourier(courier)}</option>)}</select><button disabled={mutating || !selectedCourierUserId || selectedCourierUserId === currentCourierId} onClick={() => void assignCourier()} className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{selectedCourierUserId === currentCourierId ? "Этот курьер уже назначен" : currentCourierId ? "Заменить курьера" : "Назначить выбранного"}</button></> : <div className="text-xs text-slate-500">Список курьеров скрыт из-за прав доступа.</div>}{courierListError ? <div className="text-xs text-rose-600">{courierListError}</div> : null}
                {!order.courierId && order.status.toUpperCase() === "READY" ? <><button disabled={mutating || previewLoading} onClick={() => void previewBestCourier()} className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-40">{previewLoading ? "Ищем кандидата…" : "Показать лучшего курьера"}</button>{preview ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm"><div className="text-xs font-medium text-blue-600">Лучший кандидат</div><div className="font-bold text-blue-950">{formatCourier(previewCourier)}</div><div className="mt-1 text-xs text-blue-700">{preview.distanceKm != null ? `${preview.distanceKm.toFixed(1)} км` : ""}{preview.etaMinutes != null ? ` · около ${preview.etaMinutes} мин` : ""}{preview.reason ? ` · ${preview.reason}` : ""}</div><button disabled={mutating} onClick={() => void autoAssign()} className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Назначить этого курьера</button></div> : null}</> : null}
                {order.courierId ? <button disabled={mutating} onClick={() => void unassign()} className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">Снять курьера</button> : null}
              </div>}
            </section> : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-950">История</h2><span className="text-xs text-slate-500">{timeline.length} событий</span></div>
              {historyError ? <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700"><div className="font-semibold">История временно недоступна</div><div className="mt-1">{historyError}</div><button type="button" onClick={() => void loadOrderAndHistory(false)} className="mt-2 font-semibold underline underline-offset-2">Повторить загрузку</button></div> : null}
              <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1">{timeline.map((item) => <div key={`${item.kind}:${item.id}`} className="border-l-2 border-slate-200 py-1 pl-3"><div className="flex justify-between gap-3"><div className="text-sm font-semibold text-slate-900">{timelineTitle(item)}</div><div className="shrink-0 text-[10px] text-slate-400">{formatDate(item.createdAt)}</div></div><div className="text-xs text-slate-500">{actorLabel(item)}</div>{item.data?.reason || typeof item.data?.metadata?.reason === "string" ? <div className="mt-1 text-xs text-slate-700">{item.data?.reason || String(item.data?.metadata?.reason)}</div> : null}</div>)}{!timeline.length && !historyError ? <div className="text-sm text-slate-500">История пока пуста</div> : null}</div>
            </section>
          </aside>
        </div>
      </div>

      {confirmAction ? <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target && !mutating) setConfirmAction(null); }}><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-bold text-slate-950">{confirmAction.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{confirmAction.description}</p><div className="mt-5 flex justify-end gap-2"><button disabled={mutating} onClick={() => setConfirmAction(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Отмена</button><button disabled={mutating} onClick={() => { const action = confirmAction; void action.run().finally(() => setConfirmAction(null)); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${confirmAction.danger ? "bg-rose-600" : "bg-slate-950"}`}>{mutating ? "Выполняется…" : confirmAction.confirmLabel}</button></div></div></div> : null}
    </div>
  );
}
