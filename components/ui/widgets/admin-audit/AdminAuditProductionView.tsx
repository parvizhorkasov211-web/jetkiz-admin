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

function pretty(value: unknown) {
  if (value == null) return "—";
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
              Серверная история действий администраторов без скрытой клиентской фильтрации.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/proxy/admin/audit/export?${exportQuery}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
            >
              <Download className="h-4 w-4" /> CSV
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
              placeholder="Администратор, действие, сущность, номер..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">Все действия</option>
            {actions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">Все разделы</option>
            {entityTypes.map((value) => <option key={value} value={value}>{value}</option>)}
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
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Администратор</th>
                  <th className="px-4 py-3">Действие</th>
                  <th className="px-4 py-3">Раздел</th>
                  <th className="px-4 py-3">Объект</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{actorName(item)}</td>
                    <td className="px-4 py-3">{item.action}</td>
                    <td className="px-4 py-3">{item.entityType}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-600">{item.entityId || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{item.ip || "—"}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Записей не найдено</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">Всего: {total.toLocaleString("ru-RU")}</div>
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
              <div><h2 className="text-xl font-bold">Детали действия</h2><p className="mt-1 text-sm text-slate-500">{formatDate(selected.createdAt)}</p></div>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Закрыть</button>
            </div>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">Администратор:</span><div className="font-semibold">{actorName(selected)}</div></div>
              <div><span className="text-slate-500">Действие:</span><div className="font-semibold">{selected.action}</div></div>
              <div><span className="text-slate-500">Раздел:</span><div>{selected.entityType}</div></div>
              <div><span className="text-slate-500">Объект:</span><div className="break-all">{selected.entityId || "—"}</div></div>
              <div><span className="text-slate-500">IP:</span><div>{selected.ip || "—"}</div></div>
              <div><span className="text-slate-500">Request ID:</span><div className="break-all">{selected.requestId || "—"}</div></div>
            </div>
            <div className="mt-6 space-y-4">
              <div><div className="mb-2 text-sm font-semibold">До изменения</div><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(selected.oldData)}</pre></div>
              <div><div className="mb-2 text-sm font-semibold">После изменения</div><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(selected.newData)}</pre></div>
              <div><div className="mb-2 text-sm font-semibold">Дополнительные данные</div><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{pretty(selected.metadata)}</pre></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
