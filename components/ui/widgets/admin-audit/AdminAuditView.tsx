"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, FileText, ShieldCheck, UserCog } from "lucide-react";

import { apiFetch } from "@/lib/api";

import { AdminAuditDetailDrawer } from "./AdminAuditDetailDrawer";
import { AdminAuditFilters } from "./AdminAuditFilters";
import { AdminAuditHeader } from "./AdminAuditHeader";
import { AdminAuditKpiCard } from "./AdminAuditKpiCard";
import { AdminAuditStatsPanel } from "./AdminAuditStatsPanel";
import { AdminAuditTable } from "./AdminAuditTable";
import {
  actionMatchesGroup,
  getActionsByGroup,
  isInternalAuditAction,
} from "./admin-audit.labels";
import {
  buildAuditQuery,
  formatInteger,
  toApiDateTime,
} from "./admin-audit.helpers";
import type {
  ActionGroup,
  AuditListResponse,
  AuditLogItem,
  AuditSort,
  AuditStatsResponse,
  DictionaryResponse,
} from "./admin-audit.types";

export function AdminAuditView() {
  const [q, setQ] = useState("");
  const [actorQuery, setActorQuery] = useState("");
  const [actionGroup, setActionGroup] = useState<ActionGroup>("all");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<AuditSort>("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStatsResponse | null>(null);

  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

  const queryString = useMemo(() => {
    const mergedQ = [q.trim(), actorQuery.trim()].filter(Boolean).join(" ");

    return buildAuditQuery({
      q: mergedQ,
      action,
      entityType,
      dateFrom,
      dateTo,
      sort,
      page,
      limit,
    });
  }, [
    q,
    actorQuery,
    action,
    entityType,
    dateFrom,
    dateTo,
    sort,
    page,
    limit,
  ]);

  const statsQueryString = useMemo(() => {
    const query = new URLSearchParams();

    const apiDateFrom = toApiDateTime(dateFrom);
    const apiDateTo = toApiDateTime(dateTo);

    if (apiDateFrom) query.set("dateFrom", apiDateFrom);
    if (apiDateTo) query.set("dateTo", apiDateTo);

    return query.toString();
  }, [dateFrom, dateTo]);

  const exportUrl = useMemo(() => {
    const mergedQ = [q.trim(), actorQuery.trim()].filter(Boolean).join(" ");

    const query = buildAuditQuery({
      q: mergedQ,
      action,
      entityType,
      dateFrom,
      dateTo,
      sort,
      includePagination: false,
    });

    return `/api/proxy/admin/audit/export?${query}`;
  }, [q, actorQuery, action, entityType, dateFrom, dateTo, sort]);

  const filteredActionOptions = useMemo(() => {
    return getActionsByGroup(actionGroup, actions);
  }, [actionGroup, actions]);

  const visibleItems = useMemo(() => {
    const businessItems = items.filter(
      (item) => !isInternalAuditAction(item.action),
    );

    if (actionGroup === "all") return businessItems;

    return businessItems.filter((item) =>
      actionMatchesGroup(item.action, actionGroup),
    );
  }, [items, actionGroup]);

  const refreshCount = useMemo(() => {
    return (
      stats?.byAction.find(
        (item) => item.action.toUpperCase() === "REFRESH",
      )?.count ?? 0
    );
  }, [stats]);

  const visibleTotal = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, stats.total - refreshCount);
  }, [stats, refreshCount]);

  const visibleAdminActions = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, stats.adminActions - refreshCount);
  }, [stats, refreshCount]);

  const visibleLoginEvents = useMemo(() => {
    if (!stats) return 0;

    const authActions = new Set([
      "LOGIN",
      "LOGOUT",
      "LOGOUT_ALL",
      "SESSION_REVOKE",
    ]);

    return stats.byAction
      .filter((item) => authActions.has(item.action.toUpperCase()))
      .reduce((sum, item) => sum + item.count, 0);
  }, [stats]);

  const totalPages = Math.max(1, Math.ceil(Math.max(visibleTotal, total) / limit));

  const loadDictionaries = useCallback(async () => {
    const [actionsRes, entityTypesRes] = await Promise.allSettled([
      apiFetch("/admin/audit/actions"),
      apiFetch("/admin/audit/entity-types"),
    ]);

    if (actionsRes.status === "fulfilled") {
      const data = actionsRes.value as DictionaryResponse;
      setActions((data.items ?? []).filter((item) => !isInternalAuditAction(item)));
    }

    if (entityTypesRes.status === "fulfilled") {
      setEntityTypes((entityTypesRes.value as DictionaryResponse).items ?? []);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [listRes, statsRes] = await Promise.allSettled([
      apiFetch(`/admin/audit?${queryString}`),
      apiFetch(
        `/admin/audit/stats${statsQueryString ? `?${statsQueryString}` : ""}`,
      ),
    ]);

    if (listRes.status === "fulfilled") {
      const data = listRes.value as AuditListResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
    } else {
      setItems([]);
      setTotal(0);
      setError("Backend не вернул журнал действий.");
    }

    if (statsRes.status === "fulfilled") {
      setStats(statsRes.value as AuditStatsResponse);
    }

    setLoading(false);
  }, [queryString, statsQueryString]);

  useEffect(() => {
    void loadDictionaries();
  }, [loadDictionaries]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function openDetail(item: AuditLogItem) {
    setSelectedId(item.id);
    setSelectedItem(item);
    setDetailLoading(true);

    try {
      const detail = await apiFetch(`/admin/audit/${item.id}`);
      setSelectedItem(detail as AuditLogItem);
    } catch {
      setSelectedItem(item);
    } finally {
      setDetailLoading(false);
    }
  }

  function resetFilters() {
    setQ("");
    setActorQuery("");
    setActionGroup("all");
    setAction("");
    setEntityType("");
    setDateFrom("");
    setDateTo("");
    setSort("desc");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminAuditHeader
        loading={loading}
        exportUrl={exportUrl}
        onRefresh={loadData}
      />

      <div className="space-y-6 p-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminAuditKpiCard
            title="Всего действий"
            value={formatInteger(visibleTotal)}
            description="Без внутренних обновлений сессии"
            icon={Activity}
          />

          <AdminAuditKpiCard
            title="Сегодня"
            value={formatInteger(stats?.today)}
            description="Действия за текущий день"
            icon={ShieldCheck}
            tone="success"
          />

          <AdminAuditKpiCard
            title="Входы / выходы"
            value={formatInteger(visibleLoginEvents)}
            description="Вход, выход и отзыв сессии"
            icon={UserCog}
          />

          <AdminAuditKpiCard
            title="Действия админов"
            value={formatInteger(visibleAdminActions)}
            description="Изменения через админ-панель"
            icon={FileText}
            tone="warning"
          />
        </div>

        <AdminAuditFilters
          q={q}
          actorQuery={actorQuery}
          actionGroup={actionGroup}
          action={action}
          entityType={entityType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sort={sort}
          limit={limit}
          actions={filteredActionOptions}
          entityTypes={entityTypes}
          loading={loading}
          onQChange={(value: string) => {
            setQ(value);
            setPage(1);
          }}
          onActorQueryChange={(value: string) => {
            setActorQuery(value);
            setPage(1);
          }}
          onActionGroupChange={(value: ActionGroup) => {
            setActionGroup(value);
            setAction("");
            setPage(1);
          }}
          onActionChange={(value: string) => {
            setAction(value);
            setPage(1);
          }}
          onEntityTypeChange={(value: string) => {
            setEntityType(value);
            setPage(1);
          }}
          onDateFromChange={(value: string) => {
            setDateFrom(value);
            setPage(1);
          }}
          onDateToChange={(value: string) => {
            setDateTo(value);
            setPage(1);
          }}
          onSortChange={(value: AuditSort) => {
            setSort(value);
            setPage(1);
          }}
          onLimitChange={(value: number) => {
            setLimit(value);
            setPage(1);
          }}
          onReset={resetFilters}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <AdminAuditTable
            items={visibleItems}
            loading={loading}
            total={visibleTotal}
            page={page}
            limit={limit}
            totalPages={totalPages}
            onPageChange={setPage}
            onOpenDetail={openDetail}
          />

          <AdminAuditStatsPanel stats={stats} />
        </div>
      </div>

      <AdminAuditDetailDrawer
        open={Boolean(selectedId)}
        item={selectedItem}
        loading={detailLoading}
        onClose={() => {
          setSelectedId(null);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}