"use client";

import { Eye, FileText } from "lucide-react";

import {
  getActionLabel,
  getActionTone,
  getEntityTypeLabel,
} from "./admin-audit.labels";
import {
  formatDateTime,
  formatInteger,
  getActorName,
  getActorSubline,
  getAuditObjectShortLabel,
  getAuditSummary,
} from "./admin-audit.helpers";
import type { AuditLogItem } from "./admin-audit.types";

type Props = {
  items: AuditLogItem[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenDetail: (item: AuditLogItem) => void;
};

export function AdminAuditTable({
  items,
  loading,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onOpenDetail,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Действия</h2>

          <p className="mt-1 text-sm text-slate-500">
            Показано {formatInteger(items.length)} строк. Всего в журнале:{" "}
            {formatInteger(total)}
          </p>
        </div>

        <div className="text-sm font-semibold text-slate-500">
          Страница {page} / {totalPages}
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading && items.length === 0 ? (
          <div className="p-5">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText className="h-6 w-6" />
            </div>

            <div className="mt-4 text-base font-bold text-slate-950">
              Записей нет
            </div>

            <div className="mt-1 text-sm text-slate-500">
              По выбранным фильтрам журнал пуст.
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Дата</th>
                <th className="px-5 py-4">Администратор</th>
                <th className="px-5 py-4">Что сделал</th>
                <th className="px-5 py-4">Раздел</th>
                <th className="px-5 py-4">Объект</th>
                <th className="px-5 py-4">IP</th>
                <th className="px-5 py-4 text-right">Детали</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {formatDateTime(item.createdAt)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-950">
                      {getActorName(item)}
                    </div>

                    <div className="text-xs text-slate-500">
                      {getActorSubline(item)}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="max-w-[460px]">
                      <div
                        className={`mb-2 inline-flex rounded-xl px-3 py-1 text-xs font-bold ${getActionTone(
                          item.action,
                        )}`}
                      >
                        {getActionLabel(item.action)}
                      </div>

                      <div className="text-sm font-medium leading-snug text-slate-800">
                        {getAuditSummary(item)}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-950">
                      {getEntityTypeLabel(item.entityType || "")}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div
                      className="max-w-[240px] truncate font-semibold text-slate-700"
                      title={getAuditObjectShortLabel(item)}
                    >
                      {getAuditObjectShortLabel(item)}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {item.ip || "—"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item)}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-500">
          Лимит: {limit}. Всего: {formatInteger(total)}.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Назад
          </button>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}