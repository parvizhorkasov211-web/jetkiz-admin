"use client";

import { Filter, Search } from "lucide-react";

import {
  getActionGroupLabel,
  getActionLabel,
  getEntityTypeLabel,
} from "./admin-audit.labels";
import type { ActionGroup, AuditSort } from "./admin-audit.types";

const limits = [10, 20, 50, 100];

const actionGroups: ActionGroup[] = [
  "all",
  "auth",
  "create",
  "update",
  "delete",
  "export",
  "block",
  "finance",
  "content",
];

type Props = {
  q: string;
  actorQuery: string;
  actionGroup: ActionGroup;
  action: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
  sort: AuditSort;
  limit: number;
  actions: string[];
  entityTypes: string[];
  loading: boolean;
  onQChange: (value: string) => void;
  onActorQueryChange: (value: string) => void;
  onActionGroupChange: (value: ActionGroup) => void;
  onActionChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSortChange: (value: AuditSort) => void;
  onLimitChange: (value: number) => void;
  onReset: () => void;
};

export function AdminAuditFilters({
  q,
  actorQuery,
  actionGroup,
  action,
  entityType,
  dateFrom,
  dateTo,
  sort,
  limit,
  actions,
  entityTypes,
  loading,
  onQChange,
  onActorQueryChange,
  onActionGroupChange,
  onActionChange,
  onEntityTypeChange,
  onDateFromChange,
  onDateToChange,
  onSortChange,
  onLimitChange,
  onReset,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
        <Filter className="h-4 w-4 text-violet-600" />
        Фильтры журнала
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Общий поиск
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={q}
              disabled={loading}
              onChange={(event) => onQChange(event.target.value)}
              placeholder="Что сделали, раздел, requestId..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Администратор
          </label>

          <input
            value={actorQuery}
            disabled={loading}
            onChange={(event) => onActorQueryChange(event.target.value)}
            placeholder="Имя, телефон или email..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Тип действия
          </label>

          <select
            value={actionGroup}
            disabled={loading}
            onChange={(event) =>
              onActionGroupChange(event.target.value as ActionGroup)
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
          >
            {actionGroups.map((group) => (
              <option key={group} value={group}>
                {getActionGroupLabel(group)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Конкретное действие
          </label>

          <select
            value={action}
            disabled={loading}
            onChange={(event) => onActionChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
          >
            <option value="">Все действия</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {getActionLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Раздел
          </label>

          <select
            value={entityType}
            disabled={loading}
            onChange={(event) => onEntityTypeChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
          >
            <option value="">Все разделы</option>
            {entityTypes.map((item) => (
              <option key={item} value={item}>
                {getEntityTypeLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Дата и время от
          </label>

          <input
            type="datetime-local"
            value={dateFrom}
            disabled={loading}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Дата и время до
          </label>

          <input
            type="datetime-local"
            value={dateTo}
            disabled={loading}
            onChange={(event) => onDateToChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Сортировка / лимит
          </label>

          <div className="grid grid-cols-[1fr_90px] gap-2">
            <select
              value={sort}
              disabled={loading}
              onChange={(event) =>
                onSortChange(event.target.value as AuditSort)
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
            >
              <option value="desc">Новые</option>
              <option value="asc">Старые</option>
            </select>

            <select
              value={limit}
              disabled={loading}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:opacity-60"
            >
              {limits.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Сбросить фильтры
        </button>
      </div>
    </div>
  );
}