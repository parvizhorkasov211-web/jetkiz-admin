"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserCheck,
  Wifi,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";

type CourierStatus = "BLOCKED" | "BUSY" | "ONLINE_IDLE" | "OFFLINE";

type AdminLike = {
  roleCodes?: string[];
  roles?: string[];
  permissionCodes?: string[];
  permissions?: string[];
} | null;

type Courier = {
  id: string;
  userId: string;
  number?: number | null;
  phone: string;
  firstName: string;
  lastName: string;
  fullName?: string | null;
  iin?: string | null;
  addressText?: string | null;
  isOnline: boolean;
  isActive?: boolean | null;
  userBlockedAt?: string | null;
  blockedAt?: string | null;
  blockReason?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  activeOrdersCount?: number | null;
  status?: CourierStatus | null;
  sensitiveAccess?: boolean;
  personalFeeOverride?: number | null;
  payoutBonusAdd?: number | null;
  courierCommissionPctOverride?: number | null;
};

type CouriersResponse = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items?: Courier[];
};

type StatusSummaryResponse = {
  total?: number;
  online?: number;
  offline?: number;
  busy?: number;
  blocked?: number;
  activeOrders?: number;
  generatedAt?: string;
};

type ExportResponse = {
  total?: number;
  count?: number;
  truncated?: boolean;
  exportedAt?: string;
  items?: Courier[];
};

const PAGE_SIZE = 20;
const STALE_SECONDS = 180;

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function hasPermission(admin: AdminLike, permission: string): boolean {
  const roles = [...list(admin?.roleCodes), ...list(admin?.roles)];
  const permissions = [
    ...list(admin?.permissionCodes),
    ...list(admin?.permissions),
  ];

  return (
    roles.includes("SUPER_ADMIN") ||
    permissions.includes("admin.full_access") ||
    permissions.includes(permission)
  );
}

function formatName(courier: Courier): string {
  const fullName = String(courier.fullName ?? "").trim();
  if (fullName) return fullName;

  const name = [courier.firstName, courier.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return name || "Без имени";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

function isStale(courier: Courier): boolean {
  if (!courier.isOnline || !courier.lastSeenAt) return false;

  const time = new Date(courier.lastSeenAt).getTime();
  if (!Number.isFinite(time)) return true;

  return Date.now() - time > STALE_SECONDS * 1000;
}

function getStatus(courier: Courier) {
  const activeOrdersCount = Number(courier.activeOrdersCount ?? 0);

  if (
    courier.status === "BLOCKED" ||
    courier.isActive === false ||
    courier.blockedAt ||
    courier.userBlockedAt
  ) {
    return {
      label: "Заблокирован",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (activeOrdersCount > 0 || courier.status === "BUSY") {
    return {
      label: "Выполняет заказ",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (isStale(courier)) {
    return {
      label: "Нет свежей связи",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  if (courier.isOnline || courier.status === "ONLINE_IDLE") {
    return {
      label: "Свободен на линии",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Оффлайн",
    className: "border-slate-200 bg-white text-slate-600",
  };
}

function buildQuery(params: {
  page: number;
  q: string;
  online: string;
  blocked: string;
  busy: string;
  limit?: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE),
  });

  if (params.q.trim()) query.set("q", params.q.trim());
  if (params.online !== "all") query.set("online", params.online);
  if (params.blocked !== "all") query.set("blocked", params.blocked);
  if (params.busy !== "all") query.set("busy", params.busy);

  return `/couriers?${query.toString()}`;
}

function buildExportQuery(params: {
  q: string;
  online: string;
  blocked: string;
  busy: string;
}) {
  const query = new URLSearchParams({ limit: "10000" });

  if (params.q.trim()) query.set("q", params.q.trim());
  if (params.online !== "all") query.set("online", params.online);
  if (params.blocked !== "all") query.set("blocked", params.blocked);
  if (params.busy !== "all") query.set("busy", params.busy);

  return `/couriers/export?${query.toString()}`;
}

function exportToXlsx(response: ExportResponse) {
  const rows = (response.items ?? []).map((courier) => ({
    "Номер курьера": courier.number ?? "",
    Курьер: formatName(courier),
    Телефон: courier.phone ?? "",
    ИИН: courier.iin ?? "",
    Адрес: courier.addressText ?? "",
    Статус: getStatus(courier).label,
    "Активных заказов": courier.activeOrdersCount ?? 0,
    "Фиксированное начисление": courier.personalFeeOverride ?? "",
    "Бонус к выплате": courier.payoutBonusAdd ?? "",
    "Комиссия JETKIZ (%)": courier.courierCommissionPctOverride ?? "",
    "Последняя связь": courier.lastSeenAt ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Couriers");
  XLSX.writeFile(workbook, "jetkiz-couriers.xlsx");
}

export function CouriersProductionV2Page() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminLike>(null);
  const [items, setItems] = useState<Courier[]>([]);
  const [summary, setSummary] = useState<StatusSummaryResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [online, setOnline] = useState("all");
  const [blocked, setBlocked] = useState("all");
  const [busy, setBusy] = useState("all");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    hasPermission(admin, "couriers.update") &&
    hasPermission(admin, "couriers.sensitive_read");
  const canExport = hasPermission(admin, "couriers.export");

  const queryPath = useMemo(
    () => buildQuery({ page, q, online, blocked, busy }),
    [page, q, online, blocked, busy],
  );

  const loadCouriers = useCallback(async (path = queryPath) => {
    setLoading(true);
    setError(null);

    try {
      const [response, statusSummary] = await Promise.all([
        apiFetch<CouriersResponse>(path),
        apiFetch<StatusSummaryResponse>("/couriers/metrics/status-summary").catch(
          () => null,
        ),
      ]);
      const nextItems = Array.isArray(response.items) ? response.items : [];

      setItems(nextItems);
      setTotal(Number(response.total ?? nextItems.length));
      setTotalPages(Math.max(1, Number(response.totalPages ?? 1)));
      setSummary(statusSummary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить курьеров.",
      );
    } finally {
      setLoading(false);
    }
  }, [queryPath]);

  async function exportCouriers() {
    setExporting(true);
    setError(null);

    try {
      const response = await apiFetch<ExportResponse>(
        buildExportQuery({ q, online, blocked, busy }),
      );
      exportToXlsx(response);
      setExportDialog(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось экспортировать курьеров.",
      );
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    void getSession().then((session) => setAdmin(session.admin));
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCouriers();
    }, 250);

    return () => window.clearTimeout(handle);
  }, [loadCouriers]);

  const resetToFirstPage = (run: () => void) => {
    setPage(1);
    run();
  };

  const statItems = [
    {
      label: "Всего",
      value: summary?.total ?? total,
      icon: UserCheck,
      className: "text-slate-700",
    },
    {
      label: "Онлайн свободны",
      value: summary?.online ?? 0,
      icon: Wifi,
      className: "text-emerald-700",
    },
    {
      label: "В заказе",
      value: summary?.busy ?? 0,
      icon: Truck,
      className: "text-amber-700",
    },
    {
      label: "Заблокированы",
      value: summary?.blocked ?? 0,
      icon: Ban,
      className: "text-rose-700",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Курьеры</h1>
            <p className="mt-1 text-sm text-slate-500">
              {total.toLocaleString("ru-RU")} в списке с учётом фильтров
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <button
                type="button"
                onClick={() => setExportDialog(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Download size={16} />
                Экспорт
              </button>
            ) : null}

            {canCreate ? (
              <button
                type="button"
                onClick={() => router.push("/layout-20/couriers/new")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus size={16} />
                Добавить
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void loadCouriers()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Обновить
            </button>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-md border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {Number(item.value ?? 0).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <Icon className={`h-5 w-5 ${item.className}`} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(event) =>
                resetToFirstPage(() => setQ(event.target.value))
              }
              placeholder="Поиск по имени, телефону, номеру"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <select
            value={online}
            onChange={(event) =>
              resetToFirstPage(() => setOnline(event.target.value))
            }
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="all">Любой онлайн</option>
            <option value="true">Онлайн</option>
            <option value="false">Оффлайн</option>
          </select>

          <select
            value={blocked}
            onChange={(event) =>
              resetToFirstPage(() => setBlocked(event.target.value))
            }
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="all">Любой доступ</option>
            <option value="false">Активные</option>
            <option value="true">Заблокированные</option>
          </select>

          <select
            value={busy}
            onChange={(event) =>
              resetToFirstPage(() => setBusy(event.target.value))
            }
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="all">Любая занятость</option>
            <option value="true">С активным заказом</option>
            <option value="false">Без активного заказа</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setOnline("all");
              setBlocked("all");
              setBusy("all");
              setPage(1);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
            Сбросить
          </button>
        </section>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Курьер</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Контакты</th>
                  <th className="px-4 py-3">ИИН</th>
                  <th className="px-4 py-3">Условия</th>
                  <th className="px-4 py-3">Связь</th>
                  <th className="px-4 py-3 text-right">Заказы</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && items.length === 0
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4" colSpan={7}>
                          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  : null}

                {!loading && items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                      Курьеры не найдены
                    </td>
                  </tr>
                ) : null}

                {items.map((courier) => {
                  const status = getStatus(courier);

                  return (
                    <tr
                      key={courier.userId}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/layout-20/couriers/${courier.userId}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">
                          {formatName(courier)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Номер курьера: {courier.number ?? "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                        {courier.blockReason ? (
                          <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                            {courier.blockReason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{courier.phone || "-"}</div>
                        <div className="max-w-[220px] truncate text-xs text-slate-500">
                          {courier.addressText || "Адрес скрыт или не указан"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {courier.iin || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>Фикс.: {formatMoney(courier.personalFeeOverride)}</div>
                        <div>Бонус: {formatMoney(courier.payoutBonusAdd)}</div>
                        <div>
                          Комиссия: {formatPercent(courier.courierCommissionPctOverride)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>Последняя связь: {formatDateTime(courier.lastSeenAt)}</div>
                        <div>Активность: {formatDateTime(courier.lastActiveAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(courier.activeOrdersCount ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Страница {page} из {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Назад
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium disabled:opacity-40"
              >
                Вперёд
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {exportDialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <h2 className="text-base font-semibold">Экспорт персональных данных</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Будет выгружен защищённый список курьеров по текущим фильтрам.
                    Действие записывается в аудит.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <div>Поиск: {q.trim() || "без фильтра"}</div>
                <div>
                  Онлайн:{" "}
                  {online === "all" ? "любой" : online === "true" ? "онлайн" : "оффлайн"}
                </div>
                <div>
                  Доступ:{" "}
                  {blocked === "all"
                    ? "любой"
                    : blocked === "true"
                      ? "заблокированные"
                      : "активные"}
                </div>
                <div>
                  Занятость:{" "}
                  {busy === "all" ? "любая" : busy === "true" ? "с заказом" : "без заказа"}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExportDialog(false)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100"
                  disabled={exporting}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => void exportCouriers()}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Выгрузить
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
