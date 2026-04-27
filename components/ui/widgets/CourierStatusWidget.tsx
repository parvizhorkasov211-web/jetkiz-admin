"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

type Tab = "ONLINE" | "OFFLINE" | "BUSY";

type Summary = {
  total: number;
  online: number;
  offline: number;
  busy: number;
  sleeping: number;
  generatedAt: string;
};

type Item = {
  courierUserId: string;
  name: string;
  tabStatus: Tab;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
};

type StatusListResponse = {
  items?: Item[];
  total?: number;
};

type CourierStatusWidgetProps = {
  viewAllHref?: string;
  refreshMs?: number;
  limit?: number;
};

function fmtTime(iso: string | null) {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU");
}

function badge(tab: Tab) {
  switch (tab) {
    case "ONLINE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "OFFLINE":
      return "bg-slate-50 text-slate-700 ring-slate-200";
    case "BUSY":
      return "bg-amber-50 text-amber-800 ring-amber-200";
  }
}

function badgeLabel(tab: Tab) {
  switch (tab) {
    case "ONLINE":
      return "Онлайн";
    case "OFFLINE":
      return "Оффлайн";
    case "BUSY":
      return "Занят";
  }
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "C";
  const second = parts[1]?.[0] ?? "";

  return (first + second).toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function normalizeItems(response: StatusListResponse): Item[] {
  return Array.isArray(response.items) ? response.items : [];
}

export function CourierStatusWidget({
  viewAllHref = "/layout-20/couriers",
  refreshMs = 15_000,
  limit = 7,
}: CourierStatusWidgetProps) {
  const [tab, setTab] = useState<Tab>("ONLINE");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    const response = (await apiFetch(
      "/couriers/metrics/status-summary",
    )) as Summary;

    setSummary(response);
  }

  async function loadList(nextTab: Tab) {
    setLoadingList(true);

    try {
      const response = (await apiFetch(
        `/couriers/metrics/status-list?tab=${nextTab}&limit=${limit}`,
      )) as StatusListResponse;

      setItems(normalizeItems(response));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function initialLoad() {
      try {
        setLoading(true);
        setError(null);

        await loadSummary();
        await loadList(tab);
      } catch (loadError) {
        if (alive) {
          setError(getErrorMessage(loadError, "Ошибка загрузки метрик"));
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    const timer = window.setInterval(() => {
      void Promise.all([loadSummary(), loadList(tab)]).catch(() => {
        // Автообновление не должно ломать страницу.
      });
    }, refreshMs);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function reloadListByTab() {
      try {
        setError(null);
        await loadList(tab);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Ошибка загрузки списка"));
      }
    }

    void reloadListByTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabs = useMemo(() => {
    return [
      { key: "ONLINE" as const, label: `Онлайн (${summary?.online ?? "—"})` },
      { key: "OFFLINE" as const, label: `Оффлайн (${summary?.offline ?? "—"})` },
      { key: "BUSY" as const, label: `Заняты (${summary?.busy ?? "—"})` },
    ];
  }, [summary]);

  const onlinePct = useMemo(() => {
    if (!summary?.total) {
      return 0;
    }

    return Math.round(((summary.online + summary.busy) / summary.total) * 100);
  }, [summary]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-base font-semibold text-slate-900">
            Статус курьеров
          </div>

          <div className="mt-1 text-sm text-slate-500">
            {summary ? (
              <>
                Всего: <b className="text-slate-900">{summary.total}</b> ·
                Онлайн: <b className="text-slate-900">{summary.online}</b> ·
                Оффлайн: <b className="text-slate-900">{summary.offline}</b> ·
                Заняты: <b className="text-slate-900">{summary.busy}</b>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>

        <a
          href={viewAllHref}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Посмотреть все
        </a>
      </div>

      <div className="px-5">
        <div className="flex gap-6 border-b border-slate-200">
          {tabs.map((item) => {
            const active = tab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={[
                  "relative -mb-px pb-3 text-sm font-semibold",
                  active
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {item.label}
                {active ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {error ? (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading || loadingList ? (
          <div className="mb-3 text-sm text-slate-500">Загрузка…</div>
        ) : null}

        <div className="space-y-3">
          {items.map((courier) => (
            <div
              key={courier.courierUserId}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-600/10 font-semibold text-blue-700">
                  {initials(courier.name)}
                </div>

                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {courier.name}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    Last seen: {fmtTime(courier.lastSeenAt)}
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badge(
                  courier.tabStatus,
                )}`}
              >
                {badgeLabel(courier.tabStatus)}
              </span>
            </div>
          ))}

          {!loading && items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Нет курьеров в этой вкладке
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Курьеры “на линии” (Онлайн + Заняты)
            </span>
            <span className="font-semibold text-slate-900">{onlinePct}%</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-blue-600" style={{ width: `${onlinePct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}