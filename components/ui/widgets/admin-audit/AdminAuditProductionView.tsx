"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";

import { apiFetch } from "@/lib/api";

type AuditActor = {
  user?: {
    phone?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: unknown;
  newData?: unknown;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: string;
  adminUser?: AuditActor | null;
};

type ListResponse = {
  items?: AuditItem[];
  total?: number;
  page?: number;
  limit?: number;
};

type DictionaryResponse = { items?: string[] };

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Вошёл в админку",
  LOGOUT: "Вышел из админки",
  REFRESH: "Продлил рабочую сессию",
  REFRESH_FAILED: "Не удалось продлить сессию",
  RESTAURANT_CREATE: "Добавил ресторан",
  RESTAURANT_UPDATE: "Изменил ресторан",
  RESTAURANT_DELETE: "Переместил ресторан в архив",
  RESTAURANT_APPROVE: "Одобрил ресторан",
  RESTAURANT_BLOCK: "Заблокировал ресторан",
  RESTAURANT_UNBLOCK: "Снял блокировку ресторана",
  COURIER_CREATE: "Добавил курьера",
  COURIER_UPDATE: "Изменил курьера",
  COURIER_BLOCK: "Заблокировал курьера",
  COURIER_UNBLOCK: "Снял блокировку курьера",
  COURIER_PAYOUT_CREATE: "Создал выплату курьеру",
  COURIER_PAYOUT_MARK_PAID: "Подтвердил выплату курьеру",
  RESTAURANT_PAYOUT_CREATE: "Создал выплату ресторану",
  RESTAURANT_PAYOUT_MARK_PAID: "Подтвердил выплату ресторану",
  ORDER_UPDATE: "Изменил заказ",
  ORDER_CANCEL: "Отменил заказ",
  ORDER_ASSIGN_COURIER: "Назначил курьера на заказ",
  PROMOCODE_CREATE: "Создал промокод",
  PROMOCODE_UPDATE: "Изменил промокод",
  PROMOCODE_DELETE: "Отключил промокод",
  ADMIN_CREATE: "Добавил сотрудника",
  ADMIN_UPDATE: "Изменил сотрудника",
  ADMIN_BLOCK: "Заблокировал сотрудника",
  ADMIN_PASSWORD_RESET: "Сбросил пароль сотрудника",
  SETTINGS_UPDATE: "Изменил настройки системы",
  REVIEW_UPDATE: "Изменил отзыв",
  NOTIFICATION_CREATE: "Создал уведомление",
  NOTIFICATION_SEND: "Отправил уведомление",
};

const ENTITY_LABELS: Record<string, string> = {
  AdminUser: "Сотрудники",
  ADMIN_USER: "Сотрудники",
  AdminSession: "Авторизация",
  ADMIN_SESSION: "Авторизация",
  AdminAuth: "Авторизация",
  ADMIN_AUTH: "Авторизация",
  Restaurant: "Рестораны",
  RESTAURANT: "Рестораны",
  Courier: "Курьеры",
  COURIER: "Курьеры",
  Order: "Заказы",
  ORDER: "Заказы",
  CourierPayout: "Выплаты курьерам",
  COURIER_PAYOUT: "Выплаты курьерам",
  RestaurantPayout: "Выплаты ресторанам",
  RESTAURANT_PAYOUT: "Выплаты ресторанам",
  PromoCode: "Промокоды",
  PROMOCODE: "Промокоды",
  Review: "Отзывы",
  REVIEW: "Отзывы",
  Notification: "Уведомления",
  NOTIFICATION: "Уведомления",
  Settings: "Настройки",
  SETTINGS: "Настройки",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actorName(item: AuditItem) {
  const user = item.adminUser?.user;
  const name = [user?.firstName, user?.lastName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return name || user?.phone || user?.email || "Система";
}

function sentenceFromCode(value: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Действие";
  return normalized
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join(" ");
}

function actionLabel(value: string) {
  const normalized = String(value ?? "").trim();
  return ACTION_LABELS[normalized] ?? sentenceFromCode(normalized);
}

function entityLabel(value: string) {
  const normalized = String(value ?? "").trim();
  return ENTITY_LABELS[normalized] ?? sentenceFromCode(normalized);
}

function detailLabel(item: AuditItem) {
  const section = entityLabel(item.entityType);
  if (section === "Авторизация") return "Учётная запись сотрудника";
  if (section === "Рестораны") return "Карточка ресторана";
  if (section === "Курьеры") return "Карточка курьера";
  if (section === "Заказы") return "Карточка заказа";
  if (section === "Выплаты курьерам") return "Выплата курьеру";
  if (section === "Выплаты ресторанам") return "Выплата ресторану";
  if (section === "Сотрудники") return "Учётная запись сотрудника";
  return section;
}

function pretty(value: unknown) {
  if (value == null) return "Нет данных";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AdminAuditProductionView() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selected, setSelected] = useState<AuditItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (dateFrom) params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59.999`).toISOString());
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sort", "desc");
    return params.toString();
  }, [q, action, entityType, dateFrom, dateTo, page, limit]);

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams(query);
    params.delete("page");
    params.delete("limit");
    return params.toString();
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiFetch(`/admin/audit?${query}`, {
        cache: "no-store",
      })) as ListResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
    } catch {
      setItems([]);
      setTotal(0);
      setError("Не удалось загрузить журнал действий.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.allSettled([
      apiFetch("/admin/audit/actions", { cache: "no-store" }),
      apiFetch("/admin/audit/entity-types", { cache: "no-store" }),
    ]).then(([actionsResult, typesResult]) => {
      if (actionsResult.status === "fulfilled") {
        setActions(((actionsResult.value as DictionaryResponse).items ?? []).filter(Boolean));
      }
      if (typesResult.status === "fulfilled") {
        setEntityTypes(((typesResult.value as DictionaryResponse).items ?? []).filter(Boolean));
      }
    });
  }, []);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Журнал действий</h1>
            <p className="mt-1 text-sm text-slate-500">
              Кто, когда и что изменил в JETKIZ. Нажмите на строку, чтобы увидеть подробности.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/proxy/admin/audit/export?${exportQuery}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
            >
              <Download className="h-4 w-4" /> Выгрузить
            </a>
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Обновить
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-6">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Сотрудник, действие, ресторан, курьер..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">Все действия</option>
            {actions.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}
          </select>
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">Все разделы</option>
            {entityTypes.map((value) => <option key={value} value={value}>{entityLabel(value)}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 text-sm" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 text-sm" />
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Когда</th>
                  <th className="px-4 py-3">Сотрудник</th>
                  <th className="px-4 py-3">Что сделал</th>
                  <th className="px-4 py-3">Раздел</th>
                  <th className="px-4 py-3">С чем работал</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{actorName(item)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{actionLabel(item.action)}</td>
                    <td className="px-4 py-3 text-slate-600">{entityLabel(item.entityType)}</td>
                    <td className="px-4 py-3 text-slate-500">{detailLabel(item)}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Записей не найдено</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">Всего записей: {total.toLocaleString("ru-RU")}</div>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 px-2 py-1.5">
                {[20, 50, 100].map((value) => <option key={value} value={value}>{value} на странице</option>)}
              </select>
              <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Назад</button>
              <span>{page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Далее</button>
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{actionLabel(selected.action)}</h2>
                <p className="mt-1 text-sm text-slate-500">{formatDate(selected.createdAt)} · {actorName(selected)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Закрыть</button>
            </div>
            <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">Сотрудник</span><div className="mt-1 font-semibold">{actorName(selected)}</div></div>
              <div><span className="text-slate-500">Раздел</span><div className="mt-1 font-semibold">{entityLabel(selected.entityType)}</div></div>
              <div><span className="text-slate-500">Действие</span><div className="mt-1">{actionLabel(selected.action)}</div></div>
              <div><span className="text-slate-500">Объект</span><div className="mt-1">{detailLabel(selected)}</div></div>
            </div>

            {(selected.oldData != null || selected.newData != null || selected.metadata != null) ? (
              <details className="mt-6 rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                  Служебные данные для разбора спорной ситуации
                </summary>
                <div className="space-y-4 border-t border-slate-200 p-4">
                  {selected.oldData != null ? <div><div className="mb-2 text-sm font-semibold">До изменения</div><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(selected.oldData)}</pre></div> : null}
                  {selected.newData != null ? <div><div className="mb-2 text-sm font-semibold">После изменения</div><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(selected.newData)}</pre></div> : null}
                  {selected.metadata != null ? <div><div className="mb-2 text-sm font-semibold">Дополнительно</div><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(selected.metadata)}</pre></div> : null}
                  <div className="text-xs text-slate-400">IP: {selected.ip || "—"} · служебный номер запроса: {selected.requestId || "—"}</div>
                </div>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
