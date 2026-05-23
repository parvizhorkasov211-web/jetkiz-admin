"use client";

import { X } from "lucide-react";

import { getActionLabel, getEntityTypeLabel } from "./admin-audit.labels";
import {
  formatDateTime,
  getActorName,
  getActorSubline,
  getAuditObjectLabel,
  getAuditSummary,
  getChangeRows,
} from "./admin-audit.helpers";
import type { AuditLogItem } from "./admin-audit.types";

type Props = {
  open: boolean;
  item: AuditLogItem | null;
  loading: boolean;
  onClose: () => void;
};

export function AdminAuditDetailDrawer({
  open,
  item,
  loading,
  onClose,
}: Props) {
  if (!open) return null;

  const changes = item
  ? getChangeRows(item.oldData, item.newData, item.action)
  : [];

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[820px] overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-violet-600">
                Детали действия
              </div>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {item ? getActionLabel(item.action) : "Запись журнала"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {item ? formatDateTime(item.createdAt) : "Загрузка..."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          ) : item ? (
            <>
              <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
                <div className="text-sm font-semibold text-violet-700">
                  Что произошло
                </div>

                <div className="mt-2 text-lg font-bold leading-snug text-slate-950">
                  {getAuditSummary(item)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailCard
                  title="Администратор"
                  value={getActorName(item)}
                  subValue={getActorSubline(item)}
                />

                <DetailCard
                  title="Раздел"
                  value={getEntityTypeLabel(item.entityType || "")}
                />

                <DetailCard
                  title="Объект"
                  value={getAuditObjectLabel(item)}
                />

                <DetailCard
                  title="Дата и время"
                  value={formatDateTime(item.createdAt)}
                />

                <DetailCard title="IP адрес" value={item.ip || "—"} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">Что изменилось</h3>

                {changes.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Это действие не изменяло поля объекта. Например: вход в
                    систему, выход или выгрузка данных.
                  </div>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Поле</th>
                          <th className="px-4 py-3">Было</th>
                          <th className="px-4 py-3">Стало</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {changes.map((change) => (
                          <tr key={change.key}>
                            <td className="px-4 py-3 font-semibold text-slate-950">
                              {change.label}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {change.oldValue}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-950">
                              {change.newValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Запись не найдена.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailCard({
  title,
  value,
  subValue,
}: {
  title: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{title}</div>

      <div className="mt-2 break-words text-sm font-bold text-slate-950">
        {value}
      </div>

      {subValue ? (
        <div className="mt-1 break-words text-xs text-slate-500">
          {subValue}
        </div>
      ) : null}
    </div>
  );
}